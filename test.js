'use strict';
var Web3 = require("web3");
let provider = new Web3.providers.HttpProvider('https://mainnet.infura.io/t8uUMLXGPzZAlxOD0SxS');
let web3 = new Web3(provider);
var httpRequest = require('request');

web3.setProvider(provider);
//let res = web3.eth.abi.encodeFunctionSignature(
//    {
//        "constant": false,
//        "inputs": [
//            {
//                "name": "dst",
//                "type": "address"
//            },
//            {
//                "name": "wad",
//                "type": "uint256"
//            }
//        ],
//        "name": "transfer",
//        "outputs": [
//            {
//                "name": "",
//                "type": "bool"
//            }
//        ],
//        "payable": false,
//        "stateMutability": "nonpayable",
//        "type": "function"
//    }
//);
//console.log(res);


//res = web3.eth.abi.encodeFunctionSignature(
//    {
//        "constant": false,
//        "inputs": [
//            {
//                "name": "src",
//                "type": "address"
//            },
//            {
//                "name": "dst",
//                "type": "address"
//            },
//            {
//                "name": "wad",
//                "type": "uint256"
//            }
//        ],
//        "name": "transferFrom",
//        "outputs": [
//            {
//                "name": "",
//                "type": "bool"
//            }
//        ],
//        "payable": false,
//        "stateMutability": "nonpayable",
//        "type": "function"
//    }
//);

//console.log(res);



//let batchEth = new web3.eth.Contract(
//    [{
//        "constant": true,
//        "inputs": [],
//        "name": "decimals",
//        "outputs": [
//            {
//                "name": "",
//                "type": "uint256"
//            }
//        ],
//        "payable": false,
//        "stateMutability": "view",
//        "type": "function"
//    }]
//    , '0xb5A5F22694352C15B00323844aD545ABb2B11028');

//let s = batchEth.methods.decimals().call((err, dec) => {
//    console.log(dec);
//});


//let batchEth2 = new web3.eth.Contract(
//    [{
//        "constant": true,
//        "inputs": [],
//        "name": "DECIMALS",
//        "outputs": [
//            {
//                "name": "",
//                "type": "uint256"
//            }
//        ],
//        "payable": false,
//        "stateMutability": "view",
//        "type": "function"
//    }]
//    , '0xb5A5F22694352C15B00323844aD545ABb2B11028');


//batchEth2.methods.DECIMALS().call((err, dec) => {
//    console.log(dec);
//});

async function getTrxStatus(txHash) {

    let url = 'https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&apikey=QFC9TZMKP9RK9ED9ZBF5UB9VY34BP714ZA&txhash=';
    url += txHash;
    let sts = await new Promise(function (resolve, reject) {
        httpRequest({ url: url, timeout: 2000 }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            } else {
                reject(error);
            }
        })
    });
    sts = JSON.parse(sts);
    let v = sts.result.status === '1';
    return !v;
}
console.log('==================');
async function getBlock(blockNumber) {
    let block;
    try {
        block = await web3.eth.getBlock(blockNumber);
    } catch (e) {
        console.error('getBlock error sleep 5 seconds');
    }

    return block;
}

//getTrxStatus('0x37d99869790ffbae14352c177afcaa683d84ec60431316ab06e0164bc87f6ed5');
async function test() {
    let txHash = '0x9f2042451d487c9ba7c0dc633420575d80629de05d989739de186844af699b8e';

    //for (let i = 2800000; i < 1000 + 2800000; i++) {
    //    let block = await getBlock(i);
    //    if (block) {
    //        let count = 0;
    //        let transactions = block.transactions;
    //        if (transactions.length > 0) {
                
    //            for (let j = 0; j < transactions.length; j++) {
    //                let transaction =await web3.eth.getTransaction( transactions[j]);
    //                let receipt = await web3.eth.getTransactionReceipt(transaction.hash);
    //                console.log(transaction.gas + " ======= " + receipt.gasUsed + "  #### " + transaction.hash);
    //            }
    //        }
    //    }
    //}

    let transaction = await web3.eth.getTransaction(txHash);
    let receipt = await web3.eth.getTransactionReceipt(txHash);
    console.log(JSON.stringify(transaction));
    console.log(JSON.stringify(receipt));

    //Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;
    //console.log(web3);
    //web3.currentProvider.sendAsync({ method: "eth_blockNumber", params: [], jsonrpc: "2.0", id: 1 }, function (error, result) {
    //    console.log(error);
    //    console.log(result);
    //});

    //var headers = {
    //    'User-Agent': 'Super Agent/0.0.1',
    //    'Content-Type': 'application/json-rpc',
    //    'Accept': 'application/json-rpc'
    //};
    //var options = {
    //    url: "https://mainnet.infura.io/KcDF0o40KSkWOFVLyDkW",
    //    method: 'POST',
    //    headers: headers,
    //    form: { method: "debug_traceTransaction", params: [txHash], jsonrpc: "2.0", id: 1 }
    //};

    //httpRequest(options, function (error, response, body) {
    //    console.log(error);
    //    console.log(body);
    //    console.log(response);
    //});

    let uObj = await web3.eth.getUncle('5907658',0);
    console.log(uObj);
}

test();