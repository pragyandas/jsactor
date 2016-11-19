/*maps the genrators to keys
so that each generator can be referenced 
by a name*/


/*
To be implemented :
generator to be injected externally
just like models in loopback
generator added to "generators" folder and mapping in a json
<key>:<value>::<name>:<filename> 
and adding generator path to system config if required
*/
var path = require('path');
var _GEN_PATH = "./generators/";

module.exports = function (name) {
	try {
		var genpath = path.join(__dirname, "/generators/" , name + '.js');
		var gen = require(genpath);
		return gen;
	} catch (exp) {
		console.error('error ' + exp);
	}

}