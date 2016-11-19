"use strict";

//context describe the meta-data for an actor
//It maintains various information like 
//parent of the actor
//children list of the actor
//It listens to cluster events and make an actor aware of the same
//It also exposes factory api to create new actor - which an actor can use to create children

var uuid = require("node-uuid");
var config = require("../actor-config.json");
var defaultRouter = require('./router.js');

class Context {
	//life-cycle monitoring - listens to system events - To be implemented 

	//parentSupervisor - the parent actor
	//supervisedChildren - the set of supervisedChildren
	constructor(id, type, parentSupervisorId, router) {
		//actor id
		this.id = id;

		//the type denotes the generator 
		//to be used as the message processing core of the actor
		this.type = type;

		//id of the parent
		this.parentSupervisorId = parentSupervisorId;

		//set router if not exist
		this.router = router || defaultRouter;

		//set of children ids
		this.supervisedChildren = new Set();

		//status of the children
		this.supervisedChildrenStatus = {};
	}


	//factory method to create child actor for a particular actor
	/**
	 * [create child for the actor]
	 * @param  {[string]} id   		[the id with which child need be created]
	 * @param  {[string]} type 		[type of the generator function]
	 * @return {[object]} context   [the generated context]
	 */
	createChildContext(id, type) {

		//add to supervisedChildren set
		this.supervisedChildren.add(id);

		//create context object with id and this.id
		//new Context(id,this.id,pathFromRoot);
		return new Context(id, type, this.id);
	}

	//create child context if child doesn't exist
	createIfNotExists(id, type) {
		//check if the child exists with id
		//if child exists pass the childId
		//else pass both the childId and the child_context

		//populate only the id
		var child = {
			id: id
		};

		//if id doesn't exist then create and populate context
		if (!this.ifExists(id)) {
			child.context = this.createChildContext(id, type);
			this.supervisedChildrenStatus[id] = "created";
		}

		return child;
	}

	//check if child exists
	ifExists(id) {
		//check if the actor is present in the set
		return this.supervisedChildren.has(id);
	}

	/**
	 * [used to send message to different actor in the system]
	 * @param  {[id]} id      	  [actor identifier]
	 * @param  {[object]} msg     [message object to be sent]
	 * @param  {[object]} child_context [child context object - only used when creating new actor]
	 * @return {[undefined]}      [NA]
	 */
	send(id, message, child_context) {

		//wrapping essentials in an object
		var mail = Object.assign(message, {
			sender: this,
			child_context: child_context
		});
		//send message to router which is responsible for discovering
		//actor location and sending the message to the actor
		this.router.send(id, mail);
	}
}

module.exports = Context;