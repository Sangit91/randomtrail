/**
 * Lucky Traits on ZenChain
 * Author: Tử Vận
 * Version: 2.1 (with Blending Predictions & Auto-Preview)
 */

document.addEventListener('DOMContentLoaded', () => {

    // ====================================================================
    // 1. CONFIGURATION & CONSTANTS
    // ====================================================================
    
    const CONTRACT_ADDRESS = "0x0A96Dc0e5509c914FdF911F74d329567d7c10381";
    const ZENCHAIN_TESTNET_CHAIN_ID = 8408;
    const ZENCHAIN_TESTNET_NAME = 'ZenChain Testnet';
    const ZENCHAIN_TESTNET_RPC_URL = 'https://zenchain-testnet.api.onfinality.io/public';
    const ZENCHAIN_TESTNET_EXPLORER_URL = 'https://zentrace.io';
    const ZENCHAIN_CURRENCY_SYMBOL = 'ZTC';
    const RARITY_SCORES = {
        'Common': 1,
        'Uncommon': 3,
        'Rare': 7,
        'Epic': 15,
        'Legendary': 30
    };
    
    const RARITY_LEVELS = {
        'Common': 0,
        'Uncommon': 1,
        'Rare': 2,
        'Epic': 3,
        'Legendary': 4
    };
    
    // Mảng để lặp qua các độ hiếm theo thứ tự
    const LEVEL_TO_RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

    // ====================================================================
    // 2. STATE VARIABLES
    // ====================================================================
    let provider, signer, address, chainId, contract;
    let currentTraits = null;
    let allNftsMetadata = [];
    
    // Biến trạng thái cho Blending
    let userNftsForBlending = []; 
    let selectedBlendSlots = [null, null, null];

    // ====================================================================
    // 3. DOM ELEMENT SELECTION
    // ====================================================================
    const $ = (id) => document.getElementById(id);

    const connectBtn = $("connect"), statusEl = $("status").lastElementChild, addrEl = $("addr");
    const netEl = $("net"), contractEl = $("contract"), rollBtn = $("roll"), mintBtn = $("mint");
    const previewBtn = $("preview"), shareBtn = $('shareBtn'), resEl = $("result");
    const resultTextEl = $("resultText"), resultImageEl = $("resultImage"), mintStatusEl = $("mintStatus");
    const explorerLink = $("explorerLink"), canvas = $('imageCanvas'), ctx = canvas.getContext('2d');
    const viewMintsBtn = $("viewMints"), mintsContainer = $("mintsContainer");
    const refreshGlobalBtn = $('refreshGlobal'), globalMintsContainer = $('globalMintsContainer');
    const rarityFilter = $('rarityFilter'), collectionStats = $('collectionStats');
    const previewModal = $("previewModal"), closeModalBtn = $("closeModal"), previewImage = $("previewImage");
    const nftDetailModal = $("nftDetailModal"), closeDetailModalBtn = $("closeDetailModal");

    // DOM Elements cho Blending
    const blendingAltar = $('blendingAltar');
    const userNftsGrid = $('userNftsForBlending');
    const blendBtn = $('blendBtn');
    const blendingStatusEl = $('blendingStatus');
    const blendingSlots = [$('blendingSlot-0'), $('blendingSlot-1'), $('blendingSlot-2')];
    const rarityPredictionEl = $('rarityPrediction');
    const previewCongratsEl = $('previewCongrats');

    // ====================================================================
    // 4. WALLET & NETWORK INTERACTION
    // ====================================================================

    async function connectWallet() {
        if (!window.ethereum) {
            return alert('Please install MetaMask.');
        }
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            await provider.send('eth_requestAccounts', []);
            signer = provider.getSigner();
            address = await signer.getAddress();
            const network = await provider.getNetwork();
            chainId = network.chainId;
            if (chainId !== ZENCHAIN_TESTNET_CHAIN_ID) {
                await switchOrAddNetwork();
                location.reload(); 
                return;
            }
            setupApp();
        } catch (err) { 
            console.error("Wallet connection failed:", err); 
            alert('Wallet connection failed. Check console for details.'); 
        }
    }

    async function switchOrAddNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${ZENCHAIN_TESTNET_CHAIN_ID.toString(16)}` }]
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: `0x${ZENCHAIN_TESTNET_CHAIN_ID.toString(16)}`,
                            chainName: ZENCHAIN_TESTNET_NAME,
                            nativeCurrency: { name: ZENCHAIN_CURRENCY_SYMBOL, symbol: ZENCHAIN_CURRENCY_SYMBOL, decimals: 18 },
                            rpcUrls: [ZENCHAIN_TESTNET_RPC_URL],
                            blockExplorerUrls: [ZENCHAIN_TESTNET_EXPLORER_URL],
                        }],
                    });
                } catch (addError) {
                    console.error("Failed to add ZenChain Testnet:", addError);
                    alert("Failed to add ZenChain Testnet. Please add it manually.");
                }
            }
        }
    }

    function setupApp() {
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        statusEl.textContent = `Wallet: ${address.slice(0, 6)}…${address.slice(-4)}`;
        addrEl.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
        netEl.textContent = `ChainId: ${chainId} (${ZENCHAIN_TESTNET_NAME})`;
        contractEl.textContent = CONTRACT_ADDRESS;
        connectBtn.innerHTML = '<i class="ri-check-line"></i> Connected';
        viewMintsBtn.classList.remove('hidden');
        displayUserNFTs();
        blendingAltar.classList.remove('hidden');
        loadUserNftsForBlending();
        window.ethereum.on('accountsChanged', () => location.reload());
        window.ethereum.on('chainChanged', () => location.reload());
    }

    // ====================================================================
    // 5. CORE NFT LOGIC (GENERATION & MINTING)
    // ====================================================================

    function rollTraits() {
        if (!address) {
            return alert("Please connect your wallet first.");
        }
        if (typeof IMAGE_MANIFEST === 'undefined' || typeof TRAIT_ORDER === 'undefined' || typeof determineRarityFromRecipes === 'undefined') {
            return alert('Essential application files (image-manifest.js, recipes.js) are missing or failed to load.');
        }
    
        resEl.classList.remove('is-rolling');
        void resEl.offsetWidth; // Trigger reflow to restart animation
        resEl.classList.add('is-rolling');
        ['common', 'uncommon', 'rare', 'epic', 'legendary'].forEach(r => resEl.classList.remove(`rarity-${r}`));
        resultTextEl.textContent = "";
        resultImageEl.classList.remove('is-visible');
        mintStatusEl.textContent = "";
        explorerLink.classList.add('hidden');
        shareBtn.classList.add('hidden');
    
        const seed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${address}:${chainId}:${Date.now()}`));
        currentTraits = {};
        TRAIT_ORDER.forEach((traitType, index) => {
            const traitList = IMAGE_MANIFEST[traitType.toUpperCase()];
            const traitSeed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + index));
            currentTraits[traitType] = pick(traitList, traitSeed) || 'default';
        });
    
        let calculatedRarity = determineRarityFromRecipes(currentTraits);
    
        if (calculatedRarity) {
            currentTraits['rarity'] = calculatedRarity;
            console.log(`%cRarity determined by RECIPE: ${calculatedRarity}`, 'color: #ffaf00; font-weight: bold;');
        } else {
            const commonUncommonWeights = [...Array(70).fill('Common'), ...Array(30).fill('Uncommon')];
            const raritySeed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + 'r'));
            currentTraits['rarity'] = pick(commonUncommonWeights, raritySeed);
            console.log(`Rarity determined by RANDOM fallback: ${currentTraits['rarity']}`);
        }
        
        const rarityClass = `rarity-${currentTraits.rarity.toLowerCase()}`;
        resEl.classList.add(rarityClass);
        resultTextEl.innerHTML = `Rolled a <strong class="${rarityClass}">${currentTraits.rarity}</strong> kit! Ready to mint.`;
        
        generateAndDisplayImage(currentTraits);
        
        mintBtn.classList.remove('hidden');
        previewBtn.classList.remove('hidden');
    
        setTimeout(() => triggerCelebration(currentTraits.rarity), 400); 
    }
    
    async function mintNFT() {
        if (!currentTraits) {
            return alert("Please roll for traits first!");
        }
        
        mintBtn.disabled = true;
        previewBtn.classList.add('hidden');
        mintBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Minting...`;
        
        try {
            mintStatusEl.textContent = "Step 1/3: Uploading image to IPFS...";
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imageResult = await uploadToPinata(imageBlob, `trait-kit-image-${Date.now()}.png`);
            const imageIpfsUrl = `ipfs://${imageResult.IpfsHash}`;

            mintStatusEl.textContent = "Step 2/3: Uploading metadata to IPFS...";
            const uniqueId = Date.now();
            const metadata = {
                name: `TraitKit NFT #${uniqueId}`,
                description: "A unique, randomly generated TraitKit NFT.",
                image: imageIpfsUrl,
                attributes: Object.entries(currentTraits).map(([key, value]) => ({ 
                    trait_type: key.toLowerCase().replace('_', ' '), 
                    value: value 
                }))
            };
            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
            const metadataResult = await uploadToPinata(metadataBlob, `metadata-${uniqueId}.json`);
            const metadataIpfsUrl = `ipfs://${metadataResult.IpfsHash}`;

            mintStatusEl.textContent = "Step 3/3: Confirm transaction in your wallet...";
            const tx = await contract.safeMint(address, metadataIpfsUrl);
            await tx.wait();

            mintStatusEl.textContent = `NFT Minted Successfully!`;
            explorerLink.href = `${ZENCHAIN_TESTNET_EXPLORER_URL}/tx/${tx.hash}`;
            explorerLink.classList.remove('hidden');
            
            const tweetText = encodeURIComponent(`I just minted this awesome TraitKit NFT on #ZenChain! Check out the dApp:`);
            const dAppUrl = encodeURIComponent(window.location.href);
            shareBtn.href = `https://twitter.com/intent/tweet?text=${tweetText}&url=${dAppUrl}`;
            shareBtn.classList.remove('hidden');

            mintBtn.innerHTML = `<i class="ri-check-line"></i> Minted!`;
            
            setTimeout(() => {
                displayUserNFTs();
                loadUserNftsForBlending();
            }, 2500);

        } catch (error) {
            console.error("Minting failed:", error);
            mintStatusEl.textContent = error.reason || error.message || "An error occurred during minting.";
        } finally {
            mintBtn.disabled = false;
            mintBtn.innerHTML = `<i class="ri-copper-diamond-line"></i> 2. Mint NFT`;
            previewBtn.classList.remove('hidden');
        }
    }

    async function generateAndDisplayImage(traits) {
        const imageLayers = TRAIT_ORDER.map(traitType => {
            const traitValue = traits[traitType];
            return `assets/images/${traitType}/${traitValue}.png`;
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const layerPath of imageLayers) {
            try {
                const img = await loadImage(layerPath);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.error(`Could not load image layer: ${layerPath}`, error);
                resultTextEl.textContent = `Error rendering image layer: ${layerPath.split('/').pop()}`;
                return;
            }
        }
        resultImageEl.src = canvas.toDataURL('image/png');
        resultImageEl.classList.add('is-visible');
    }
    
    // ====================================================================
    // 6. NFT DISPLAY & FILTERING
    // ====================================================================

    async function displayUserNFTs() {
        if (!address || !contract) return;
        mintsContainer.innerHTML = `<div class="muted"><i class="ri-loader-4-line spin"></i> Loading your NFTs...</div>`;
        try {
            const uris = await contract.getTokensOfOwner(address);
            if (uris.length === 0) {
                mintsContainer.innerHTML = `<div class="empty-state"><i class="ri-inbox-unarchive-line"></i><span>Your collection is empty</span><p>Mint your first NFT to get started!</p></div>`;
                return;
            }
            const metadataPromises = uris.map(uri => fetchWithFallback(uri).catch(e => null));
            const userNftsMetadata = (await Promise.all(metadataPromises)).filter(Boolean);
            renderNftList(userNftsMetadata, mintsContainer);
        } catch (error) {
            console.error("Failed to load user NFTs:", error);
            mintsContainer.innerHTML = `<div class="muted">Error loading your NFTs. Check console.</div>`;
        }
    }

    async function displayGlobalNFTs() {
        if (!contract) return;
        globalMintsContainer.innerHTML = `<div class="muted"><i class="ri-loader-4-line spin"></i> Loading global collection...</div>`;
        allNftsMetadata = [];
        try {
            const sparseUris = await contract.getAllTokenURIs();
            const uris = sparseUris.filter(uri => uri && uri !== "");
            if (uris.length === 0) {
                globalMintsContainer.innerHTML = `<div class="empty-state"><i class="ri-gallery-line"></i><span>No NFTs have been minted yet.</span></div>`;
                return;
            }
            const metadataPromises = uris.map(uri => fetchWithFallback(uri).catch(e => null));
            allNftsMetadata = (await Promise.all(metadataPromises)).filter(Boolean);
            collectionStats.textContent = `${allNftsMetadata.length} NFTs`;
            populateFilters();
            applyFilters();
        } catch (error) {
            console.error("Failed to load global NFTs:", error);
            globalMintsContainer.innerHTML = `<div class="muted">Error loading global collection. Check console.</div>`;
        }
    }
    
    function displayTraitLibrary() {
        if (typeof IMAGE_MANIFEST === 'undefined' || typeof TRAIT_ORDER === 'undefined') {
            console.error("IMAGE_MANIFEST or TRAIT_ORDER is not defined.");
            return;
        }
        const container = $('libraryContainer');
        container.innerHTML = '';
        TRAIT_ORDER.forEach(traitType => {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'library-section';
            const title = traitType.charAt(0).toUpperCase() + traitType.slice(1);
            sectionEl.innerHTML = `<h3 class="library-section-title">${title}</h3>`;
            const gridEl = document.createElement('div');
            gridEl.className = 'library-grid';
            const traits = IMAGE_MANIFEST[traitType.toUpperCase()];
            if (!traits || traits.length === 0) return;
            traits.forEach(traitValue => {
                if (traitValue === 'default') return;
                const itemEl = document.createElement('div');
                itemEl.className = 'library-item';
                const imagePath = `assets/images/${traitType}/${traitValue}.png`;
                itemEl.innerHTML = `<img src="${imagePath}" alt="${traitValue}" title="${traitValue}"><span class="library-item-name">${traitValue}</span>`;
                gridEl.appendChild(itemEl);
            });
            sectionEl.appendChild(gridEl);
            container.appendChild(sectionEl);
        });
    }

    function renderNftList(metadataList, container) {
        container.innerHTML = '';
        const validMetadataList = metadataList.filter(Boolean);
        if (validMetadataList.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="ri-search-eye-line"></i><span>No valid NFTs Found</span><p>Could not load NFT metadata.</p></div>`;
            return;
        }
    
        const ipfsGateway = 'https://ipfs.io/ipfs/';
        validMetadataList.forEach((metadata) => {
            if (!metadata || !metadata.image) {
                const nftElement = document.createElement('div');
                nftElement.className = 'nft-error';
                nftElement.innerHTML = `<i class="ri-error-warning-line" title="Failed to load metadata"></i>`;
                container.appendChild(nftElement);
                return;
            }
    
            const nftElement = document.createElement('div');
            nftElement.className = 'nft-item';
            
            // === LOGIC THÊM VIỀN MÀU ===
            // Tìm thuộc tính độ hiếm trong metadata
            const rarityAttr = metadata.attributes.find(a => a.trait_type.toLowerCase() === 'rarity');
            // Nếu tìm thấy, thêm class tương ứng (ví dụ: 'rarity-rare')
            if (rarityAttr && rarityAttr.value) {
                nftElement.classList.add(`rarity-${rarityAttr.value.toLowerCase()}`);
            }
            // ============================
            
            const imgUrl = metadata.image.replace('ipfs://', ipfsGateway);
            nftElement.innerHTML = `<img src="${imgUrl}" alt="${metadata.name}" title="${metadata.name}">`;
            nftElement.addEventListener('click', () => openDetailModal(metadata));
            container.appendChild(nftElement);
        });
    }

    function populateFilters() {
        const rarities = [...new Set(allNftsMetadata.map(meta => meta.attributes.find(a => a.trait_type.toLowerCase() === 'rarity')?.value).filter(Boolean))];
        rarityFilter.innerHTML = '<option value="all">All Rarities</option>';
        rarities.forEach(rarity => {
            rarityFilter.add(new Option(rarity, rarity));
        });
    }
    
    function applyFilters() {
        const selectedRarity = rarityFilter.value;
        const filteredNfts = allNftsMetadata.filter(meta => {
            if (selectedRarity === 'all') return true;
            const rarityAttr = meta.attributes.find(a => a.trait_type.toLowerCase() === 'rarity');
            return rarityAttr && rarityAttr.value === selectedRarity;
        });
        collectionStats.textContent = `Showing ${filteredNfts.length} of ${allNftsMetadata.length} NFTs`;
        renderNftList(filteredNfts, globalMintsContainer);
    }

    // ====================================================================
    // 7. UI MODALS & EFFECTS
    // ====================================================================

    function openPreviewModal() {
        if (!currentTraits || resultImageEl.classList.contains('hidden')) {
            return alert("Please roll for traits first to generate a valid image.");
        }
        previewCongratsEl.classList.add('hidden');
        previewImage.src = resultImageEl.src;
        $('previewRarity').textContent = currentTraits.rarity || 'N/A';
        const characterTrait = TRAIT_ORDER.find(t => t.toLowerCase() === 'character') || TRAIT_ORDER[0];
        $('previewCharacter').textContent = currentTraits[characterTrait] || 'N/A';
        $('previewRarity').className = `rarity-${(currentTraits.rarity || '').toLowerCase()}`;
        previewModal.classList.remove('hidden');
    }

    function closePreviewModal() {
        previewModal.classList.add('hidden');
        previewCongratsEl.classList.add('hidden');
    }

    function openPreviewModalForNewNFT(metadata, traits) {
        const imgUrl = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
        const rarity = traits.rarity || 'N/A';
        const characterTrait = TRAIT_ORDER.find(t => t.toLowerCase() === 'character') || TRAIT_ORDER[0];
        const character = traits[characterTrait] || 'N/A';
        previewImage.src = imgUrl;
        $('previewRarity').textContent = rarity;
        $('previewCharacter').textContent = character;
        $('previewRarity').className = `rarity-${rarity.toLowerCase()}`;
        previewCongratsEl.innerHTML = `Chúc mừng! Bạn nhận được NFT <strong class="rarity-${rarity.toLowerCase()}">${rarity}</strong>!`;
        previewCongratsEl.classList.remove('hidden');
        previewModal.classList.remove('hidden');
    }

    function openDetailModal(metadata) {
        if (!metadata) return;
        $('detailName').textContent = metadata.name;
        $('detailImage').src = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
        const attributesContainer = $('detailAttributesContainer');
        attributesContainer.innerHTML = '';
        metadata.attributes.forEach(attr => {
            const attrElement = document.createElement('div');
            attrElement.className = 'attribute-item';
            let valueClass = (attr.trait_type.toLowerCase() === 'rarity') ? `rarity-${attr.value.toLowerCase()}` : '';
            attrElement.innerHTML = `<span class="type">${attr.trait_type.replace('_', ' ')}</span><span class="value ${valueClass}">${attr.value}</span>`;
            attributesContainer.appendChild(attrElement);
        });
        nftDetailModal.classList.remove('hidden');
    }

    function closeDetailModal() {
        nftDetailModal.classList.add('hidden');
    }
    
    function triggerCelebration(rarity) {
        const fireworkDefaults = { spread: 360, ticks: 60, gravity: 1, decay: 0.94, startVelocity: 30, shapes: ['star'], };
        const rarityEffects = {
            'Rare': () => confetti({ ...fireworkDefaults, particleCount: 50, scalar: 1.2, colors: ['#58A6FF', '#A5D6FF', '#FFFFFF'] }),
            'Epic': () => {
                confetti({ ...fireworkDefaults, particleCount: 70, origin: { x: 0.25, y: 0.6 }, colors: ['#A37BFF', '#D8BFFF', '#FFFFFF'] });
                confetti({ ...fireworkDefaults, particleCount: 70, origin: { x: 0.75, y: 0.6 }, colors: ['#A37BFF', '#D8BFFF', '#FFFFFF'] });
            },
            'Legendary': () => {
                const end = Date.now() + 3 * 1000;
                (function frame() {
                    confetti({ ...fireworkDefaults, particleCount: Math.random() * 20 + 40, origin: { x: Math.random(), y: Math.random() - 0.2 }, colors: ['#FFD700', '#FFB700', '#FFFFFF', '#FFFACD'] });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());
            }
        };
        rarityEffects[rarity]?.();
    }
    
    // ====================================================================
    // 8. BLENDING SYSTEM LOGIC
    // ====================================================================

    async function loadUserNftsForBlending() {
        if (!address || !contract) return;
        userNftsGrid.innerHTML = `<div class="muted"><i class="ri-loader-4-line spin"></i> Đang tải NFT của bạn...</div>`;
        userNftsForBlending = [];
        try {
            const ownerTokenCount = await contract.balanceOf(address);
            if (ownerTokenCount.toNumber() === 0) {
                 userNftsGrid.innerHTML = `<div class="empty-state"><span>Bạn không có NFT nào để nâng cấp.</span></div>`;
                 return;
            }
            const promises = [];
            for (let i = 0; i < ownerTokenCount.toNumber(); i++) {
                promises.push(contract.tokenOfOwnerByIndex(address, i));
            }
            const tokenIds = await Promise.all(promises);
            const metadataPromises = tokenIds.map(tokenId =>
                contract.tokenURI(tokenId).then(uri =>
                    fetchWithFallback(uri).then(meta => (meta ? { ...meta, tokenId: tokenId.toNumber() } : null))
                ).catch(() => null)
            );
            userNftsForBlending = (await Promise.all(metadataPromises)).filter(Boolean);
            renderBlendingGrid();
        } catch (error) {
            console.error("Failed to load user NFTs for blending:", error);
            userNftsGrid.innerHTML = `<div class="muted">Lỗi khi tải NFT. Vui lòng thử lại.</div>`;
        }
    }

    function renderBlendingGrid() {
        userNftsGrid.innerHTML = '';
        if (userNftsForBlending.length === 0) {
            userNftsGrid.innerHTML = `<div class="empty-state"><span>Bạn không có NFT nào.</span></div>`;
            return;
        }
        userNftsForBlending.forEach(meta => {
            const nftElement = document.createElement('div');
            nftElement.className = 'nft-item';
            nftElement.dataset.tokenId = meta.tokenId;
            const rarityAttr = meta.attributes ? meta.attributes.find(a => a.trait_type.toLowerCase() === 'rarity') : null;
            if (rarityAttr && rarityAttr.value) {
                nftElement.classList.add(`rarity-${rarityAttr.value.toLowerCase()}`);
            }
            if (selectedBlendSlots.some(slot => slot && slot.tokenId === meta.tokenId)) {
                nftElement.classList.add('selected');
            }
            const imgUrl = meta.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
            nftElement.innerHTML = `<img src="${imgUrl}" alt="${meta.name}" title="${meta.name}">`;
            nftElement.addEventListener('click', () => handleNftSelection(meta));
            userNftsGrid.appendChild(nftElement);
        });
    }

    function handleNftSelection(nftMeta) {
        const isAlreadySelected = selectedBlendSlots.some(slot => slot && slot.tokenId === nftMeta.tokenId);
        if (blendBtn.disabled === false && !isAlreadySelected) return;
        const alreadySelectedSlotIndex = selectedBlendSlots.findIndex(slot => slot && slot.tokenId === nftMeta.tokenId);
        if (alreadySelectedSlotIndex !== -1) {
            selectedBlendSlots[alreadySelectedSlotIndex] = null;
        } else {
            const emptySlotIndex = selectedBlendSlots.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                selectedBlendSlots[emptySlotIndex] = nftMeta;
            }
        }
        updateBlendingUI();
    }
    
    /**
     * HÀM LOGIC TRUNG TÂM ĐÃ SỬA LỖI: Thêm các lớp kiểm tra an toàn.
     */
    function getBlendRarityPrediction(selectedNfts) {
        if (!selectedNfts || selectedNfts.length === 0) return null;

        let totalScore = 0;
        let totalLevel = 0;
        
        selectedNfts.forEach(meta => {
            // KIỂM TRA AN TOÀN: Đảm bảo 'meta' và 'meta.attributes' tồn tại
            if (meta && meta.attributes && Array.isArray(meta.attributes)) {
                const rarityAttr = meta.attributes.find(a => a.trait_type && a.trait_type.toLowerCase() === 'rarity');
                // KIỂM TRA AN TOÀN: Đảm bảo tìm thấy thuộc tính và nó có giá trị
                if (rarityAttr && rarityAttr.value) {
                    totalScore += RARITY_SCORES[rarityAttr.value] || 0;
                    totalLevel += RARITY_LEVELS[rarityAttr.value] || 0;
                }
            }
        });

        const averageLevel = totalLevel / selectedNfts.length;
        const floorLevel = Math.floor(averageLevel);
        const baseWeights = { 'Common': 5, 'Uncommon': 10, 'Rare': 20, 'Epic': 30, 'Legendary': 15 };
        let finalWeights = {};

        for (const rarityName in RARITY_LEVELS) {
            const currentLevel = RARITY_LEVELS[rarityName];
            if (currentLevel < floorLevel) {
                finalWeights[rarityName] = 0;
            } else {
                let weight = baseWeights[rarityName];
                let bonus = Math.floor(totalScore / 5) * (currentLevel - floorLevel + 1);
                finalWeights[rarityName] = weight + bonus;
            }
        }
        
        if (floorLevel === 3) finalWeights['Legendary'] += totalScore;
        if (floorLevel >= 4) finalWeights = { 'Common': 0, 'Uncommon': 0, 'Rare': 0, 'Epic': 0, 'Legendary': 1 };

        return finalWeights;
    }

    // ĐÃ SỬA LỖI: Xử lý trường hợp 'weights' có thể là null
    function calculateAndDisplayRarityChances() {
        const selectedNfts = selectedBlendSlots.filter(Boolean);
        const predictionContainer = $('rarityPrediction');
        const weights = getBlendRarityPrediction(selectedNfts);

        if (!weights) {
            predictionContainer.innerHTML = `<div class="muted">Chọn NFT để xem tỷ lệ độ hiếm có thể nhận được.</div>`;
            return;
        }

        const totalWeight = Object.values(weights).reduce((sum, current) => sum + current, 0);
        if (totalWeight === 0) {
            predictionContainer.innerHTML = `<div class="muted">Không thể tính toán tỷ lệ.</div>`;
            return;
        }
        
        let html = '<div class="rarity-chance-grid">';
        LEVEL_TO_RARITY.forEach(rarity => {
            if (weights[rarity] > 0) {
                const percentage = ((weights[rarity] / totalWeight) * 100).toFixed(1);
                html += `<div class="rarity-chance-item"><span class="rarity-name rarity-${rarity.toLowerCase()}">${rarity}</span><span class="rarity-percent">${percentage}%</span></div>`;
            }
        });
        html += '</div>';
        predictionContainer.innerHTML = html;
    }

    function updateBlendingUI() {
        blendingSlots.forEach((slotEl, index) => {
            const nft = selectedBlendSlots[index];
            if (nft && nft.image) {
                const imgUrl = nft.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
                slotEl.innerHTML = `<img src="${imgUrl}" alt="${nft.name}">`;
            } else {
                slotEl.innerHTML = `<i class="ri-question-mark"></i>`;
            }
        });
        renderBlendingGrid();
        const selectedCount = selectedBlendSlots.filter(Boolean).length;
        if (selectedCount === 3) {
            blendBtn.disabled = false;
            blendBtn.innerHTML = `<i class="ri-flask-line"></i> Bắt Đầu Pha Trộn!`;
        } else {
            blendBtn.disabled = true;
            blendBtn.innerHTML = `<i class="ri-flask-line"></i> Pha Trộn (Chọn ${3 - selectedCount} NFT)`;
        }
        calculateAndDisplayRarityChances();
    }
    
    function determineBlendResult(burnedNftsMetadata) {
        const weights = getBlendRarityPrediction(burnedNftsMetadata);
        const weightedRarityPool = [];
        if (weights) {
            for (const rarity in weights) {
                for (let i = 0; i < Math.round(weights[rarity]); i++) {
                    weightedRarityPool.push(rarity);
                }
            }
        }
        
        const newRarity = weightedRarityPool.length > 0 ? pick(weightedRarityPool, ethers.utils.randomBytes(32)) : 'Common'; // Fallback
        const newTraits = {};
        TRAIT_ORDER.forEach((traitType) => {
            newTraits[traitType] = pick(IMAGE_MANIFEST[traitType.toUpperCase()], ethers.utils.randomBytes(32));
        });
        newTraits.rarity = newRarity;
        return newTraits;
    }

    async function handleBlendProcess() {
        const nftsToBlend = selectedBlendSlots.filter(Boolean);
        if (nftsToBlend.length !== 3) return;
        blendBtn.disabled = true;
        blendingStatusEl.textContent = 'Bắt đầu quá trình...';
        try {
            blendingStatusEl.textContent = 'Bước 1/4: Tạo thuộc tính NFT mới...';
            const newTraits = determineBlendResult(nftsToBlend);
            await generateAndDisplayImage(newTraits);
            blendingStatusEl.textContent = 'Bước 2/4: Tải ảnh mới lên IPFS...';
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imageResult = await uploadToPinata(imageBlob, `blend-result-${Date.now()}.png`);
            const imageIpfsUrl = `ipfs://${imageResult.IpfsHash}`;
            blendingStatusEl.textContent = 'Bước 3/4: Tải metadata mới lên IPFS...';
            const uniqueId = Date.now();
            const metadata = { name: `Blended TraitKit #${uniqueId}`, description: "An upgraded TraitKit NFT, forged from the essence of others.", image: imageIpfsUrl, attributes: Object.entries(newTraits).map(([key, value]) => ({ trait_type: key.toLowerCase().replace('_', ' '), value: value })) };
            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
            const metadataResult = await uploadToPinata(metadataBlob, `blend-meta-${uniqueId}.json`);
            const newUri = `ipfs://${metadataResult.IpfsHash}`;
            blendingStatusEl.textContent = 'Bước 4/4: Vui lòng xác nhận giao dịch trong ví...';
            const tokenIdsToBurn = nftsToBlend.map(nft => nft.tokenId);
            const tx = await contract.blendAndMint(address, tokenIdsToBurn, newUri);
            await tx.wait();
            blendingStatusEl.textContent = 'Pha trộn thành công!';
            triggerCelebration(newTraits.rarity);
            openPreviewModalForNewNFT(metadata, newTraits);
            setTimeout(() => {
                selectedBlendSlots = [null, null, null];
                updateBlendingUI();
                loadUserNftsForBlending();
                displayUserNFTs();
                blendingStatusEl.textContent = '';
            }, 5000);
        } catch (error) {
            console.error("Blending process failed:", error);
            blendingStatusEl.textContent = `Lỗi: ${error.reason || error.message || 'Giao dịch đã bị từ chối.'}`;
            setTimeout(() => { updateBlendingUI(); }, 2000);
        }
    }

    // ====================================================================
    // 9. UTILITY FUNCTIONS
    // ====================================================================
    
    function pick(arr, seed) {
        if (!arr || arr.length === 0) {
            console.error("Attempted to pick from an empty or undefined array.", arr);
            return "default";
        }
        const index = ethers.BigNumber.from(seed.slice(0, 10)).mod(arr.length);
        return arr[index] || "default";
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load image at: ${src}`));
            img.src = src;
        });
    }

    async function uploadToPinata(file, fileName) {
        if (typeof PINATA_JWT === 'undefined' || !PINATA_JWT) {
            throw new Error("Pinata JWT key is not defined in js/config.js");
        }
        const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
        const data = new FormData();
        data.append('file', file, fileName);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
            body: data
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Pinata API Error: ${response.statusText} - ${errorData}`);
        }
        return response.json();
    }

    async function fetchWithFallback(ipfsUri) {
        if (!ipfsUri || typeof ipfsUri !== 'string' || !ipfsUri.startsWith('ipfs://')) {
            console.error("Invalid IPFS URI provided:", ipfsUri);
            return null;
        }
        const hash = ipfsUri.substring(7);
        if (!hash) return null;
        const gateways = [ 'https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/', 'https://dweb.link/ipfs/', 'https://cloudflare-ipfs.com/ipfs/' ];
        for (const gateway of gateways) {
            try {
                const url = `${gateway}${hash}`;
                const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
                if (response.ok) {
                    const json = await response.json();
                    if (json && json.image && json.name) {
                        return json;
                    }
                }
            } catch (e) {
                console.warn(`Gateway ${gateway} failed for ${ipfsUri}. Trying next...`);
            }
        }
        console.error(`All IPFS gateways failed to fetch or returned invalid data for: ${ipfsUri}`);
        return null;
    }

    // ====================================================================
    // 10. INITIALIZATION
    // ====================================================================

    function init() {
        connectBtn.addEventListener('click', connectWallet);
        rollBtn.addEventListener('click', rollTraits);
        mintBtn.addEventListener('click', mintNFT);
        viewMintsBtn.addEventListener('click', () => {
            displayUserNFTs();
            loadUserNftsForBlending();
        });
        
        previewBtn.addEventListener('click', openPreviewModal);
        closeModalBtn.addEventListener('click', closePreviewModal);
        previewModal.addEventListener('click', (event) => {
            if (event.target === previewModal) closePreviewModal();
        });
        
        closeDetailModalBtn.addEventListener('click', closeDetailModal);
        nftDetailModal.addEventListener('click', (event) => {
            if (event.target === nftDetailModal) closeDetailModal();
        });

        refreshGlobalBtn.addEventListener('click', displayGlobalNFTs);
        rarityFilter.addEventListener('change', applyFilters);
        
        blendBtn.addEventListener('click', handleBlendProcess);

        displayTraitLibrary();
        
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn')) {
                document.querySelectorAll('#result.out, .modal-content').forEach(el => {
                    const animation = window.getComputedStyle(el).animation;
                    el.style.animation = 'none';
                    void el.offsetHeight;
                    el.style.animation = animation;
                });
            }
        });
    }

    init();
});