const express = require("express");
const app = express();
var http = require("http").Server(app);

//cors of course
const cors = require("cors");

//mysql package with util for promisify the results and wait for the quiries
var mysql = require("mysql");
const util = require("util");

//jwt
const jwt = require("jsonwebtoken");

app.use(express.json());

// package to send emails
const nodemailer = require("nodemailer");

// generator for otp codes
var otpGenerator = require("otp-generator");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { NODE_ENV, PORT, HOST, USER, PASS, DATABASE, TOKEN_KEY } = process.env;

const bcrypt = require("bcrypt");

//sequelize schema
const { Sequelize, DataTypes } = require("sequelize");
const { nextTick } = require("process");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
});
const saltRounds = 10;

const Users = sequelize.define(
  "Users",
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      // set(value) {
      //   this.setDataValue("password", hash(value));
      // },
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    car: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cardate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    facebook: {
      type: DataTypes.TEXT,
    },
    instagram: {
      type: DataTypes.TEXT,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

checkconnection();

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, TOKEN_KEY, (err, email) => {
    if (err)
      return res.json({
        body: null,
        error: {
          code: 403,
          body: "Token expired or didnt even exist",
        },
      });
    console.log("inside auth: " + JSON.stringify(email));
    req.body.data.email = email.email;
    next();
  });
}

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

function checkhash(pass, hash) {
  bcrypt.compare(pass, hash, function (err, result) {
    if (result == true) {
      Promise.resolve(true);
    } else Promise.resolve(false);
  });
}

//check connection with the database
async function checkconnection() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
  // sequelize.close()
}

// function that sends the otp to the email of the user (finished)
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

//rest api service that registers the user to the database, checks if he already exists and sends an otp for verification. (finished)
app.get("/register", [], cors(corsOptions), async (req, res) => {
  // crypto the password
  var data = req.body.data;
  bcrypt.genSalt(saltRounds, function (err, salt) {
    bcrypt.hash(data.password, salt, async function (err, hash) {
      var data = req.body.data;
      data.password = hash;

      //generate otp to send to the user's mail
      var otp = otpGenerator.generate(4, {
        digits: true,
        upperCase: false,
        alphabets: false,
        specialChars: false,
      });

      var code = null;
      var body = null;
      var results = null;

      await Users.create(data)
        .then((user) => {
          // console.log(user);
          results = {
            status: 1,
            otp: otp,
            user: user.toJSON(),
          };
        })
        .catch((err) => {
          // console.log(err);
          if (err.parent.errno === 1062) {
            code = err.parent.errno;
            body = "Dublicate entry";
          } else {
            code = 0;
            body = err.parent.sqlMessage;
          }
        });

      var data = {
        body: results,
        error: {
          code: code,
          body: body,
        },
      };

      res.json(data);
    });
  });
});

//rest api service that creates the token for the user. Also checks if he is verified and sends the right message (finished)
app.get("/createtoken", [], cors(corsOptions), async (req, res) => {
  var code = null;
  var body = null;
  var results = null;
  var email = req.body.data.email;
  // console.log();
  const user = await Users.findOne({
    where: {
      email: email,
    },
  }).catch((err) => {
    console.log("Error:" + err);
  });

  if (user === null) {
    code = 404;
    body = "User not found";
  } else {
    if (user.verified === false) {
      code = 350;
      body = "User not verified";
    } else {
      //create token
      payload = {
        email: email,
      };
      const accessToken = jwt.sign(payload, TOKEN_KEY, { expiresIn: "60d" });
      results = {
        accessToken: accessToken,
      };
    }
  }

  var data = {
    body: results,
    error: {
      code: code,
      body: body,
    },
  };
  res.json(data);
});

//service that updates the user's password (with encryption) - (finished)
app.get(
  "/updateUserPass",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    //console.log(req.body);
    var email = req.body.data.email;
    var password = req.body.data.pass;
    // var email = "asdasd";
    // var password = "asdasdd";

    var code = null;
    var body = null;
    var results = null;

    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        var newpass = hash;
        const user = await Users.update(
          { password: newpass },
          { where: { email: email } }
        ).catch((err) => {
          console.log(err);
        });
        if (user === null) {
          code = 404;
          body = "User not found";
        } else {
          results = {
            success: 200,
            newpass: newpass,
          };
        }

        var data = {
          body: results,
          error: {
            code: code,
            body: body,
          },
        };
        res.json(data);
      });
    });
  }
);

//service that updates the user's verification to true (almost finished)
app.get("/verify", [], cors(corsOptions), async (req, res) => {
  var email = req.body.data.email;

  var code = null;
  var body = null;
  var results = null;

  const user = await Users.update(
    { verified: true },
    {
      where: {
        email: email,
      },
    }
  ).catch((err) => {
    console.log("Error:" + err);
  });

  if (user === null) {
    code = 404;
    body = "User not found";
  } else {
    results = {
      success: 200,
    };
  }

  var data = {
    body: results,
    error: {
      code: code,
      body: body,
    },
  };
  res.json(data);
});

http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));
console.error("Run demo project");
console.log("Hello World!");
