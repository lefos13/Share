module.exports = class CreateLocRequest {
  groupName;
  initiator;
  receivers;
  constructor(groupName, initiator, receivers) {
    this.groupName = groupName;
    this.initiator = initiator;
    this.receivers = receivers;
  }

  print() {
    console.log(`===Data of CreateLocRequest object===`);
    console.log(
      `groupName: ${this.groupName}, initiator name: ${JSON.stringify(
        this.initiator
      )}, receivers: ${JSON.stringify(this.receivers)}`
    );
  }
};
