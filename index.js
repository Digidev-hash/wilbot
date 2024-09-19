require('dotenv').config();
const bip39 = require('bip39');
const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc)
const Web3 = require('web3').default;
const { Connection, clusterApiUrl, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const ETH_MIN_SWEEP = '0.0032'; // Minimum balance to sweep for ETH, BNB, and MATIC
const SOL_MIN_SWEEP = 0.0032; // Minimum balance to sweep for SOL

// Load seed phrases from the environment variable
const SEED_PHRASES = process.env.SEED_PHRASES.split(',');
const ETH_DEST = process.env.ETH_DEST;
const BNB_DEST = process.env.BNB_DEST;
const MATIC_DEST = process.env.MATIC_DEST;
const SOLANA_DEST = process.env.SOLANA_DEST;
const web3ETH = new Web3('https://cloudflare-eth.com');
const web3BNB = new Web3('https://bsc-dataseed1.binance.org/');
//const web3BNB = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545/');
const web3MATIC = new Web3('https://polygon-rpc.com/');
//const web3MATIC = new Web3('https://rpc-amoy.polygon.technology/');
//const solanaConnection = new Connection(clusterApiUrl('mainnet-beta'));

// Helper functions
function printProgress(progress) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}


async function getPrivateKeyFromSeedPhrase(seedPhrase, path) {
    console.log(seedPhrase)
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const masterKey = bip32.fromSeed(seed);
    const childKey = masterKey.derivePath(path);
    console.log(childKey.privateKey.toString('hex'))
    const realkey='0x'+childKey.privateKey.toString('hex')
    return realkey;
}

async function checkAndTransferBalances() {
    for (const seedPhrase of SEED_PHRASES) {
       
         ethPrivateKey = await getPrivateKeyFromSeedPhrase(seedPhrase, "m/44'/60'/0'/0/0");
       const walletAddressETH = web3ETH.eth.accounts.privateKeyToAccount(ethPrivateKey).address;

        const bnbPrivateKey = await getPrivateKeyFromSeedPhrase(seedPhrase, "m/44'/60'/0'/0/0");
       console.log("sed",bnbPrivateKey)
       const privateKeyWithPrefix = `${bnbPrivateKey}`;
        const walletAddressBNB = web3BNB.eth.accounts.privateKeyToAccount(privateKeyWithPrefix).address;

        const maticPrivateKey = await getPrivateKeyFromSeedPhrase(seedPhrase, "m/44'/60'/0'/0/0");
        const walletAddressMATIC = web3MATIC.eth.accounts.privateKeyToAccount(maticPrivateKey).address;

       //const solanaKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await getPrivateKeyFromSeedPhrase(seedPhrase, "m/44'/501'/0'/0'"))));

        // Check ETH balance
        const ethBalance = await web3ETH.eth.getBalance(walletAddressETH);
       if (Number(web3ETH.utils.fromWei(ethBalance, 'ether')) > Number(ETH_MIN_SWEEP)) {
           await transferETH(walletAddressETH, ETH_DEST, ethBalance, ethPrivateKey);
        }

        // Check BNB balance
        const bnbBalance = await web3BNB.eth.getBalance(walletAddressBNB);
        if (Number(web3BNB.utils.fromWei(bnbBalance, 'ether')) > Number(ETH_MIN_SWEEP)) {
            await transferBNB(walletAddressBNB, BNB_DEST, bnbBalance, privateKeyWithPrefix);
        }

        // Check MATIC balance
        const maticBalance = await web3MATIC.eth.getBalance(walletAddressMATIC);
        if (Number(web3MATIC.utils.fromWei(maticBalance, 'ether')) > Number(ETH_MIN_SWEEP)) {
           await transferMATIC(walletAddressMATIC, MATIC_DEST, maticBalance, maticPrivateKey);
        }

        // Check SOL balance
       // const solBalance = await solanaConnection.getBalance(solanaKeypair.publicKey);
      //  if (solBalance / LAMPORTS_PER_SOL > SOL_MIN_SWEEP) {
       //    await transferSOL(solanaKeypair, SOLANA_DEST, solBalance);
      //  }
    }
}
// Transfer functions
async function transferETH(fromAddress, toAddress,amount, privateKey) {
    const balance = amount
    const gasPrice = await web3ETH.eth.getGasPrice();
    const gasLimit = 21000; // Typical gas limit for a simple ETH transfer
    const gasInWei = BigInt(gasPrice) * BigInt(gasLimit);

    // Calculate the maximum amount that can be sent
    const maxAmountInWei = BigInt(balance) - gasInWei;

    // Check if the balance is sufficient to cover gas fees
    if (maxAmountInWei < 0) {
        console.log('Balance too low to cover gas fees.');
        return; // Exit gracefully
    }

    // Proceed with sending the transaction
    const tx = {
        from: fromAddress,
        to: toAddress,
        value: maxAmountInWei.toString(),
        gas: gasLimit,
        gasPrice: gasPrice,
        nonce: await web3ETH.eth.getTransactionCount(fromAddress),
    };

    const signedTx = await web3ETH.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3ETH.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(`Transferred ${web3ETH.utils.fromWei(maxAmountInWei.toString(), 'ether')} ETH from ${fromAddress} to ${toAddress}`);
    return receipt; // Return the transaction receipt if needed
}

async function transferBNB(fromAddress, toAddress,balance, privateKey) {
   
    const gasPrice = await web3BNB.eth.getGasPrice();
    const gasLimit = 21000; // Typical gas limit for a simple transfer
    const gasInWei = BigInt(gasPrice) * BigInt(gasLimit);

    // Calculate the maximum amount that can be sent
    const maxAmountInWei = BigInt(balance) - gasInWei;

    // Proceed with sending the transaction
    const tx = {
        from: fromAddress,
        to: toAddress,
        value: maxAmountInWei.toString(),
        gas: gasLimit,
        gasPrice: gasPrice,
        nonce: await web3BNB.eth.getTransactionCount(fromAddress),
    };

    const signedTx = await web3BNB.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3BNB.eth.sendSignedTransaction(signedTx.rawTransaction);
    const amountInBNB = web3BNB.utils.fromWei(maxAmountInWei.toString(), 'ether');
    console.log(`Transferred ${amountInBNB} BNB from ${fromAddress} to ${toAddress}`);
    return receipt;
}


async function transferMATIC(fromAddress, toAddress,amount, privateKey) {
    const balance = amount
    const gasPrice = await web3MATIC.eth.getGasPrice();
    const gasLimit = 21000; // Typical gas limit for a simple MATIC transfer
    const gasInWei = BigInt(gasPrice) * BigInt(gasLimit);

    // Calculate the maximum amount that can be sent
    const maxAmountInWei = BigInt(balance) - gasInWei;

    // Check if the balance is sufficient to cover gas fees
    if (maxAmountInWei < 0) {
        console.log('Balance too low to cover gas fees.');
        return; // Exit gracefully
    }

    // Proceed with sending the transaction
    const tx = {
        from: fromAddress,
        to: toAddress,
        value: maxAmountInWei.toString(),
        gas: gasLimit,
        gasPrice: gasPrice,
        nonce: await web3MATIC.eth.getTransactionCount(fromAddress),
    };

    const signedTx = await web3MATIC.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3MATIC.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(`Transferred ${web3MATIC.utils.fromWei(maxAmountInWei.toString(), 'ether')} MATIC from ${fromAddress} to ${toAddress}`);
    return receipt; // Return the transaction receipt if needed
}

async function transferSOL(fromKeypair, toAddress, amount) {
    const transaction = await solanaConnection.requestAirdrop(fromKeypair.publicKey, amount);
    await solanaConnection.confirmTransaction(transaction);
    console.log(`Transferred ${amount / LAMPORTS_PER_SOL} SOL from ${fromKeypair.publicKey.toBase58()} to ${toAddress}`);
}

async function main() {
    let count=0
    while (true) {
        ++count
        console.log("checking-"+count+"-round")
        await checkAndTransferBalances();

        await sleep(60);
    }
}

main().catch(console.error);
