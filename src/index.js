const express = require("express");
const app = express();
var http = require("http").Server(app);

//helmet for security
const helmet = require("helmet");
app.use(helmet());

//cors of course
const cors = require("cors");

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
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY } = process.env;

//console.log (EMAIL, PASSEMAIL);
const bcrypt = require("bcrypt");

//sequelize schema
const { Sequelize, DataTypes } = require("sequelize");
const { nextTick } = require("process");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
});
const saltRounds = 10;

const Users = require("./modules/user");
const Posts = require("./modules/post");

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

// function that sends the otp to the email of the user
async function verification(otp, email) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: EMAIL,
      pass: PASSEMAIL,
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
app.post("/register", [], cors(corsOptions), async (req, res) => {
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
          verification(otp, data.email);
          results = {
            status: 1,
            message: "Εγγραφήκατε επιτυχώς. Πάμε για την εξακρίβωση του email!",
            otp: otp,
            user: data,
          };
        })
        .catch((err) => {
          console.log(err);
          if (err.parent.errno === 1062) {
            code = err.parent.errno;
            body = "Βρέθηκε λογαριασμός με το ίδιο email.";
          } else {
            code = 0;
            body = "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.";
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

//rest api service that creates the token for the user. Also checks if he is verified and sends the right message
app.post("/createtoken", [], cors(corsOptions), async (req, res) => {
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
    body = "Ο χρήστης δεν βρέθηκε.";
  } else {
    if (user.verified === false) {
      code = 350;
      body = "Πρέπει να επιβεβαιώσεις το email σου.";
    } else {
      //create token
      payload = {
        email: email,
      };
      const accessToken = jwt.sign(payload, TOKEN_KEY, { expiresIn: "60d" });
      results = {
        message: "Επιτυχής δημιουργία του token",
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

//service that updates the user's password (with encryption)
app.post("/updateUserPass", [], cors(corsOptions), async (req, res) => {
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
        code = 500;
        body = "Κάτι πήγε στραβά.";
      });
      if (user === null) {
        code = 404;
        body = "Ο χρήστης δεν βρέθηκε";
      } else {
        results = {
          success: 200,
          message: "Ο κωδικός ανανεώθηκε επιτυχώς.",
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
});

//service that updates the user's verification to true
app.post("/verify", [], cors(corsOptions), async (req, res) => {
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
    body = "Ο χρήστης δεν βρέθηκε.";
  } else {
    results = {
      success: 200,
      body: "Το email επιβεβαιώθηκε με επιτυχία.",
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

//service that verifies the login process of the user
app.post("/login", [authenticateToken], cors(corsOptions), async (req, res) => {
  var email = req.body.data.email;
  var pass = req.body.data.pass;
  var code = null;
  var body = null;
  var results = null;
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
    body = "Ο χρήστης δεν βρέθηκε.";
  } else {
    if (user.verified === false) {
      code = 350;
      body = "Πρέπει να επιβεβαιώσεις το email σου.";
      var data = {
        body: results,
        error: {
          code: code,
          body: body,
        },
      };
      res.json(data);
    } else {
      bcrypt.compare(pass, user.password, function (err, result) {
        checkPass(result);
      });
    }
  }

  function checkPass(result) {
    if (result) {
      //console.log(user.toJSON());
      var data = user.toJSON();
      data.password = pass;
      results = {
        status: 200,
        message: "Επιτυχής είσοδος.",
        user: data,
      };
    } else {
      //console.log("password not ok");
      code = 450;
      body = "Λάθος κωδικός.";
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
});

//api that checks if the user exists and if he is verified. Also, it sends an otp for the reset of his password
app.post("/passotp", [], cors(corsOptions), async (req, res) => {
  var email = req.body.data.email;
  var code = null;
  var body = null;
  var results = null;
  // console.log();
  const user = await Users.findOne({
    where: {
      email: email,
    },
  }).catch((err) => {
    code = "unknown";
    body = "Κάτι πήγε στραβά. Παρακαλούμε προσπαθήστε ξανά αργότερα!";
    console.log("Error:" + err);
  });

  if (user === null) {
    code = 404;
    body = "Ο χρήστης δεν βρέθηκε.";
  } else if (!user.verified) {
    code = 350;
    body = "Πρέπει να επιβεβαιώσεις πρώτα το email σου.";
  } else {
    var otp = otpGenerator.generate(4, {
      digits: true,
      upperCase: false,
      alphabets: false,
      specialChars: false,
    });
    verification(otp, email);
    results = {
      success: 200,
      message: "Έλεγξε το email σου για τον ειδικό κωδικό.",
      otp: otp,
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

//service that creates a post
app.post(
  "/createpost",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    var data = req.body.data;
    var code = null;
    var body = null;
    var results = null;

    await Posts.create(data)
      .then((post) => {
        results = {
          status: 1,
          message: "Η Εγγραφή του post έγινε επιτυχώς.",
          post: post.toJSON(),
        };
        // console.log(post.moreplaces);
      })
      .catch((err) => {
        //console.log(err);
        code = err;
        body = "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα!";
      })
      .finally(() => {
        var data = {
          body: results,
          error: {
            code: code,
            body: body,
          },
        };
        res.json(data);
      });
  }
);

//service that is being called when someone is interested for a post
app.post(
  "/interested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    var data = req.body.data.email;
    var postid = req.body.data.postid;
    //console.log(postid);
    var code = null;
    var body = null;
    var results = null;

    await Posts.findOne({
      where: {
        postid: postid,
      },
    })
      .then((post) => {
        console.log(post);
      })
      .catch((err) => {
        // console.log(err);
        code = err;
        body = "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα!";
      })
      .finally(() => {
        var data = {
          body: results,
          error: {
            code: code,
            body: body,
          },
        };
        res.json(data);
      });
  }
);

http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));
