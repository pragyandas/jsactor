var rest = require('restler');
var config = require('../config.json');
var dispatherUrl = config.dispatcherURL + ':'+ config.dispatcherPort + '/send'; // dispatcher's "send" route listens to internal message

/**
 * helper function, always pass the message to dispather using target actor id
 * id: target actor id
 * mail: message to be passed
 */
var send = function(id, mail){
    rest.post(dispatherUrl, {data:{id:id,message:mail}});
}

module.exports = {
    send : send
}