let readlines = require('n-readlines');
var fs = require("fs")
var path = require("path")

let baseService = require('./baseService');
var [provider, web3] = baseService.createNewProvider();

//contains data-files that need to fix
let needFixDir = './finished/';
//store data-files that has been fixed 
let fixDoneDir = './fixed/';
//this file save all the fixed files' name
let fixFileNameCache = 'fixed.txt'

async function fix(fileName,targetFileName) {
    
    try {
        let begin = new Date().getTime();
        let liner = new readlines(fileName);
        let lineNumber = 1;
        let line;
        while (line = liner.next()) {
            let lineStr = line.toString('ascii');
            check(lineStr, lineNumber, targetFileName);
            lineNumber++;
            if (lineNumber % 1000 == 0) {
                console.log('curLine:' + lineNumber);
                await baseService.sleep(5);
            }
            
        }
        let end = new Date().getTime();
        console.log(fileName + ' done =' + lineNumber + ',use time:' + (end - begin) / 1000 + ' s');
    } catch (err) {
        console.log(err);
    }
    
}

async function check(lineStr,lineNumber,targetFile) {
    try {
        let columns = lineStr.split(',');
        let eventType = columns[7];
        let isError = columns[0];
        let txHash = columns[8];
        if (eventType == 'token_transfer' && isError == 'false') {
            //console.log(columns);

            let receipt = await baseService.getTransactionReceipt(txHash);
            if (receipt && receipt.logs.length == 0) {
                columns[0] = 'true';
                console.log('============== ' + lineNumber + ' modify txHash: ' + txHash)
            } else {
                //console.log('---------' + lineNumber + ' checked');
            }

        } else {
            //console.log('line is eth transfer: ' + lineNumber);
        }
        baseService.logToFile(columns.toString(), targetFile);
    } catch (err) {
        console.log('error,jumped --- ' + txHash);
    }
}


async function runSingle() {
    let rFilePath = '';
    let wFilePath = '';

    let arg = process.argv;
    if (arg.length > 2 ) {
        rFilePath = arg[2];
        wFilePath = arg[3];
    }

    if (rFilePath != '' && wFilePath != '') {
        console.log('fix will start: ' + rFilePath + ' --->' + wFilePath);
        await baseService.sleep(3);
        fix(rFilePath, wFilePath);
    } else {
        console.log('file path is empty!');
    }
    
}






async function runAll(path) {
    
    let dict = loadDoneDict(fixFileNameCache);
    var files = fs.readdirSync(path);
    for (let i = 0; i < files.length; i++) {
        let fileName = files[i];
        var info = fs.statSync(path + "/" + fileName)
        fileName = fileName.trim();
        if (info.isDirectory()) {
            console.log("dir: " + fileName)
            //runAll(path + "/" + fileName); //no need recursive
        } else {
            //console.log("file: " + fileName)
            if (dict[fileName]) {
                console.log(fileName + '---  has been processed before');
            } else {
                console.log('fix will start: ' + needFixDir + fileName + ' --->' + fixDoneDir + fileName);
                baseService.sleep(10)
                await fix(needFixDir + fileName, fixDoneDir + fileName);
                baseService.logToFile(fileName, fixFileNameCache);
            }
        }
    }


    //pa.forEach(async function (fileName, index) {
    //    var info = fs.statSync(path + "/" + fileName)
    //    fileName = fileName.trim();
    //    if (info.isDirectory()) {
    //        console.log("dir: " + fileName)
    //        //readDirSync(path + "/" + fileName); //no need recursive
    //    } else {
    //        //console.log("file: " + fileName)
    //        if (dict[fileName]) {
    //            console.log(fileName+'---  has been processed before');
    //        } else {
    //            console.log('fix will start: ' + needFixDir + fileName + ' --->' + fixDoneDir + fileName);
    //            baseService.sleep(3)
    //            await fix(needFixDir + fileName, fixDoneDir + fileName);
    //            baseService.logToFile(fileName, fixFileNameCache);
    //        }
    //    }
    //})
}

function loadDoneDict(fileName) {
    let dict = {}

    let liner = new readlines(fileName);
    let lineNumber = 1;
    let line;
    while (line = liner.next()) {
        let lineStr = line.toString('ascii').trim();
        dict[lineStr] = lineStr;
        lineNumber++;
    }
    console.log('dict load finish ' + lineNumber);
    return dict;
}

function main() {
    runAll(path.join(__dirname) + '/finished/');
}


main();