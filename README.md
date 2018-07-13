# EtherBlockSync
This is an Ethereum block synchronization script.

## 1 install
     npm install
## 2 run
     node app.js 2800000 100000
This means program will start at block height 2,800,000 and the next 100,000 blocks will be traversed.All transactions in the block will be read and parsed and stored in the txt file.Transaction information for every 10,000 blocks is stored as a single file.
From the above instructions you will get 10 txt files：block-2800000-2810000.txt,block-2810000-2820000.txt,...,block-2890000-2900000.txt.

## 3 batchFix.js
batchFix.js is used to repair problematic data,such as false data caused by false recharge vulnerabilities. All data files that need to be repaired should be stored in the './finished' folder. All repaired files are in the './fixed' folder and file name remains unchanged.The names of all the files that have been repaired are saved in the fixed.txt file. No duplicate repairs after the program restarts.
     
     node batchFix.js
