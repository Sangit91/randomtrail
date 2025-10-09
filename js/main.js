/**
 * Lucky Traits on ZenChain
 Author: Tử Vận
 */

document.addEventListener('DOMContentLoaded', () => {

    // ====================================================================
    // 1. CONFIGURATION & CONSTANTS
    // ====================================================================
    const CONTRACT_ADDRESS = "0x1E58581c90DE26228809398114c8dF8f713879DB";
    const ZENCHAIN_TESTNET_CHAIN_ID = 8408;
    const ZENCHAIN_TESTNET_NAME = 'ZenChain Testnet';
    const ZENCHAIN_TESTNET_RPC_URL = 'https://zenchain-testnet.api.onfinality.io/public';
    const ZENCHAIN_TESTNET_EXPLORER_URL = 'https://zentrace.io';
    const ZENCHAIN_CURRENCY_SYMBOL = 'ZTC';

    const RARITY_WEIGHTS = [
        ...Array(50).fill('Common'),
        ...Array(25).fill('Uncommon'),
        ...Array(15).fill('Rare'),
        ...Array(8).fill('Epic'),
        ...Array(2).fill('Legendary')
    ];
    
    // ====================================================================
    // 2. STATE VARIABLES
    // ====================================================================
    let provider, signer, address, chainId, contract;
    let currentTraits = null;
    let allNftsMetadata = [];

    // ====================================================================
    // 3. DOM ELEMENT SELECTION
    // ====================================================================
    const $ = (id) => document.getElementById(id);

    const connectBtn = $("connect");
    const statusEl = $("status").lastElementChild;
    const addrEl = $("addr");
    const netEl = $("net");
    const contractEl = $("contract");
    const rollBtn = $("roll");
    const mintBtn = $("mint");
    const previewBtn = $("preview");
    const shareBtn = $('shareBtn');
    
    const resEl = $("result");
    const resultTextEl = $("resultText");
    const resultImageEl = $("resultImage");
    const mintStatusEl = $("mintStatus");
    const explorerLink = $("explorerLink");
    
    const canvas = $('imageCanvas');
    const ctx = canvas.getContext('2d');

    const viewMintsBtn = $("viewMints");
    const mintsContainer = $("mintsContainer");
    const refreshGlobalBtn = $('refreshGlobal');
    const globalMintsContainer = $('globalMintsContainer');
    const rarityFilter = $('rarityFilter');
    const collectionStats = $('collectionStats');

    const previewModal = $("previewModal");
    const closeModalBtn = $("closeModal");
    const previewImage = $("previewImage");
    
    const nftDetailModal = $("nftDetailModal");
    const closeDetailModalBtn = $("closeDetailModal");

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
                // Reloading after switching is often necessary for the provider to update correctly.
                location.reload(); 
                return;
            }
            
            setupApp();
        } catch (err) { 
            console.error("Wallet connection failed:", err); 
            alert('Wallet connection failed. Check the console (F12) for more details.'); 
        }
    }

    async function switchOrAddNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${ZENCHAIN_TESTNET_CHAIN_ID.toString(16)}` }]
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask.
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
                    alert("Failed to add the ZenChain Testnet. Please add it manually.");
                }
            }
        }
    }

    function setupApp() {
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // Update UI with wallet info
        statusEl.textContent = `Wallet: ${address.slice(0, 6)}…${address.slice(-4)}`;
        addrEl.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
        netEl.textContent = `ChainId: ${chainId} (${ZENCHAIN_TESTNET_NAME})`;
        contractEl.textContent = CONTRACT_ADDRESS;
        connectBtn.innerHTML = '<i class="ri-check-line"></i> Connected';
        viewMintsBtn.classList.remove('hidden');
        
        displayUserNFTs();
        
        // Listen for wallet changes
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
        if (typeof IMAGE_MANIFEST === 'undefined' || typeof TRAIT_ORDER === 'undefined') {
            return alert('Essential application files (image-manifest.js) are missing.');
        }
    
        // Reset UI for a new roll
        resEl.classList.remove('is-rolling');
        void resEl.offsetWidth; // Trigger reflow for animation restart
        resEl.classList.add('is-rolling');
        ['common', 'uncommon', 'rare', 'epic', 'legendary'].forEach(r => resEl.classList.remove(`rarity-${r}`));
        resultTextEl.textContent = "";
        resultImageEl.classList.remove('is-visible');
        mintStatusEl.textContent = "";
        explorerLink.classList.add('hidden');
        shareBtn.classList.add('hidden');
    
        // Generate traits
        const seed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${address}:${chainId}:${Date.now()}`));
        currentTraits = {};
        TRAIT_ORDER.forEach((traitType, index) => {
            const traitList = IMAGE_MANIFEST[traitType.toUpperCase()];
            const traitSeed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + index));
            currentTraits[traitType] = pick(traitList, traitSeed);
        });
        currentTraits['rarity'] = pick(RARITY_WEIGHTS, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + 'r')));
        
        // Update UI with new traits
        resEl.classList.add(`rarity-${currentTraits.rarity.toLowerCase()}`);
        resultTextEl.innerHTML = `Rolled a <strong class="rarity-${currentTraits.rarity.toLowerCase()}">${currentTraits.rarity}</strong> kit! Ready to mint.`;
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
            // Step 1: Upload image to IPFS
            mintStatusEl.textContent = "Step 1/3: Uploading image to IPFS...";
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imageResult = await uploadToPinata(imageBlob, `trait-kit-image-${Date.now()}.png`);
            const imageIpfsUrl = `ipfs://${imageResult.IpfsHash}`;

            // Step 2: Upload metadata to IPFS
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

            // Step 3: Send minting transaction
            mintStatusEl.textContent = "Step 3/3: Confirm transaction in your wallet...";
            const tx = await contract.safeMint(address, metadataIpfsUrl);
            await tx.wait();

            // Handle successful mint
            mintStatusEl.textContent = `NFT Minted Successfully!`;
            explorerLink.href = `${ZENCHAIN_TESTNET_EXPLORER_URL}/tx/${tx.hash}`;
            explorerLink.classList.remove('hidden');
            
            const tweetText = encodeURIComponent(`I just minted this awesome TraitKit NFT on #ZenChain! Check out the dApp:`);
            const dAppUrl = encodeURIComponent(window.location.href);
            shareBtn.href = `https://twitter.com/intent/tweet?text=${tweetText}&url=${dAppUrl}`;
            shareBtn.classList.remove('hidden');

            mintBtn.innerHTML = `<i class="ri-check-line"></i> Minted!`;
            
            setTimeout(displayUserNFTs, 2500); // Refresh user's gallery after a delay

        } catch (error) {
            console.error("Minting failed:", error);
            if (error.code === 'ACTION_REJECTED') {
                mintStatusEl.textContent = "Transaction was rejected. Please try again.";
            } else if (error.message.includes("Pinata")) {
                 mintStatusEl.textContent = "Error: Could not upload to IPFS. Check Pinata key or network.";
            } else {
                mintStatusEl.textContent = "An error occurred during minting. Check console.";
            }
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
                if (layerPath.includes('/default.png')) {
                     throw new Error(`A trait folder was likely empty.`);
                }
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
                mintsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="ri-inbox-unarchive-line"></i>
                        <span>Your collection is empty</span>
                        <p>Mint your first NFT to get started!</p>
                    </div>`;
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
            const uris = await contract.getAllTokenURIs();
            if (uris.length === 0) {
                globalMintsContainer.innerHTML = `<div class="muted">No NFTs have been minted yet.</div>`;
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
    
    function renderNftList(metadataList, container) {
        container.innerHTML = '';

        if (metadataList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ri-search-eye-line"></i>
                    <span>No NFTs Found</span>
                    <p>No NFTs match the current filter.</p>
                </div>`;
            return;
        }
        
        const ipfsGateway = 'https://ipfs.io/ipfs/';
        metadataList.forEach((metadata, index) => {
            const nftElement = document.createElement('div');
            nftElement.className = 'nft-item';
            
            const rarityAttr = metadata.attributes.find(a => a.trait_type === 'rarity');
            if (rarityAttr) {
                nftElement.classList.add(`rarity-${rarityAttr.value.toLowerCase()}`);
            }
            
            const imgUrl = metadata.image.replace('ipfs://', ipfsGateway);
            nftElement.innerHTML = `<img src="${imgUrl}" alt="${metadata.name}" title="${metadata.name}">`;
            nftElement.addEventListener('click', () => openDetailModal(metadata));
            container.appendChild(nftElement);
        });
    }

    function populateFilters() {
        const rarities = [...new Set(allNftsMetadata.map(meta => meta.attributes.find(a => a.trait_type === 'rarity')?.value).filter(Boolean))];
        rarityFilter.innerHTML = '<option value="all">All Rarities</option>';
        rarities.forEach(rarity => {
            rarityFilter.add(new Option(rarity, rarity));
        });
    }
    
    function applyFilters() {
        const selectedRarity = rarityFilter.value;
        const filteredNfts = allNftsMetadata.filter(meta => {
            if (selectedRarity === 'all') return true;
            const rarityAttr = meta.attributes.find(a => a.trait_type === 'rarity');
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

        previewImage.src = resultImageEl.src;
        $('previewRarity').textContent = currentTraits.rarity || 'N/A';
        $('previewCharacter').textContent = currentTraits[TRAIT_ORDER[0]] || 'N/A';
        $('previewRarity').className = `rarity-${(currentTraits.rarity || '').toLowerCase()}`;
        previewModal.classList.remove('hidden');
    }

    function closePreviewModal() {
        previewModal.classList.add('hidden');
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
            
            let valueClass = (attr.trait_type.toLowerCase() === 'rarity') 
                ? `rarity-${attr.value.toLowerCase()}` 
                : '';

            attrElement.innerHTML = `
                <span class="type">${attr.trait_type.replace('_', ' ')}</span>
                <span class="value ${valueClass}">${attr.value}</span>`;
            attributesContainer.appendChild(attrElement);
        });

        nftDetailModal.classList.remove('hidden');
    }

    function closeDetailModal() {
        nftDetailModal.classList.add('hidden');
    }
    
    function triggerCelebration(rarity) {
        const fireworkDefaults = {
            spread: 360,
            ticks: 60,
            gravity: 1,
            decay: 0.94,
            startVelocity: 30,
            shapes: ['star'],
        };
    
        const rarityEffects = {
            'Rare': () => confetti({
                ...fireworkDefaults, particleCount: 50, scalar: 1.2, colors: ['#58A6FF', '#A5D6FF', '#FFFFFF']
            }),
            'Epic': () => {
                confetti({ ...fireworkDefaults, particleCount: 70, origin: { x: 0.25, y: 0.6 }, colors: ['#A37BFF', '#D8BFFF', '#FFFFFF'] });
                confetti({ ...fireworkDefaults, particleCount: 70, origin: { x: 0.75, y: 0.6 }, colors: ['#A37BFF', '#D8BFFF', '#FFFFFF'] });
            },
            'Legendary': () => {
                const end = Date.now() + 3 * 1000;
                (function frame() {
                    confetti({
                        ...fireworkDefaults,
                        particleCount: Math.random() * 20 + 40,
                        origin: { x: Math.random(), y: Math.random() - 0.2 },
                        colors: ['#FFD700', '#FFB700', '#FFFFFF', '#FFFACD']
                    });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());
            }
        };
    
        rarityEffects[rarity]?.();
    }

    // ====================================================================
    // 8. UTILITY FUNCTIONS
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
        if (!PINATA_JWT) {
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
            throw new Error(`Pinata API Error: ${response.statusText}`);
        }
        return response.json();
    }

    async function fetchWithFallback(ipfsUri) {
        const gateways = [
            'https://ipfs.io/ipfs/',
            'https://gateway.ipfs.io/ipfs/',
            'https://dweb.link/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://gateway.pinata.cloud/ipfs/'
        ];
        for (const gateway of gateways) {
            try {
                const url = ipfsUri.replace('ipfs://', gateway);
                const response = await fetch(url, { signal: AbortSignal.timeout(8000) }); 
                if (response.ok) return response.json();
            } catch (e) {
                console.warn(`Gateway ${gateway} failed for ${ipfsUri}. Trying next...`);
            }
        }
        throw new Error(`All IPFS gateways failed to fetch: ${ipfsUri}`);
    }

    // ====================================================================
    // 9. INITIALIZATION
    // ====================================================================

    function init() {
        connectBtn.addEventListener('click', connectWallet);
        rollBtn.addEventListener('click', rollTraits);
        mintBtn.addEventListener('click', mintNFT);
        viewMintsBtn.addEventListener('click', displayUserNFTs);
        
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

        // Ensures gradient border animation doesn't pause on button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn')) {
                document.querySelectorAll('#result.out, .modal-content').forEach(el => {
                    const animation = window.getComputedStyle(el).animation;
                    el.style.animation = 'none';
                    void el.offsetHeight; // Trigger reflow
                    el.style.animation = animation;
                });
            }
        });
    }

    init();
});