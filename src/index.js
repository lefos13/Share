var path = require("path");
var app = require("express")();
var http = require("http").Server(app);
// var io = require("socket.io")(http);
const cors = require("cors");
// const { Auth, LoginCredentials } = require("two-step-auth");

//const socketAuth = require('socketio-auth');
const nodemailer = require("nodemailer");
var otpGenerator = require("otp-generator");

const whitelist = ["*"];
const corsOptions = {
  credentials: true,
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "device-remember-token",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Headers",
    "Origin",
    "Accept",
  ],
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
      //callback(new Error('Not allowed by CORS'))
    }
  },
};

// async function login(emailid) {
//   try {
//     const res = await Auth(emailid, "Share the Ride");
//     console.log(res);
//     console.log(res.mail);
//     console.log(res.OTP);
//     console.log(res.success);
//   } catch (error) {
//     console.error(error);
//   }
// }

// LoginCredentials.mailID = "share.rideotp@gmail.com";
// LoginCredentials.password = "sharetheride1.13";
// LoginCredentials.use = true;
//console.log(otpGenerator.generate(4, { upperCase: true, specialChars: false }));
async function verification(otp, email) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "share.rideotp@gmail.com",
      pass: "sharetheride1.13",
    },
  });

  // send mail with defined transport object
  info = await transporter.sendMail({
    from: "Share the ride <share.rideotp@gmail.com",
    to: email, // list of receivers
    subject: "OTP code", // Subject line
    text: "Here is your OTP code:", // plain text body
    html:
      "Παρακάτω μπορείς να αντιγράψεις το κωδικό για να τον εισάγεις στην εφαρμογή σου: <br><h1><b>" +
      otp +
      "</b></h1>", // html body
  });
}

app.get(
  "/run",
  [
    //check('access_token').isLength({ min: 40 }),
    //check('llo').isBase64()
  ],
  cors(corsOptions),
  (req, res, next) => {
    var RES = new Object();
    RES.code = req.query["code"];
    console.error("socket GET from client " + RES.code);

    RES.error = false;
    RES.error_msg = "ok";

    // io.emit("iotdata", RES);
    // io.in("iot").emit("message", RES);
    res.json(RES);
  }
);

app.get(
  "/test",
  [
    //check('access_token').isLength({ min: 40 }),
    //check('llo').isBase64()
  ],
  cors(corsOptions),
  (req, res) => {
    //generate the otp
    var email = "cs141039@uniwa.gr";
    var otp = otpGenerator.generate(4, {
      digits: true,
      upperCase: false,
      alphabets: false,
      specialChars: false,
    });
    verification(otp, email);
    res.json("data");
  }
);

http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));
console.error("Run demo project");
console.log("Hello World!");
