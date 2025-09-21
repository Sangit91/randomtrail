document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL VARIABLES ---
    let provider, signer, address, chainId, contract;

    // --- DOM ELEMENT SELECTORS ---
    const $ = (id) => document.getElementById(id);
    const connectBtn = $("connect");
    const statusEl = $("status").lastElementChild;
    const addrEl = $("addr");
    const netEl = $("net");
    const contractEl = $("contract");
    const resEl = $("result");
    const copyBtn = $("copy");
    const tweetA = $("tweet");
    const rollBtn = $("roll");
    const mintBtn = $("mint");
    const viewMintsBtn = $("viewMints");
    const mintsContainer = $("mintsContainer");
    const explorerLink = $("explorerLink");

    // --- CONFIGURATION (UPDATE THESE VALUES!) ---
    const ZENCHAIN_TESTNET_CHAIN_ID = 8408; 
    const ZENCHAIN_TESTNET_NAME = 'ZenChain Testnet';
    const ZENCHAIN_TESTNET_RPC_URL = 'https://zenchain-testnet.api.onfinality.io/public';
    const ZENCHAIN_TESTNET_EXPLORER_URL = 'https://zentrace.io'; 

    
    const CONTRACT_ADDRESS = "0xd9bd03db72758de788f99bb18ca868c421c2c51f"; 

    // ABI from the compiled TraitKit.sol contract
    const CONTRACT_ABI = [
        "event TraitKitMinted(address indexed owner, string traitKitData, uint256 timestamp)",
        "function getTraitKits(address _owner) view returns (string[])",
        "function mintTraitKit(string _traitKitData)"
    ];

    // --- FUNCTIONS ---

    async function connectWallet() {
        if (!window.ethereum) {
            alert('No EIP-1193 provider found. Please install MetaMask or another wallet.');
            return;
        }

        try {
            provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            await provider.send('eth_requestAccounts', []);
            signer = provider.getSigner();
            address = await signer.getAddress();
            const net = await provider.getNetwork();
            chainId = net.chainId;

            if (chainId !== ZENCHAIN_TESTNET_CHAIN_ID) {
                await switchOrAddNetwork();
                // Reload to reflect changes after network switch attempt
                return location.reload();
            }

            // If we are on the correct network, setup the app
            setupApp();
        } catch (err) {
            console.error(err);
            alert('Wallet connection failed: ' + (err?.message || err));
        }
    }

    async function switchOrAddNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${ZENCHAIN_TESTNET_CHAIN_ID.toString(16)}` }],
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
                            nativeCurrency: { name: 'ZCN', symbol: 'ZCN', decimals: 18 },
                            rpcUrls: [ZENCHAIN_TESTNET_RPC_URL],
                            blockExplorerUrls: [ZENCHAIN_TESTNET_EXPLORER_URL],
                        }],
                    });
                } catch (addError) {
                    console.error("Failed to add network:", addError);
                    alert("Failed to add ZenChain Testnet. Please add it manually to MetaMask.");
                }
            } else {
                console.error("Failed to switch network:", switchError);
                alert("Could not switch to ZenChain Testnet.");
            }
        }
    }

    function setupApp() {
        if (CONTRACT_ADDRESS.startsWith("0x...")) {
            alert("Please update the CONTRACT_ADDRESS in js/app.js first!");
            return;
        }
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        statusEl.textContent = `Wallet: ${address.slice(0, 6)}…${address.slice(-4)}`;
        addrEl.textContent = address;
        netEl.textContent = `ChainId: ${chainId} (${ZENCHAIN_TESTNET_NAME})`;
        contractEl.textContent = CONTRACT_ADDRESS;
        connectBtn.innerHTML = '<i class="ri-check-line"></i> Connected';

        mintBtn.classList.remove('hidden');
        viewMintsBtn.classList.remove('hidden');
        displayUserMints();

        window.ethereum.on('accountsChanged', () => location.reload());
        window.ethereum.on('chainChanged', () => location.reload());
    }

    const HATS = ['Cap', 'Beanie', 'Hood', 'Crown', 'Headband', 'Halo'];
    const EYES = ['Laser', 'Sleepy', 'Happy', 'Pixel', 'VR', 'Mono'];
    const MOUTH = ['Smile', 'Grin', 'Grr', 'Pipe', 'Fang', 'Tape'];
    const SKIN = ['Human', 'Cyborg', 'Alien', 'Zombie', 'Robot', 'Fox'];
    const RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

    function keccakHex(input) {
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input));
    }

    function pick(arr, seed) {
        const idx = ethers.BigNumber.from(seed.slice(0, 10)).mod(arr.length);
        return arr[idx];
    }

    function rollTraits() {
        if (!address) {
            alert("Please connect your wallet first to roll traits.");
            return;
        }
        const tBucket = Math.floor(Date.now() / (5 * 60 * 1000));
        const seed = keccakHex(`${address}:${chainId}:${tBucket}`);

        const h = pick(HATS, seed);
        const e = pick(EYES, keccakHex(seed + 'e'));
        const m = pick(MOUTH, keccakHex(seed + 'm'));
        const s = pick(SKIN, keccakHex(seed + 's'));
        const r = pick(RARITY, keccakHex(seed + 'r'));
        const out = `TraitKit{ skin:${s} | hat:${h} | eyes:${e} | mouth:${m} | rarity:${r} }`;
        const fullOut = `${out}\nseed=${seed}`;
        resEl.textContent = fullOut;

        const tweetText = encodeURIComponent(`I just rolled a ${r} TraitKit on ZenChain!\n${out}`);
        tweetA.href = `https://twitter.com/intent/tweet?text=${tweetText}`;
    }

    async function mintTraitKit() {
        if (!contract) return alert("Please connect wallet first.");

        const traitKitData = resEl.textContent.split('\n')[0].trim();
        if (traitKitData === '—' || !traitKitData) {
            return alert("Please roll traits first before minting.");
        }

        mintBtn.innerHTML = '<i class="ri-loader-4-line spin"></i> Minting...';
        mintBtn.disabled = true;
        explorerLink.classList.add('hidden');

        try {
            const tx = await contract.mintTraitKit(traitKitData);
            resEl.textContent = `Minting transaction sent!\nTx Hash: ${tx.hash}\nWaiting for confirmation...`;
            explorerLink.href = `${ZENCHAIN_TESTNET_EXPLORER_URL}/tx/${tx.hash}`;
            explorerLink.classList.remove('hidden');

            await tx.wait(); // Wait for 1 confirmation

            resEl.textContent = `Mint successful!\n${traitKitData}`;
            mintBtn.innerHTML = '<i class="ri-check-line"></i> Minted!';
            setTimeout(() => {
                mintBtn.innerHTML = '<i class="ri-coins-line"></i> Mint Trait Kit (On-chain)';
                mintBtn.disabled = false;
            }, 3000);

            await displayUserMints(); // Refresh minted traits
        } catch (error) {
            console.error("Minting failed:", error);
            alert("Minting failed: " + (error?.data?.message || error?.message || ""));
            resEl.textContent = "Minting failed. Check console for details.";
            mintBtn.innerHTML = '<i class="ri-coins-line"></i> Mint Trait Kit (On-chain)';
            mintBtn.disabled = false;
        }
    }

    async function displayUserMints() {
        if (!address || !contract) {
            mintsContainer.innerHTML = '<div class="muted">Connect wallet to see your minted traits.</div>';
            return;
        }

        mintsContainer.innerHTML = '<div class="muted"><i class="ri-loader-4-line spin"></i> Loading your minted traits...</div>';

        try {
            const userMints = await contract.getTraitKits(address);
            if (userMints.length === 0) {
                mintsContainer.innerHTML = '<div class="muted">You have not minted any Trait Kits yet.</div>';
            } else {
                let html = '<h3>Your Minted Trait Kits:</h3>';
                // Show newest first
                userMints.slice().reverse().forEach((kit, index) => {
                    html += `<div class="out mono" style="margin-bottom: 8px;">${userMints.length - index}. ${kit}</div>`;
                });
                mintsContainer.innerHTML = html;
            }
        } catch (error) {
            console.error("Failed to load user mints:", error);
            mintsContainer.innerHTML = '<div class="muted">Error loading minted traits. Check console.</div>';
        }
    }

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(resEl.textContent.trim());
            copyBtn.innerHTML = '<i class="ri-check-line"></i> Copied';
            setTimeout(() => copyBtn.innerHTML = '<i class="ri-file-copy-2-line"></i> Copy', 1200);
        } catch (e) {
            alert('Copy failed');
        }
    }

    // --- EVENT LISTENERS ---
    connectBtn.addEventListener('click', connectWallet);
    rollBtn.addEventListener('click', rollTraits);
    copyBtn.addEventListener('click', copyToClipboard);
    mintBtn.addEventListener('click', mintTraitKit);
    viewMintsBtn.addEventListener('click', displayUserMints);
});