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
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxlZnRlcmlzZXZhZ2VsaW5vczE5OTZAZ21haWwuY29tIiwiZGF0YSI6IjIwMjMtMDItMjZUMTg6NDM6NTkuNDA4WiIsImlhdCI6MTY3NzQzNzAzOSwiZXhwIjoxNjgyNjIxMDM5fQ.iBxM6J-eSdC5wZb7kXP1y4IfccRMWxj1bvisA2iipHo",
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
