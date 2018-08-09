var task = require('./app');
let i = 0;
//start at 10:00 every day
task.schduleTask('0 45 13 * * *'); 0
setInterval(() => {
    console.log('service is running... '+ (i++));
}, 5000)