"use strict";
// import "regenerator-runtime/runtime";

const BASE_URL = "https://ouride.gr";
const sendReport = async () => {
  try {
    const instance = axios.create({
      baseURL: BASE_URL,
    });

    await axios
      .post(
        `${BASE_URL}/test/users/createtoken`,
        {
          data: {
            email: "lefterisevagelinos1996@gmail.com",
          },
        },
        {
          headers: {
            "content-Type": "application/json",
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
  } catch (error) {
    console.error(error);
  }
};
