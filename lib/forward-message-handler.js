/*
In an hierarchy like

		root
	   /	\
	actor1	actor2

if actor1 wants to send a message to actor2 then it has to go through the root.
actor1 send the message to the path root/actor2.
The dispatcher of the system looks at the path and decides to wrap the original message in an envelop marked as forward.
When an actor receives a message marked as forward it understands that it doesn't need to process it 
rather it needs to forward to an actor down in its hierarchy.
*/

module.exports = function (mail) {
	var id = mail.id.split("/").shift();
	/*
	child:{
		id : id,
		context: genarated context (can be null/undefined if child exists)		
	}
	 */

	//mail.id can be a single id or a path consisting of
	//ids' separated by "/"


	var child = this.context.createIfNotExists(id, this._child_type);
	this.context.send(mail.id, mail.box, child.context);
}