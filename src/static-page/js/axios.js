function sendReport() {
  // const BASE_URL = "https://ouride.gr";
  var fullname = document.getElementById("name").value;
  var email = document.getElementById("email").value;
  var phoneNumber = document.getElementById("phone").value;
  var text = document.getElementById("message").value;
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
