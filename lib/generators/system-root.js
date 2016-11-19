"use strict";
/*THE ROOT ACTOR*/
//root of the actor hierarchy
//supervises the first level of actors - order actors in this case
//it creates new actors based on demand and assigns the required message

//creates new actors for each order
//
module.exports = function* root(callback) {

	var actor = this;

	actor._child_type = "account";

	var _states = {
		"initiate": 0,
		"complete": 1
	}

	while (true) {
		//receive messages
		try {
			var mail = yield;
			if (mail) {
				//get the state from message action
				var state = _states[mail.action];
				switch (state) {
				case 0:
					//if child doesn't exist create context 
					var child = actor.context.createIfNotExists(mail.payload.id, actor._child_type);

					var msg = {
						action: "initiate",
						payload: mail.payload.message
					};
					actor.context.send(child.id, msg, child.context);
					break;
				case 1:
					//tell the client that the request has completed successfully
					var payload = mail.payload;
					var sender = payload.sender_context;

					//get the child information from the parent 
					//send out the response to the client
					break;
				default:
					//invalid message
					break;
				}

				//callback for next reading next message in the mailbox
				callback();
			}
		} catch (exp) {
			//tell the client something went wrong
		}
	}

}