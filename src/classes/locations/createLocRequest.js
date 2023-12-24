module.exports = class CreateLocRequest {
  locationName;
  initiator;
  receivers;
  errorRequest = false;
  constructor(locationName, initiator, receivers) {
    try {
      this.locationName = locationName;
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
      `locationName: ${this.locationName}, initiator name: ${JSON.stringify(
        this.initiator
      )}, receivers: ${JSON.stringify(this.receivers)}`
    );
  }
};
