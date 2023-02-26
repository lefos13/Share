function sendReport() {
  // const BASE_URL = "https://ouride.gr";
  var fullname = document.getElementById("name");
  var email = document.getElementById("email");
  var phoneNumber = document.getElementById("phone");
  var text = document.getElementById("message");
  console.log(fullname, email, phoneNumber, text);
  axios
    .post(
      // `${BASE_URL}/test/users/createtoken`,
      "https://ouride.gr/test/neutral/webSendReport",
      {
        text: text,
        email: email,
        fullname: fullname,
        phoneNumber: phoneNumber,
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
