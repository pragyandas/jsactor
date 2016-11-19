"use strict";
//Supervision directives
//depending on exception from the child actor the parent actor can use any
//of the mentioned directives to counter the failure.
var Directive = {
	//Restart - restart the child default directive - most commonly used
	"Restart": function () {
		let msg = {
			action: "system",
			payload: "restart"
		}
	},

	//Escalate - parent doesn't know what to do - stops everything and asks its parent to take control 
	"Escalate": function () {
		let msg = {
			action: "system",
			payload: "escalate"
		}
	},

	//Stop - terminates the child actor
	"Stop": function () {
		let msg = {
			action: "system",
			payload: "stop"
		}
	},

	//Resume - ignores the error - least used strategy
	"Resume": function () {
		let msg = {
			action: "system",
			payload: "resume"
		}
	}
}

module.exports = Directive;