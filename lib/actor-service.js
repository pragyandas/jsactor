var genMap = require('generator-mapper.js');
var Actor = require('actor.js')
var Context = require('../utilities/context.js')

var Actor = function (id, msg){
    if(msg.child_context){
        var actor = new Actor(genMap(msg.child_context.type),new Context(id, msg.child_context.type, null));
        actor.recieve(msg.message);
        return actor;
    }else{
        
    }
    
}

module.export = {
    createRoot : createRoot

}