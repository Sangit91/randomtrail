document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARIABLES ---
    let provider, signer, address, chainId, contract;
    let currentTraits = null;

    // --- DOM ELEMENT SELECTORS ---
    const $ = (id) => document.getElementById(id);
    const connectBtn = $("connect"), statusEl = $("status").lastElementChild, addrEl = $("addr"), netEl = $("net");
    const contractEl = $("contract"), resEl = $("result"), rollBtn = $("roll"), mintBtn = $("mint");
    const mintStatusEl = $("mintStatus"), explorerLink = $("explorerLink"), resultTextEl = $("resultText");
    const resultImageEl = $("resultImage"), viewMintsBtn = $("viewMints"), mintsContainer = $("mintsContainer");
    const canvas = $('imageCanvas');
    const ctx = canvas.getContext('2d');
    
    const previewBtn = $("preview");
    const previewModal = $("previewModal");
    const closeModalBtn = $("closeModal");
    const previewImage = $("previewImage");

    // ==============================================================================
    // === CÁC THÔNG TIN CẤU HÌNH ====================================================
    // ==============================================================================
    const CONTRACT_ADDRESS = "0xd77aA64Decf6740BA6Ee3C2A50664a54864672d9";
    // PINATA_JWT sẽ được lấy từ file js/config.js
    const ZENCHAIN_TESTNET_CHAIN_ID = 8408;
    const ZENCHAIN_TESTNET_NAME = 'ZenChain Testnet';
    const ZENCHAIN_TESTNET_RPC_URL = 'https://zenchain-testnet.api.onfinality.io/public';
    const ZENCHAIN_TESTNET_EXPLORER_URL = 'https://zentrace.io';
    const ZENCHAIN_CURRENCY_SYMBOL = 'ZCN';

    const CONTRACT_ABI = [{"inputs":[{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"getTokensOfOwner","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"string","name":"uri","type":"string"}],"name":"safeMint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}];
    
    const RARITY_WEIGHTS = [ ...Array(50).fill('Common'), ...Array(25).fill('Uncommon'), ...Array(15).fill('Rare'), ...Array(8).fill('Epic'), ...Array(2).fill('Legendary') ];

    const traitImagePaths = {
        skin: (trait) => `assets/images/skin/${trait}.png`,
        eyes: (trait) => `assets/images/eyes/${trait}.png`,
        mouth: (trait) => `assets/images/mouth/${trait}.png`,
        hat: (trait) => `assets/images/hat/${trait}.png`,
    };

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
            return alert('Image manifest not found. Please run "node create-manifest.js" first.');
        }

        const seed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${address}:${chainId}:${Date.now()}`));
        
        currentTraits = {};
        TRAIT_ORDER.forEach((traitType, index) => {
            const traitList = IMAGE_MANIFEST[traitType.toUpperCase()];
            const traitSeed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + index));
            currentTraits[traitType] = pick(traitList, traitSeed);
        });
        
        currentTraits['rarity'] = pick(RARITY_WEIGHTS, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed + 'r')));

        resultTextEl.textContent = `Rolled a ${currentTraits.rarity} kit! Ready to mint.`;
        generateAndDisplayImage(currentTraits);
        mintBtn.classList.remove('hidden');
        previewBtn.classList.remove('hidden');
        mintStatusEl.textContent = "";
        explorerLink.classList.add('hidden');
    }

    function pick(arr, seed) {
        if (!arr || arr.length === 0) {
            console.error("Attempted to pick from an empty or undefined array. Check your image folders and manifest.", arr);
            return "default";
        }
        const idx = ethers.BigNumber.from(seed.slice(0, 10)).mod(arr.length);
        return arr[idx];
    }

    async function generateAndDisplayImage(traits) {
        resultImageEl.classList.add('hidden');
        
        const imageLayers = TRAIT_ORDER.map(traitType => {
            const traitValue = traits[traitType];
            return `assets/images/${traitType}/${traitValue}.png`;
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const layerPath of imageLayers) {
            try {
                if (layerPath.includes('default.png')) {
                    throw new Error("Cannot render a 'default' trait because a source folder was empty.");
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
        resultImageEl.classList.remove('hidden');
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async function uploadToPinata(file, fileName) {
        if (typeof PINATA_JWT === 'undefined') {
            throw new Error("Pinata JWT key not found. Make sure it's defined in js/config.js");
        }
        const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
        let data = new FormData();
        data.append('file', file, fileName);
        const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${PINATA_JWT}` }, body: data });
        if (!response.ok) throw new Error(`Pinata JWT Error: ${response.statusText}`);
        return await response.json();
    }

    // Thay thế hàm mintNFT cũ bằng hàm mới này
async function mintNFT() {
    if (!currentTraits) return alert("Please roll for traits first!");
    
    // CẢI TIẾN: Thêm bước kiểm tra kết nối trước khi mint
    try {
        const accounts = await provider.listAccounts();
        if (accounts.length === 0) {
            // Nếu không có tài khoản nào được kết nối, yêu cầu kết nối lại
            alert("Your wallet seems to be disconnected. Please connect again.");
            await connectWallet(); // Cố gắng kết nối lại
            return; // Dừng hàm mint
        }
    } catch (e) {
        alert("Could not verify wallet connection. Please try reconnecting.");
        return;
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
        const totalSupply = await contract.totalSupply();
        const metadata = {
            name: `TraitKit NFT #${Number(totalSupply) + 1}`,
            description: "A unique, randomly generated TraitKit NFT.",
            image: imageIpfsUrl,
            attributes: Object.entries(currentTraits).map(([trait_type, value]) => ({ trait_type, value }))
        };
        const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        const metadataResult = await uploadToPinata(metadataBlob, `metadata-${Date.now()}.json`);
        const metadataIpfsUrl = `ipfs://${metadataResult.IpfsHash}`;

        mintStatusEl.textContent = "Step 3/3: Confirm transaction in your wallet...";
        const tx = await contract.safeMint(address, metadataIpfsUrl);
        await tx.wait();

        mintStatusEl.textContent = `NFT Minted Successfully!`;
        explorerLink.href = `${ZENCHAIN_TESTNET_EXPLORER_URL}/tx/${tx.hash}`;
        explorerLink.classList.remove('hidden');
        
        mintBtn.innerHTML = `<i class="ri-check-line"></i> Minted!`;
        setTimeout(() => { mintBtn.innerHTML = `<i class="ri-copper-diamond-line"></i> 2. Mint NFT`; }, 5000);

        await displayUserNFTs();

    } catch (error) {
        console.error("Minting failed:", error);
        if (error.code === 'ACTION_REJECTED') {
            mintStatusEl.textContent = "Transaction was rejected. Please try again.";
        } else {
            mintStatusEl.textContent = "An error occurred during minting. Check console.";
        }
    } finally {
        mintBtn.disabled = false;
        previewBtn.classList.remove('hidden');
        mintBtn.innerHTML = `<i class="ri-copper-diamond-line"></i> 2. Mint NFT`;
    }
}

    async function displayUserNFTs() {
        if (!address || !contract) return;
        mintsContainer.innerHTML = `<div class="muted"><i class="ri-loader-4-line spin"></i> Loading your NFTs...</div>`;

        try {
            const uris = await contract.getTokensOfOwner(address);
            if (uris.length === 0) {
                mintsContainer.innerHTML = `<div class="muted">You don't own any NFTs yet.</div>`;
                return;
            }

            mintsContainer.innerHTML = '';
            await Promise.all(uris.map(async (uri, index) => {
                const nftElement = document.createElement('div');
                nftElement.className = 'nft-item';
                nftElement.innerHTML = `<div style="width: 80px; height: 80px; border-radius: 8px; background-color: #333; display: flex; align-items: center; justify-content: center;"><i class="ri-loader-4-line spin"></i></div>`;
                mintsContainer.appendChild(nftElement);

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);
                    const response = await fetch(uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'), { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    
                    const metadata = await response.json();
                    const imgUrl = metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                    
                    nftElement.innerHTML = `<img src="${imgUrl}" alt="${metadata.name}" title="${metadata.name}">`;
                    
                    const imgElement = nftElement.querySelector('img');
                    imgElement.onerror = () => {
                        imgElement.alt = "Image load failed";
                        imgElement.style.border = "2px solid red";
                    };

                } catch (e) {
                    console.error(`Could not load NFT with URI ${uri}`, e);
                    nftElement.innerHTML = `<div style="width: 80px; height: 80px; border-radius: 8px; border: 2px solid red; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; color: red;">Load Failed</div>`;
                }
            }));
        } catch (error) {
            console.error("Failed to load user NFTs from contract:", error);
            mintsContainer.innerHTML = `<div class="muted">Error loading your NFTs. Check console.</div>`;
        }
    }

    function openPreviewModal() {
        if (resultImageEl.src && !resultImageEl.classList.contains('hidden')) {
            previewImage.src = resultImageEl.src;
            previewModal.classList.remove('hidden');
        } else {
            alert("Please roll for traits first to generate a valid image.");
        }
    }

    function closePreviewModal() {
        previewModal.classList.add('hidden');
    }

    // --- EVENT LISTENERS ---
    connectBtn.addEventListener('click', connectWallet);
    rollBtn.addEventListener('click', rollTraits);
    mintBtn.addEventListener('click', mintNFT);
    viewMintsBtn.addEventListener('click', displayUserNFTs);
    
    previewBtn.addEventListener('click', openPreviewModal);
    closeModalBtn.addEventListener('click', closePreviewModal);
    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            closePreviewModal();
        }
    });
});