'use strict';
var Web3 = require("web3");
var BigNumber = require('bignumber.js');
var _ = require("underscore")._;
let fs = require('fs');
let httpRequest = require('request');

var baseService = require('./baseService');




var decimail_error_file = 'decimal_err.log';
var [provider, web3] = baseService.createNewProvider();



main();
//test();



async function test() {
    //must load dictionary first
    await baseService.loadTokenContractDict('./addressInfo.txt');
    let blockHigh = await baseService.getBlockHeight();
    let block = await baseService.getBlock(5904575);
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
    await baseService.loadTokenContractDict('./addressInfo.txt');
    let startBlock = 5955340;
    let total = 100000;
    let blockStep = 100;
    let arg = process.argv;
    if (arg.length > 2 && arg[2]) {
        startBlock = parseInt(arg[2]);
        total = parseInt(arg[3]);
    }
    decimail_error_file = 'decimal_error_' + startBlock + "_" + total + ".log";
    console.log('program will start at block:' + startBlock);
    for (let i = 0; i <1; i++){
        batchRun(startBlock + i * total, total, blockStep,i);
    }
}

async function batchRun(startBlock, total,blockStep, thNumber) {
    let begin = new Date().getTime();
    if (total < blockStep)
        blockStep = total
    let curPage = startBlock;

    console.log(thNumber + '#  ' + startBlock + "-" + (startBlock + total));
    await baseService.sleep(3);
    for (let i = startBlock; i < startBlock + total; i++) {

        if (i > curPage + blockStep) {
            curPage = i-1;
        }
        let logFileName = 'block-' + curPage + '-' + (curPage + blockStep) + '.txt';
        let sourceFileName = './source_data/source-' + curPage + '-' + (curPage + blockStep) + '.txt';

        let block = await baseService.getBlock(i);
        if (block) {
            let transactions = block.transactions;
            if (transactions.length > 0) {
                for (let j = 0; j < transactions.length; j++) {
                    processTransaction(transactions[j], 0, logFileName, thNumber, block);   
                    //saveSource(transactions[j], 0, sourceFileName, thNumber, block)
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

async function saveSource(txHash, failTimes, fileName, threadNumber, block) {
    if (failTimes > 100) {
        console.log("======================== Save to File fail,jump this transaction :" + txHash);
        return;
    }
    let tran = await baseService.getTransaction(txHash);
    let receipt = await baseService.getTransferReceipt(txHash);
    if (tran && receipt) {
        baseService.logToFile(block.number + '##' + block.timestamp + '##' + JSON.stringify(tran) + '##' + JSON.stringify(receipt), fileName);
    }
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
        let transaction = await baseService.getTransaction(txHash);
        if (transaction){   
            txhash = transaction.hash;
            //'0xa9059cbb' =>transfer;  '0x23b872dd' => transferFrom
            if ((transaction.input.startsWith('0xa9059cbb') || transaction.input.startsWith('0x23b872dd')) && transaction.value ==0) {
                contrac_add = transaction.to;
                transaction_type = 'token_transfer'
                //if method is transfer
                if (transaction.input.startsWith('0xa9059cbb')) {
                    let dataArr = baseService.getTransferParams(transaction.input);
                    from = transaction.from;
                    method_id = dataArr[0];
                    to = dataArr[1];
                    amount = dataArr[2];
                }//if method is transferFrom
                else if (transaction.input.startsWith('0x23b872dd')) {    
                    let dataArr = baseService.getTransferFromParams(transaction.input);
                    method_id = dataArr[0];
                    from = dataArr[1];
                    to = dataArr[2];
                    amount = dataArr[3];
                }
                let decimal = await baseService.getDecimal(contrac_add, txHash, decimail_error_file);
                amount = new BigNumber(amount).dividedBy(10 ** parseInt(decimal)).toString(10);
                if (baseService.contractMap[contrac_add]) {
                    eth_token_type = baseService.contractMap[contrac_add];
                }
                let receipt = await baseService.getTransactionReceipt(txHash);
                
                if (receipt.status != undefined) {
                    is_error = !receipt.status;
                } else {
                    is_error = await baseService.getTrxStatusFromEtherScan(txHash);
                    //is_error = false;
                }
                if (is_error == false && receipt.logs.length == 0) {
                    console.log('===============' + method_id+'  failed trx, event logs is empty,trx: ' + txHash)
                    is_error = true;
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
                baseService.logToFile(_.values(final_res).toString(), logFileName);
            } else if (transaction.value > 0) {//eth tranfer trx
                transaction_type = 'eth_trade';
                let receipt = await baseService.getTransactionReceipt(txHash);
                //if block number less than 43700000, receipt.status is undefined
                if (receipt.status != undefined) {
                    is_error = !receipt.status;
                } else {
                    is_error = await baseService.getTrxStatusFromEtherScan(txHash); 
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
                baseService.logToFile(_.values(final_res).toString(), logFileName);
            }
            else {
                //console.log('input data is empty: ' + transaction.input+" ##############  "+txHash);
            }
        }
    } catch (e) {
        let s = Math.floor(Math.random() * 5 + 1) + 3;//4 ~ 9
        console.error(threadNumber+"#"+failTimes + '---Get this tx info error ,sleep:'+s+"    "+ txHash,e);
        await baseService.sleep(s);
        await processTransaction(txHash, failTimes + 1, logFileName, threadNumber);
    }
}