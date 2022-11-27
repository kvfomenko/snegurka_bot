/*
const battery = require("battery");
 
(async () => {
    const { level, charging } = await battery();
 
    console.log(level);
    //=> 0.8
 
    console.log(charging);
    //=> true
})();
*/


const isCharging = require('is-charging');
 
isCharging().then(result => {
    console.log(result);
    //=> true
});
