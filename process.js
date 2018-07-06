


var readline = require('readline');
var fs = require('fs');
var os = require('os');
var _ = require("underscore")._;

var fReadName = './addressInfo2.txt';

var fRead = fs.createReadStream(fReadName);
var objReadline = readline.createInterface({
    input: fRead,
});

    try {
        objReadline.on('line', (line) => {
            let jObj = JSON.parse(line);
            let keys = _.keys(jObj);
            for (let i = 0; i < keys.length; i++){
                if (keys[i]!=''){
                    logToFile(jObj[keys[i]] + "  " + keys[i]);
                }
            }
        });
        objReadline.on('close', () => {
            console.log('---------------   readline close  -----------------');
            
        });
    } catch (err) {
        console.log(err);
}




function logToFile(data) {
    fs.writeFile('tmp.txt', data + '\n', { flag: 'a' }, function (err) {
        if (err) {
            console.log('write fail', err);
        }
    });
}