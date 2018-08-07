var Web3 = require("web3");
var BigNumber = require('bignumber.js');
var _ = require("underscore")._;
let fs = require('fs');
let httpRequest = require('request');

var etherscan_receipt_url = 'https://api.etherscan.io/api?module=transaction&action=getstatus&apikey=QFC9TZMKP9RK9ED9ZBF5UB9VY34BP714ZA&txhash=';
var contractMap = {};
var decimalMap = {};

exports.contractMap = contractMap;


exports.createNewProvider = createNewProvider;
exports.sleep = sleep;
exports.getTransferParams = getTransferParams;
exports.getTransferFromParams = getTransferFromParams;
exports.getTransactionReceipt = getTransactionReceipt;
exports.getTransaction = getTransaction;
exports.loadTokenContractDict = loadTokenContractDict;
exports.getTrxStatusFromEtherScan = getTrxStatusFromEtherScan;
exports.getDecimal = getDecimal;
exports.logToFile = logToFile;
exports.getBlockHeight = getBlockHeight;
exports.getBlock = getBlock;
exports.loadTaskRecord = loadTaskRecord;




function createNewProvider() {
    let nodeUrlArray = ['https://mainnet.infura.io/FNKpcXdW3Dgou3VgYI7d', 'https://mainnet.infura.io/KcDF0o40KSkWOFVLyDkW', 'https://mainnet.infura.io/3UFqZPgWdUOVNqXYXPEK', 'https://mainnet.infura.io/t8uUMLXGPzZAlxOD0SxS'];
    let index = Math.floor(Math.random() * (nodeUrlArray.length - 1))
    provider = new Web3.providers.HttpProvider(nodeUrlArray[index]);
    web3 = new Web3(provider);
    console.log('web3 version ==================' + Web3.version+', url index: '+ index);
    web3.setProvider(provider);
    return [provider, web3];
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


async function getTransactionReceipt(txHash) {
    let receipt = null;
    let tryTimes = 1;
    do {
        try {
            if (tryTimes > 100) {
                console.log("======getTransferReceipt fail try " + tryTimes + " times: " + txHash)
                return null;
            }
            receipt = await web3.eth.getTransactionReceipt(txHash);
        } catch (e) {
            tryTimes++;
            console.log('try to get receipt again ... ' + tryTimes + "," + e);
            await sleep(1);
        }
    } while (!receipt)
    return receipt;

}



async function getTransaction(txHash) {
    let transaction = null;
    let tryTimes = 1;
    do {
        try {
            if (tryTimes > 100) {
                console.log("======getTransaction fail try " + tryTimes + " times: " + txHash)
                return null;
            }
            transaction = await web3.eth.getTransaction(txHash);
        } catch (e) {
            tryTimes++;
            console.log('try to get trx again ... ' + tryTimes + "," + e);
            await sleep(1);
        }
    } while (!transaction)
    return transaction;
}

function getTransferFromParams(input) {
    let method_id = input.substr(0, 10);
    let params = '0x' + input.substr(10);
    let result = web3.eth.abi.decodeParameters(['address', 'address', 'uint256'], params);
    //method_id,from,to,amount
    return [method_id, result[0], result[1], new BigNumber(result[2]).toString(10)];
}

//load token info to memory
async function loadTokenContractDict(filePath) {
    let readline = require('readline');
    let fs = require('fs');
    let os = require('os');
    let fReadName = filePath;

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
                console.log('---------------   finish loading contract dic -----------------' + _.keys(contractMap).length);
                resolve(true);
            });
        } catch (err) {
            reject(err);
        }
    });
    return result;
}


//load schdule task record.
async function loadTaskRecord(filePath) {
    let readline = require('readline');
    let fs = require('fs');
    let os = require('os');
    let fReadName = filePath;
    let recordArray = [];

    let fRead = fs.createReadStream(fReadName);
    let objReadline = readline.createInterface({
        input: fRead,
    });
    let result = await new Promise((resolve, reject) => {
        try {
            objReadline.on('line', (line) => {
                if (line.trim()!= ''){
                    recordArray.push(line.trim());
                }
            });
            objReadline.on('close', () => {
                console.log('---------------   finish loading task record   -----------------' + _.keys(recordArray).length);
                resolve(recordArray);
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
async function getDecimal(contract_addr, tx_hash, decimail_error_file) {
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
    if (dec_res == undefined) {
        return '18';
    }
    return dec_res;
}



//append one line to file
function logToFile(data, fileName) {
    fs.writeFile(fileName, data + '\n', { flag: 'a' }, function (err) {
        if (err) {
            console.log('log to file error', err);
        }
    });
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