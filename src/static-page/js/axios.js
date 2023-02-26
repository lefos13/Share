function sendReport() {
  // const BASE_URL = "https://ouride.gr";
  axios
    .post(
      // `${BASE_URL}/test/users/createtoken`,
      "https://ouride.gr/test/neutral/sendReport",
      // {
      //   data: {
      //     email: "lefterisevagelinos1996@gmail.com",
      //   },
      // },
      {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxlZnRlcmlzZXZhZ2VsaW5vczE5OTZAZ21haWwuY29tIiwiZGF0YSI6IjIwMjMtMDItMjZUMTg6MDQ6MTguODM2WiIsImlhdCI6MTY3NzQzNDY1OCwiZXhwIjoxNjgyNjE4NjU4fQ.E3DqD3pIiOB3gEGzj25slQMg1NBj8u749kLHSDba22g",
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
