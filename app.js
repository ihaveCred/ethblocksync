'use strict';
var Web3 = require("web3");
var BigNumber = require('bignumber.js');
var _ = require("underscore")._;
let fs = require('fs');
let httpRequest = require('request');

//https://kovan.infura.io/KcDF0o40KSkWOFVLyDkW;
const nodeUrl = 'https://mainnet.infura.io/FNKpcXdW3Dgou3VgYI7d';
var etherscan_receipt_url = 'https://api.etherscan.io/api?module=transaction&action=getstatus&apikey=QFC9TZMKP9RK9ED9ZBF5UB9VY34BP714ZA&txhash=';

var nodeUrlArray = ['https://mainnet.infura.io/FNKpcXdW3Dgou3VgYI7d', 'https://mainnet.infura.io/KcDF0o40KSkWOFVLyDkW', 'https://mainnet.infura.io/3UFqZPgWdUOVNqXYXPEK', 'https://mainnet.infura.io/t8uUMLXGPzZAlxOD0SxS'];

var [provider, web3] = createNewProvider();
var contractMap = {};
var decimalMap = {};
var decimail_error_file = 'decimail_err.log';



main();
//test();



async function test() {
    //must load dictionary first
    await loadTokenContractDict(); 
    let blockHigh = await getBlockHeight();
    let block = await getBlock(5904575);
    if (block) {
        let count = 0;
        let transactions = block.transactions;
        if (transactions.length > 0) {
            count++;
            for (let j = 0; j < transactions.length; j++) {
                processTransaction(transactions[j], 0, 'test.log', 0,block);
            }
        }
    }
}

async function main() {
    //must load dictionary first
    await loadTokenContractDict();
    let startBlock = 4370000;
    let total = 100000;
    let arg = process.argv;
    if (arg.length > 2 && arg[2]) {
        startBlock = parseInt(arg[2]);
        total = parseInt(arg[3]);
    }
    decimail_error_file = 'decimal_error_' + startBlock + "_" + total + ".log";
    console.log('program will start at block:' + startBlock);
    for (let i = 0; i <1; i++){
        batchRun(startBlock + i * total, total,i);
    }
}

async function batchRun(startBlock, total, thNumber) {
    let begin = new Date().getTime();
    let blockStep = 10000;
    let curPage = startBlock;

    console.log(thNumber + '#  ' + startBlock + "-" + (startBlock + total));
    await sleep(3);
    for (let i = startBlock; i < startBlock + total; i++) {

        if (i > curPage + blockStep) {
            curPage = i-1;
        }
        let logFileName = 'block-' + curPage + '-' + (curPage + blockStep) + '.txt';

        let block = await getBlock(i);
        if (block) {
            let transactions = block.transactions;
            if (transactions.length > 0) {
                for (let j = 0; j < transactions.length; j++) {
                    processTransaction(transactions[j], 0, logFileName, thNumber, block);
                    //console.log(thNumber + "#block: " + i + " # transaction: " + j + "  finished");    
                }
                //await sleep(0.05);
            }
            console.log(thNumber + "#block " + i + " over:" + transactions.length + '  finished: ' + new BigNumber(i - startBlock).dividedBy(total).multipliedBy(100).toPrecision(3)+" %");
        }
        //await sleep(0.5);

    }
    let end = new Date().getTime();
    console.log('do =' + total + ',use time:' + (end - begin) / 1000 / 60 + ' min');
}

async function processTransaction(txHash, failTimes,logFileName,threadNumber,block) {
    if (failTimes > 100) {
        console.log("======================== processTransaction fail,jump this transaction !!!!!!");
        return;
    }
    let is_error = '';
    let from = '';
    let to = '';
    let contrac_add = '';
    let amount = '';
    let eth_token_type = '';
    let time = '';
    let transaction_type = '';
    let txhash = '';
    let txfee = '';
    let gas = '';

    let method_id = '';  
    try {
        let transaction = await web3.eth.getTransaction(txHash);
        if (transaction){   
            txhash = transaction.hash;
            if (transaction.input && transaction.input != '0x' &&
                (transaction.input.startsWith('0xa9059cbb') || transaction.input.startsWith('0x23b872dd'))) {//'0xa9059cbb' =>transfer;  '0x23b872dd' => transferFrom
                contrac_add = transaction.to;
                transaction_type = 'token_transfer'
                //if method is transfer
                if (transaction.input.startsWith('0xa9059cbb')) {
                    let dataArr = getTransferParams(transaction.input);
                    from = transaction.from;
                    method_id = dataArr[0];
                    to = dataArr[1];
                    amount = dataArr[2];
                }//if method is transferFrom
                else if (transaction.input.startsWith('0x23b872dd')) {    
                    let dataArr = getTransferFromParams(transaction.input);
                    method_id = dataArr[0];
                    from = dataArr[1];
                    to = dataArr[2];
                    amount = dataArr[3];
                }
                let decimal = await getDecimal(contrac_add, txHash);
                amount = new BigNumber(amount).dividedBy(10 ** parseInt(decimal)).toString(10);
                if (contractMap[contrac_add]) {
                    eth_token_type = contractMap[contrac_add];
                }
                let receipt = await getTransferReceipt(txHash);
                if (receipt.status != undefined) {
                    is_error = !receipt.status;
                } else {
                    is_error = await getTrxStatusFromEtherScan(txHash);
                    //is_error = false;
                }

                gas = receipt.gasUsed;
                txfee = new BigNumber(receipt.gasUsed).multipliedBy(new BigNumber(transaction.gasPrice).dividedBy(10 ** 18)).toNumber();
                time = block.timestamp;

                let final_res = {
                    is_error: is_error,
                    from: from,
                    to: to,
                    contrac_add: contrac_add,
                    amount: amount,
                    eth_token_type: eth_token_type,
                    time: time,
                    transaction_type: transaction_type,
                    txhash: txhash,
                    txfee: txfee,
                    gas: gas,
                    block: transaction.blockNumber,
                    method_id: method_id
                };
                logToFile(_.values(final_res).toString(), logFileName);
            } else if (transaction.value > 0) {//eth tranfer trx
                transaction_type = 'eth_trade';
                let receipt = await getTransferReceipt(txHash);
                //if block number less than 43700000, receipt.status is undefined
                if (receipt.status != undefined) {
                    is_error = !receipt.status;
                } else {
                    is_error = await getTrxStatusFromEtherScan(txHash); 
                }
                gas = receipt.gasUsed;
                txfee = new BigNumber(receipt.gasUsed).multipliedBy(new BigNumber(transaction.gasPrice).dividedBy(10 ** 18)).toNumber();
                
                time = block.timestamp;
                let amount = new BigNumber(transaction.value).dividedBy(10 ** 18).toString(10);
                let final_res = {
                    is_error: is_error,
                    from: transaction.from,
                    to: transaction.to,
                    contrac_add: '',
                    amount: amount,
                    eth_token_type: 'ETH',
                    time: time,
                    transaction_type: transaction_type,
                    txhash: transaction.hash,
                    txfee: txfee,
                    gas: gas,
                    block: transaction.blockNumber,
                    method_id: ''
                }
                logToFile(_.values(final_res).toString(), logFileName);
            }
            else {
                //console.log('input data is empty: ' + transaction.input+" ##############  "+txHash);
            }
        }
    } catch (e) {
        let s = Math.floor(Math.random() * 5 + 1) + 3;//4 ~ 9
        console.error(threadNumber+"#"+failTimes + '---Get this tx info error ,sleep:'+s+"    "+ txHash);
        await sleep(s);
        await processTransaction(txHash, failTimes + 1, logFileName, threadNumber);
    }
}

function sleep(seconds) {
    return new Promise(resolve => { setTimeout(resolve, seconds * 1000) })
}

function getTransferParams(input) {
    let method_id = input.substr(0, 10);
    let params = '0x' + input.substr(10);
    let result = web3.eth.abi.decodeParameters(['address', 'uint256'], params)
    //method_id,to,amount
    return [method_id, result[0], new BigNumber(result[1]).toString(10)];
}

async function getTransferReceipt(txHash) {
    let receipt = await web3.eth.getTransactionReceipt(txHash);
    let tryReceipt = 1;
    while (!receipt) {
        tryReceipt ++;
        console.log('try to get receipt again ... ' + tryReceipt);
        await sleep(1);
        receipt = await web3.eth.getTransactionReceipt(txHash);
    }
    return receipt;
}

function getTransferFromParams(input) {
    let method_id = input.substr(0, 10);
    let params = '0x' + input.substr(10);
    let result = web3.eth.abi.decodeParameters(['address', 'address', 'uint256'], params);
    //method_id,from,to,amount
    return [method_id, result[0], result[1], new BigNumber(result[2]).toString(10)];
}

//load token info to memory
async function loadTokenContractDict() {
    let readline = require('readline');
    let fs = require('fs');
    let os = require('os');
    let fReadName = './addressInfo.txt';

    let fRead = fs.createReadStream(fReadName);
    let objReadline = readline.createInterface({
        input: fRead,
    });
    let result = await new Promise((resolve, reject) => {
        try {
            objReadline.on('line', (line) => {
                let columns = line.split(/[ ]+/);
                contractMap[columns[1].trim()] = columns[0].trim();
            });
            objReadline.on('close', () => {
                console.log('---------------   finish loading  -----------------' + _.keys(contractMap).length);
                resolve(true);
            });
        } catch (err) {
            reject(err);
        }
    });
    return result;
}

async function getTrxStatusFromEtherScan(txHash) {
    let v = false;
    let url = etherscan_receipt_url;
    try {
        url += txHash;
        let sts = await new Promise(function (resolve, reject) {
            httpRequest({ url: url, timeout: 20000 }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    resolve(body);
                } else {
                    reject(error);
                }
            })
        });
        sts = JSON.parse(sts);
        v = sts.result.isError === '1';
        //console.log(v + " ========= " + txHash + " #### " + JSON.stringify(sts));
    } catch (err) {
        console.log('fail to getTrxStatus # ' + txHash, err);
        await sleep(5);
    }
    //avoid interface calls too frequently
    await sleep(1);
    return v;
}



//get contract decimal,string
async function getDecimal(contract_addr,tx_hash) {
    //default 18;
    let dec_res = '18';
    //read from cache
    if (decimalMap[contract_addr]) {
        return decimalMap[contract_addr];
    }
    let batchEth = new web3.eth.Contract(
        [{
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [
                {
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }]
        , contract_addr);

    let batchEth2 = new web3.eth.Contract(
        [{
            "constant": true,
            "inputs": [],
            "name": "DECIMALS",
            "outputs": [
                {
                    "name": "",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }]
        , contract_addr);

    dec_res = await new Promise((resolve, reject) => {
                try {
                    batchEth.methods.decimals().call((err, dec) => {
                        if (err) {
                            batchEth2.methods.DECIMALS().call((err2, dec2) => {
                                if (err2) {
                                    console.log('get decimal error:   ' + contract_addr);
                                    logToFile("18#" + contract_addr + "#" + tx_hash, decimail_error_file);
                                    resolve('18');
                                }
                                decimalMap[contract_addr] = dec2;
                                resolve(dec2);
                            });
                        }
                        decimalMap[contract_addr] = dec;
                        resolve(dec);
                    });
                } catch (e) {
                    console.log("decimal out error: " + tx_hash, e);
                    //reject('18');
                    logToFile("18#out--" + contract_addr + "#" + tx_hash, decimail_error_file);
                    resolve('18');
                }
    });
    return dec_res;
}

//append one line to file
function logToFile(data,fileName) {
    fs.writeFile(fileName, data + '\n', { flag: 'a' }, function (err) {
        if (err) {
            console.log('log to file error', err);
        }
    });
}

function createNewProvider() {
    provider = new Web3.providers.HttpProvider(nodeUrl);
    web3 = new Web3(provider);
    console.log('web3 version ==================' + Web3.version);
    web3.setProvider(provider);
    return [provider, web3];
}

function getBlockHeight() {
    return new Promise(resolve => {
        web3.eth.getBlock('latest', function (error, block) {
            if (error) {
                provider, web3 = createNewProvider();
            }
            else {
                console.log('block#=' + block.number);
                resolve(block.number);
            }
        });
    })
}

async function getBlock(blockNumber) {
    let block;
    try {
        block = await web3.eth.getBlock(blockNumber);
    } catch (e) {
        console.error('getBlock error sleep 5 seconds');
        await sleep(5);
        await getBlock(blockNumber)
    }
    return block;
}