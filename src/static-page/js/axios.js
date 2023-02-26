function sendReport() {
  // const BASE_URL = "https://ouride.gr";
  axios
    .post(
      // `${BASE_URL}/test/users/createtoken`,
      "https://ouride.gr/test/neutral/webSendReport",
      {
        text: "Test report from website!",
        email: "lefos@gmail.com",
        fullname: "Lefos Evan",
        phoneNumber: "69756226262",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "EN",
        },
      }
    )
    .then((res) => {
      console.log(res);
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      console.log("AXIOS CALL ENDED");
    });

  console.log("SEND REPORT!");
}
