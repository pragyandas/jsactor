//used by actor to handle received system messages

module.exports = function (mail) {
	var _system_messages = {
		"exception": 0,
		"retry": 1,
		"directive": 2,
		"terminate": 3,
		"terminated": 4,
		"restart": 5,
		"recover": 6
	}

	switch (_system_messages[mail.subaction]) {
	case 0:
		//fetch strategy by registering the rogue mail id
		var derived_strategy = this.strategy.registerException(mail.payload, mail.rogueMailId);

		//the derived_strategy contains either a retry command or a directive
		/*if the message crosses the exception per duration limit
		 as specified by the strategy 
		 then a directive is triggered 
		 to enforce the counter measures on the particular message*/
		if (derived_strategy.retry) {

			//subaction retry sent to the sender of the exception
			var msg = {
				action: "system",
				subaction: "retry",
				rogueMailId: mail.rogueMailId
			}

			this.context.send(mail.sender.id, msg);
		} else {

			//subaction directive is sent to the sender of the exception
			var msg = {
				action: "system",
				subaction: "directive",
				rogueMailId: mail.rogueMailId,
				payload: derived_strategy.directive
			}

			this.context.send(mail.sender.id, msg);
		}

		break;
	case 1:
		//retry message
		this.retry(mail.rogueMailId);
		break;
	case 2:

		//apply the directive
		this.applyDirective(mail.directive, mail.rogueMailId);
		break;
	case 3:
		//upon receiving terminate messsage the actor initiates shutdown
		this.stop();
		break;
	case 4:
		//terminated message is received by the actor from the child actor
		//register the termination of each child until all the children have been successfully terminated
		this.registerChildTermination(mail.sender.id);
		break;
	case 5:
		//restart message is received by the actor from the parent actor
		this.restart();
		break;
	case 6:
		//restart message is received by the actor from the parent actor
		this.recover(mail.failureTime, mail.failedNode);
		break;
	default:
		//invalid subaction
		break;
	}
}