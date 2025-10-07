document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARIABLES ---
    let provider, signer, address, chainId, contract;
    let currentTraits = null;
    let allNftsMetadata = []; // Lưu trữ metadata của tất cả NFT để lọc

    // --- DOM ELEMENT SELECTORS ---
    const $ = (id) => document.getElementById(id);
    const connectBtn = $("connect"), statusEl = $("status").lastElementChild, addrEl = $("addr"), netEl = $("net");
    const contractEl = $("contract"), resEl = $("result"), rollBtn = $("roll"), mintBtn = $("mint");
    const mintStatusEl = $("mintStatus"), explorerLink = $("explorerLink"), resultTextEl = $("resultText");
    const resultImageEl = $("resultImage"), viewMintsBtn = $("viewMints"), mintsContainer = $("mintsContainer");
    const canvas = $('imageCanvas');
    const ctx = canvas.getContext('2d');
    // Đầu file, trong khu vực DOM ELEMENT SELECTORS
    const nftDetailModal = $("nftDetailModal");
    const closeDetailModalBtn = $("closeDetailModal");

    const refreshGlobalBtn = $('refreshGlobal');
    const globalMintsContainer = $('globalMintsContainer');
    const rarityFilter = $('rarityFilter');
    
    const previewBtn = $("preview");
    const previewModal = $("previewModal");
    const closeModalBtn = $("closeModal");
    const previewImage = $("previewImage");
    
    const shareBtn = $('shareBtn');
    const collectionStats = $('collectionStats');

    // ==============================================================================
    // === CÁC THÔNG TIN CẤU HÌNH ====================================================
    // ==============================================================================
    //const CONTRACT_ADDRESS = "0x6BB161965157538bb595b70d20A8F11286c5700e"; sol3

    const CONTRACT_ADDRESS = "0x1E58581c90DE26228809398114c8dF8f713879DB";

    // PINATA_JWT sẽ được lấy từ file js/config.js
    const ZENCHAIN_TESTNET_CHAIN_ID = 8408;
    const ZENCHAIN_TESTNET_NAME = 'ZenChain Testnet';
    const ZENCHAIN_TESTNET_RPC_URL = 'https://zenchain-testnet.api.onfinality.io/public';
    const ZENCHAIN_TESTNET_EXPLORER_URL = 'https://zentrace.io';
    const ZENCHAIN_CURRENCY_SYMBOL = 'ZTC';
    
    const RARITY_WEIGHTS = [ ...Array(50).fill('Common'), ...Array(25).fill('Uncommon'), ...Array(15).fill('Rare'), ...Array(8).fill('Epic'), ...Array(2).fill('Legendary') ];

    // --- CÁC HÀM CHÍNH ---
    
    async function switchOrAddNetwork() {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${ZENCHAIN_TESTNET_CHAIN_ID.toString(16)}` }] });
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
                    alert("Failed to add the ZenChain Testnet. Please add it manually.");
                }
            }
        }
    }

    async function connectWallet() {
        if (!window.ethereum) return alert('Please install MetaMask.');
        
        console.log("Attempting to connect wallet...");

        try {
            provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            console.log("1. Provider created.");

            await provider.send('eth_requestAccounts', []);
            console.log("2. Accounts requested.");

            signer = provider.getSigner();
            address = await signer.getAddress();
            console.log("3. Signer and address obtained:", address);
            
            const net = await provider.getNetwork();
            chainId = net.chainId;
            console.log("4. Network information obtained. ChainID:", chainId);

            if (chainId != ZENCHAIN_TESTNET_CHAIN_ID) {
                console.log(`Incorrect network detected. Current: ${chainId}, Required: ${ZENCHAIN_TESTNET_CHAIN_ID}. Attempting to switch...`);
                await switchOrAddNetwork();
                location.reload(); 
                return;
            }
            
            console.log("5. Network is correct. Setting up the app...");
            setupApp();

        } catch (err) { 
            console.error("Wallet connection failed at some step:", err); 
            alert('Wallet connection failed. Check the console (F12) for more details.'); 
        }
    }

    function setupApp() {
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        statusEl.textContent = `Wallet: ${address.slice(0, 6)}…${address.slice(-4)}`;
        addrEl.textContent = address;
        netEl.textContent = `ChainId: ${chainId} (${ZENCHAIN_TESTNET_NAME})`;
        contractEl.textContent = CONTRACT_ADDRESS;
        connectBtn.innerHTML = '<i class="ri-check-line"></i> Connected';
        viewMintsBtn.classList.remove('hidden');
        displayUserNFTs();
        window.ethereum.on('accountsChanged', () => location.reload());
        window.ethereum.on('chainChanged', () => location.reload());
    }

    function rollTraits() {
        if (!address) return alert("Please connect your wallet first.");
        if (typeof IMAGE_MANIFEST === 'undefined' || typeof TRAIT_ORDER === 'undefined') {
            alert('Essential application files are missing.');
            return;
        }
    
        // --- Bắt đầu hiệu ứng ---
        resEl.classList.remove('is-rolling');
        void resEl.offsetWidth; 
        resEl.classList.add('is-rolling');
        
        // **QUAN TRỌNG: Xóa các class độ hiếm cũ khỏi khung kết quả**
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        rarities.forEach(r => resEl.classList.remove(`rarity-${r}`));
    
        resultTextEl.textContent = "";
        resultImageEl.classList.remove('is-visible');
        // -------------------------
    
        const seed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${address}:${chainId}:${Date.now()}`));
        
        currentTraits = {};
        TRAIT_ORDER.forEach((traitType, index) => {
            const traitList = IMAGE_MANIFEST[traitType.toUpperCase()];
            const traitSeed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + index));
            currentTraits[traitType] = pick(traitList, traitSeed);
        });
        
        currentTraits['rarity'] = pick(RARITY_WEIGHTS, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + 'r')));
        
        // **QUAN TRỌNG: Thêm class độ hiếm MỚI vào khung kết quả**
        resEl.classList.add(`rarity-${currentTraits.rarity.toLowerCase()}`);
    
        resultTextEl.innerHTML = `Rolled a <strong class="rarity-${currentTraits.rarity.toLowerCase()}">${currentTraits.rarity}</strong> kit! Ready to mint.`;
        generateAndDisplayImage(currentTraits);
        mintBtn.classList.remove('hidden');
        previewBtn.classList.remove('hidden');
        mintStatusEl.textContent = "";
        explorerLink.classList.add('hidden');
        shareBtn.classList.add('hidden');
    
        setTimeout(() => {
            triggerCelebration(currentTraits.rarity);
        }, 400); 
    }

    // --- THAY ĐỔI: Thêm lớp kiểm tra an toàn trong hàm pick ---
    function pick(arr, seed) {
        if (!arr || arr.length === 0) {
            console.error("Attempted to pick from an empty or undefined array. Check image folders and manifest.", arr);
            return "default";
        }
        const idx = ethers.BigNumber.from(seed.slice(0, 10)).mod(arr.length);
        const choice = arr[idx];
        if (typeof choice === 'undefined' || choice === null) {
            console.error(`Picked an invalid value (undefined/null) at index ${idx}. Returning 'default'.`, arr);
            return "default";
        }
        return choice;
    }

    async function generateAndDisplayImage(traits) {
                
        const imageLayers = TRAIT_ORDER.map(traitType => {
            const traitValue = traits[traitType];
            return `assets/images/${traitType}/${traitValue}.png`;
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const layerPath of imageLayers) {
            try {
                // --- CẢI TIẾN: Kiểm tra chặt chẽ hơn, nếu pick trả về "default" thì báo lỗi ---
                if (layerPath.includes('/default.png')) {
                     throw new Error(`A trait folder was empty, resulting in a 'default' trait which cannot be rendered.`);
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

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load image at: ${src}. Details: ${err}`));
            img.src = src;
        });
    }

    async function uploadToPinata(file, fileName) {
        if (typeof PINATA_JWT === 'undefined' || !PINATA_JWT) {
            throw new Error("Pinata JWT key not found or is empty. Make sure it's defined in js/config.js");
        }
        const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
        let data = new FormData();
        data.append('file', file, fileName);
        const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${PINATA_JWT}` }, body: data });
        if (!response.ok) throw new Error(`Pinata API Error: ${response.statusText}`);
        return await response.json();
    }

    
    async function mintNFT() {
        if (!currentTraits) return alert("Please roll for traits first!");
        
        mintBtn.disabled = true;
        previewBtn.classList.add('hidden');
        mintBtn.innerHTML = `<i class="ri-loader-4-line spin"></i> Minting...`;
        
        try {
            mintStatusEl.textContent = "Step 1/3: Uploading image to IPFS...";
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imageResult = await uploadToPinata(imageBlob, `trait-kit-image-${Date.now()}.png`);
            const imageIpfsUrl = `ipfs://${imageResult.IpfsHash}`;

            mintStatusEl.textContent = "Step 2/3: Uploading metadata to IPFS...";
            
            // --- THAY ĐỔI: Sử dụng timestamp để đặt tên NFT thay vì totalSupply để tránh trùng lặp ---
            const uniqueId = Date.now();
            const metadata = {
                name: `TraitKit NFT #${uniqueId}`,
                description: "A unique, randomly generated TraitKit NFT.",
                image: imageIpfsUrl,
                attributes: Object.entries(currentTraits).map(([key, value]) => ({ 
                    // Đảm bảo tính nhất quán của dữ liệu
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
            const dAppUrl = encodeURIComponent(window.location.href); // Lấy URL của trang hiện tại
            const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${dAppUrl}`;

            shareBtn.href = twitterUrl;
            shareBtn.classList.remove('hidden');

            mintBtn.innerHTML = `<i class="ri-check-line"></i> Minted!`;
            
            // --- CẢI TIẾN: Thêm độ trễ trước khi làm mới danh sách NFT ---
            setTimeout(() => {
                displayUserNFTs();
            }, 2500); // Đợi 2.5 giây để blockchain cập nhật

        } catch (error) {
            console.error("Minting failed:", error);
            mintBtn.innerHTML = `<i class="ri-copper-diamond-line"></i> 2. Mint NFT`; // Đặt lại nút ngay lập tức
            if (error.code === 'ACTION_REJECTED') {
                mintStatusEl.textContent = "Transaction was rejected. Please try again.";
            } else if (error.message.includes("Pinata")) {
                 mintStatusEl.textContent = "Error: Could not upload to IPFS. Check Pinata key or network.";
            } else {
                mintStatusEl.textContent = "An error occurred during minting. Check console.";
            }
        } finally {
            mintBtn.disabled = false;
            previewBtn.classList.remove('hidden');
        }
    }

    // --- CẢI TIẾN: Hàm fetch metadata với nhiều gateway dự phòng và timeout ---
    async function fetchWithFallback(ipfsUri) {
        const gateways = [
            'https://gateway.pinata.cloud/ipfs/',
            'https://ipfs.io/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/'
        ];
        for (const gateway of gateways) {
            try {
                const url = ipfsUri.replace('ipfs://', gateway);
                const response = await fetch(url, { signal: AbortSignal.timeout(10000) }); // Timeout 10 giây
                if (response.ok) return response.json();
            } catch (e) {
                console.warn(`Gateway ${gateway} failed for ${ipfsUri}. Trying next...`);
            }
        }
        throw new Error(`All IPFS gateways failed to fetch: ${ipfsUri}`);
    }

    // js/main.js

    async function displayUserNFTs() {
        if (!address || !contract) return;
        mintsContainer.innerHTML = `<div class="muted"><i class="ri-loader-4-line spin"></i> Loading your NFTs...</div>`;

        try {
            const uris = await contract.getTokensOfOwner(address);
            if (uris.length === 0) {
                // Sử dụng "empty state" đẹp hơn
                mintsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="ri-inbox-unarchive-line"></i>
                        <span>Bộ sưu tập của bạn trống</span>
                        <p>Hãy mint NFT đầu tiên để bắt đầu!</p>
                    </div>
                `;
                return;
            }

            // Fetch tất cả metadata trước khi render
            const metadataPromises = uris.map(uri => fetchWithFallback(uri).catch(e => null));
            const userNftsMetadata = (await Promise.all(metadataPromises)).filter(meta => meta != null);

            // **QUAN TRỌNG: Gọi hàm renderNftList để hiển thị**
            renderNftList(userNftsMetadata, mintsContainer);

        } catch (error) {
            console.error("Failed to load user NFTs from contract:", error);
            mintsContainer.innerHTML = `<div class="muted">Error loading your NFTs. Check console.</div>`;
        }
    }

    // --- HÀM MỞ MODAL PREVIEW ĐÃ ĐƯỢC NÂNG CẤP ---
    function openPreviewModal() {
        if (!currentTraits || resultImageEl.classList.contains('hidden')) {
            alert("Please roll for traits first to generate a valid image.");
            return;
        }

        // Cập nhật ảnh preview
        previewImage.src = resultImageEl.src;

        // Cập nhật thông tin traits
        const previewRarityEl = $('previewRarity');
        const previewCharacterEl = $('previewCharacter');

        // Lấy thông tin từ biến global 'currentTraits'
        const rarity = currentTraits.rarity || 'N/A';
        // Giả định trait nhân vật nằm trong key '01_character' từ TRAIT_ORDER
        const character = currentTraits[TRAIT_ORDER[0]] || 'N/A';

        previewRarityEl.textContent = rarity;
        previewCharacterEl.textContent = character;

        // Thêm class màu sắc cho độ hiếm (tùy chọn nhưng rất đẹp)
        previewRarityEl.className = `rarity-${rarity.toLowerCase()}`;

        // Hiển thị modal
        previewModal.classList.remove('hidden');
    }

    function closePreviewModal() {
        previewModal.classList.add('hidden');
    }

  
    function openDetailModal(metadata) {
        if (!metadata) return;

        const detailNameEl = $('detailName');
        const detailImageEl = $('detailImage');
        const attributesContainer = $('detailAttributesContainer');

        // Cập nhật tên và ảnh
        detailNameEl.textContent = metadata.name;
        detailImageEl.src = metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');

        // Xóa các thuộc tính cũ và render các thuộc tính mới
        attributesContainer.innerHTML = '';
        metadata.attributes.forEach(attr => {
            const attrElement = document.createElement('div');
            attrElement.className = 'attribute-item';

            // Thêm màu cho độ hiếm
            let valueClass = '';
            if (attr.trait_type.toLowerCase() === 'rarity') {
                valueClass = `rarity-${attr.value.toLowerCase()}`;
            }

            attrElement.innerHTML = `
                <span class="type">${attr.trait_type.replace('_', ' ')}</span>
                <span class="value ${valueClass}">${attr.value}</span>
            `;
            attributesContainer.appendChild(attrElement);
        });

        // Hiển thị modal
        nftDetailModal.classList.remove('hidden');
    }

    async function displayGlobalNFTs() {
        if (!contract) return;
        globalMintsContainer.innerHTML = `<div class="muted"><i class="ri-loader-4-line spin"></i> Loading global collection...</div>`;
        allNftsMetadata = []; // Xóa dữ liệu cũ
    
        try {
            const uris = await contract.getAllTokenURIs(); // Gọi hàm mới
            if (uris.length === 0) {
                globalMintsContainer.innerHTML = `<div class="muted">No NFTs have been minted yet.</div>`;
                return;
            }
    
            // Dùng Promise.all để fetch metadata song song cho nhanh
            const metadataPromises = uris.map(uri => fetchWithFallback(uri).catch(e => null));
            const results = await Promise.all(metadataPromises);
            
            allNftsMetadata = results.filter(meta => meta != null); // Lọc bỏ các kết quả lỗi
            collectionStats.textContent = `${allNftsMetadata.length} NFTs`;

            populateFilters();
            applyFilters(); // Hiển thị tất cả lúc đầu
    
        } catch (error) {
            console.error("Failed to load global NFTs:", error);
            globalMintsContainer.innerHTML = `<div class="muted">Error loading global collection. Check console.</div>`;
        }
    }
    
    function populateFilters() {
        const rarities = [...new Set(allNftsMetadata.map(meta => meta.attributes.find(a => a.trait_type === 'rarity')?.value).filter(Boolean))];
        rarityFilter.innerHTML = '<option value="all">All Rarities</option>'; // Reset
        rarities.forEach(rarity => {
            const option = new Option(rarity, rarity);
            rarityFilter.add(option);
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
    
    

    function renderNftList(metadataList, container) {
        container.innerHTML = '';

        if (metadataList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ri-search-eye-line"></i>
                    <span>Không tìm thấy NFT</span>
                    <p>Không có NFT nào khớp với bộ lọc hiện tại.</p>
                </div>
            `;
            return;
        }
        
        metadataList.forEach((metadata, index) => {
            const nftElement = document.createElement('div');
            nftElement.className = 'nft-item';
            nftElement.dataset.title = metadata.name;
            
            const rarityAttr = metadata.attributes.find(a => a.trait_type === 'rarity');
            if (rarityAttr) {
                nftElement.classList.add(`rarity-${rarityAttr.value.toLowerCase()}`);
            }
            
            const imgUrl = metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            nftElement.innerHTML = `<img src="${imgUrl}" alt="${metadata.name}" title="${metadata.name}">`;
            
            nftElement.addEventListener('click', () => openDetailModal(metadata));

            nftElement.style.transitionDelay = `${index * 50}ms`;

            container.appendChild(nftElement);

            setTimeout(() => {
                nftElement.classList.add('is-visible');
            }, 10);
        });
    } 

   

    function triggerCelebration(rarity) {
        // Các thiết lập cơ bản cho một vụ nổ pháo hoa
        const fireworkDefaults = {
            spread: 360,      // Bắn ra mọi hướng (360 độ)
            ticks: 60,        // Thời gian tồn tại của hạt (càng cao càng lâu)
            gravity: 1,       // Có trọng lực để hạt rơi xuống
            decay: 0.94,      // Tốc độ mờ dần
            startVelocity: 30,// Tốc độ bắn ban đầu
            shapes: ['star'], // Dùng hình ngôi sao cho đẹp
        };
    
        switch (rarity) {
            case 'Rare':
                // Bắn một chùm pháo hoa màu xanh từ trung tâm
                confetti({
                    ...fireworkDefaults,
                    particleCount: 50,
                    scalar: 1.2,
                    colors: ['#58A6FF', '#A5D6FF', '#FFFFFF']
                });
                break;
    
            case 'Epic':
                // Bắn hai chùm pháo hoa màu tím từ hai bên
                // Chùm 1 (bên trái)
                confetti({
                    ...fireworkDefaults,
                    particleCount: 70,
                    origin: { x: 0.25, y: 0.6 },
                    colors: ['#A37BFF', '#D8BFFF', '#FFFFFF']
                });
                // Chùm 2 (bên phải)
                confetti({
                    ...fireworkDefaults,
                    particleCount: 70,
                    origin: { x: 0.75, y: 0.6 },
                    colors: ['#A37BFF', '#D8BFFF', '#FFFFFF']
                });
                break;
    
            case 'Legendary':
                // Màn trình diễn pháo hoa hoành tráng trong 3 giây
                const duration = 3 * 1000;
                const end = Date.now() + duration;
    
                (function frame() {
                    // Tạo ra các vụ nổ ngẫu nhiên liên tục
                    confetti({
                        ...fireworkDefaults,
                        particleCount: Math.random() * 20 + 40, // Số hạt ngẫu nhiên
                        origin: { x: Math.random(), y: Math.random() - 0.2 }, // Vị trí ngẫu nhiên
                        colors: ['#FFD700', '#FFB700', '#FFFFFF', '#FFFACD']
                    });
    
                    // Tiếp tục bắn cho đến khi hết thời gian
                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
                break;
        }
    }


    function closeDetailModal() {
        nftDetailModal.classList.add('hidden');
    }

    // --- EVENT LISTENERS ---
    connectBtn.addEventListener('click', connectWallet);
    rollBtn.addEventListener('click', rollTraits);
    mintBtn.addEventListener('click', mintNFT);
    viewMintsBtn.addEventListener('click', displayUserNFTs);
    // Cuối file, trong khu vực --- EVENT LISTENERS ---
    closeDetailModalBtn.addEventListener('click', closeDetailModal);
    nftDetailModal.addEventListener('click', (event) => {
        if (event.target === nftDetailModal) {
            closeDetailModal();
        }
    });
    
    previewBtn.addEventListener('click', openPreviewModal);
    closeModalBtn.addEventListener('click', closePreviewModal);
    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            closePreviewModal();
        }
    });

    refreshGlobalBtn.addEventListener('click', displayGlobalNFTs);
    rarityFilter.addEventListener('change', applyFilters);
});

// Đảm bảo animation viền gradient không bị dừng khi có tương tác
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn')) {
        // Lấy tất cả các phần tử có viền gradient động
        const elementsWithGradient = document.querySelectorAll('#result.out, .modal-content');
        
        // Reset và khởi động lại animation
        elementsWithGradient.forEach(el => {
            const currentAnimation = el.style.animation;
            el.style.animation = 'none';
            el.offsetHeight; // Trigger reflow
            el.style.animation = currentAnimation || 'border-spin 4s linear infinite';
        });
    }
});