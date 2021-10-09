var app = require("express")();
var http = require("http").Server(app);

//cors of course
const cors = require("cors");

//mysql package with util for promisify the results and wait for the quiries
var mysql = require("mysql");
const util = require("util");

// package to send emails
const nodemailer = require("nodemailer");

// generator for otp codes
var otpGenerator = require("otp-generator");

// enviroment variables
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { NODE_ENV, PORT, HOST, USER, PASS, DATABASE } = process.env;

//cors configuration
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

//Database connection variable
var con;

//function that created a new connection with the db
function newCon() {
  const connection = mysql.createConnection({
    host: HOST,
    user: USER,
    password: PASS,
    database: DATABASE,
  });

  return {
    query(sql, args) {
      return util.promisify(connection.query).call(connection, sql, args);
    },
    close() {
      return util.promisify(connection.end).call(connection);
    },
  };
}

//function that get a list of users (unfinished)
function getUser() {
  con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
    var sql = "SHOW tables";
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("Result: " + JSON.stringify(result));
    });
    con.end();
  });
}

// function that sends the email to the right user (finished)
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

//rest api service that registers the user to the database, checks if he already exists and sends an otp for verification.
app.get(
  "/register",
  [
    //check('access_token').isLength({ min: 40 }),
    //check('llo').isBase64()
  ],
  cors(corsOptions),
  async (req, res) => {
    var args = {
      email: "cs141082@uniwa.gr",
      password: "123456",
      mobile: "12313",
      fullname: "lefos evan",
      car: "toyota",
      cardate: "1996",
      gender: "male",
      age: "26",
      photo: "12131231",
    };

    var email = args.email;

    var otp = otpGenerator.generate(4, {
      digits: true,
      upperCase: false,
      alphabets: false,
      specialChars: false,
    });

    var code = null;
    var body = null;
    var results = null;

    con = newCon();
    try {
      var sql = "INSERT INTO Users SET ?";
      await con.query(sql, args);
      results = {
        email: email,
        otp: otp,
      };
      // verification(otp, email);
    } catch (err) {
      results = null;
      if (err.errno == 1062) {
        code = err.errno;
        body = "Dublicate entry";
      } else {
        code = err.errno;
        body = err;
      }
    } finally {
      await con.close();
    }

    var data = {
      body: results,
      error: {
        code: code,
        body: body,
      },
    };

    res.json(data);
  }
);

http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));
console.error("Run demo project");
console.log("Hello World!");
