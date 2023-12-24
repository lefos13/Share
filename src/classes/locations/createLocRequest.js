module.exports = class CreateLocRequest {
    groupName;
    initiator;
    receivers;
    constructor(groupName, initiator, receivers) {
        this.groupName = groupName;
        this.initiator = initiator;
        this.receivers = receivers;
      }

    log(){
        console.log(`===Data of createlocrequest object===`);
        console.log(`groupName: ${this.groupName}`);
        console.log(`initiator: ${this.initiator}`);
        console.log(`receivers: ${this.receivers}`);
    }
}