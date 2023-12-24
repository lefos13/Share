module.exports = class CreateLocRequest {
  groupName;
  initiator;
  receivers;
  errorRequest = false;
  constructor(groupName, initiator, receivers) {
    try {
        this.groupName = groupName;
        this.initiator = initiator;
        this.receivers = receivers;
    } catch (error) {
        console.log(`Constructor CreateLocRequest failed with error: ${error}`);
        this.errorRequest = true;
    }
  }

  /**
   * The function `print()` logs the data of a `CreateLocRequest` object to the console.
   */
  print() {
    console.log(`===Data of CreateLocRequest object===`);
    console.log(
      `groupName: ${this.groupName}, initiator name: ${JSON.stringify(
        this.initiator
      )}, receivers: ${JSON.stringify(this.receivers)}`
    );
  }
};
