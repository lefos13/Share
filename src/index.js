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

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

//sequelize schema
const { Sequelize, DataTypes, fn } = require("sequelize");
const { nextTick } = require("process");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: false,
  dialectOptions: {
    timezone: "+03:00",
    dateStrings: true,
    typeCast: true,
  },
  timezone: "+03:00",
});
const saltRounds = 10;

const Users = require("./modules/user");
const Posts = require("./modules/post");
const PostInterested = require("./modules/postinterested");
const Reviews = require("./modules/review");

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
  var more = null;
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
      var otp = otpGenerator.generate(4, {
        digits: true,
        upperCase: false,
        alphabets: false,
        specialChars: false,
      });
      more = {
        email: email,
        otp: otp,
      };
      verification(otp, email);
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
    more: more,
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

  await Users.update(
    { verified: true },
    {
      where: {
        email: email,
      },
    }
  )
    .catch((err) => {
      console.log("Error:" + err);
    })
    .then((user) => {
      results = {
        success: 200,
        body: "Το email επιβεβαιώθηκε με επιτυχία.",
      };
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
    var data = {
      body: results,
      error: {
        code: code,
        body: body,
      },
    };

    res.json(data);
  });

  if (user === null) {
    code = 404;
    body = "Ο χρήστης δεν βρέθηκε.";
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
        console.log(err);
        res.status(500).send("Κάτι πήγε στραβά.");
      })
      .finally(() => {
        var data = {
          body: results,
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
    // console.log(req.query);
    var row = req.query;
    var results = null;
    await PostInterested.findOne({
      where: {
        email: row.email,
        postid: row.postid,
      },
    })
      .then(async (found) => {
        if (found != null) {
          res.status(405).send("Έχεις ενδιαφερθεί ήδη");
        } else {
          await PostInterested.create(row)
            .then((inter) => {
              results = inter;
              var data = {
                body: results,
                message: "Ο οδηγός θα ενημερωθεί πως ενδιαφέρθηκες",
              };
              res.json(data);
            })
            .catch((err) => {
              console.log(err);
              res.status(500).send("Κάτι πήγε στραβά!");
            });
        }
      })
      .catch((err) => {
        res.status(500).send("Κάτι πήγε στραβά: " + err);
      });
  }
);

//service that is searching posts
app.post(
  "/searchposts",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    // console.log(req.query);
    var data = req.body.data;
    var results = null;
    var array = [];
    var test = null;
    await Posts.findAndCountAll({
      where: {
        startplace: data.startplace,
        endplace: data.endplace,
      },
      order: [["date", "ASC"]],
    })
      .then(async (found) => {
        if (found.count == 0) {
          res.status(404).send("Δεν υπάρχει καμία διαδρομή.");
        } else {
          var pointer = 0;
          var checker = 20;
          var counter = 0;
          if (found.count > 20 && data.page > 1) {
            counter = data.page * 20 - 20;
            checker = data.page * 20;
            // pointer = counter;
          }
          console.log(
            "Counter:" +
              counter +
              " Checker: " +
              checker +
              " pointer: " +
              pointer +
              "  " +
              data.page +
              " count: " +
              found.count
          );
          for await (fnd of found.rows) {
            pointer++;
            if (pointer > counter && pointer <= checker) {
              await Users.findOne({
                attributes: ["fullname", "email", "photo"],
                where: {
                  email: fnd.email,
                },
              })
                .then(async (user) => {
                  var flag;
                  await PostInterested.findOne({
                    where: {
                      email: data.email,
                      postid: fnd.postid,
                    },
                  }).then((interested) => {
                    if (interested === null) {
                      flag = false;
                    } else {
                      flag = true;
                    }
                    results = {
                      user: user,
                      post: fnd,
                      interested: flag,
                    };
                    array.push(results);
                  });
                })
                .catch((err) => {
                  res.status(500).send("Κάτι πήγε στραβά");
                });
            }

            // console.log(fnd.email);
          }
          results = {
            array: array,
            length: array.length,
          };
          res.json(results);
        }
      })
      .catch((err) => {
        res.status(500).send("Κάτι πήγε στραβά: " + err);
      });
  }
);

//service pou anazhth enan xrhsth
app.get(
  "/searchuser",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    console.log(req.query);
    var data = req.query;
    await Users.findOne({
      where: {
        email: data.email,
      },
    })
      .then(async (found) => {
        await Reviews.findAndCountAll({
          attributes:
            // [sequelize.fn("count", sequelize.col("rating")), "counter"],
            [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
          where: {
            email: data.email,
          },
        })
          .then(async (revfound) => {
            var rows = revfound.rows;
            // var reviews = [];
            var total = null;
            for await (r of rows) {
              //console.log(r.toJSON().total);
              total = r.toJSON().total;
            }
            var average = total / revfound.count;
            // console.log("total: " + total + " count: " + revfound.count);
            await Reviews.findAll({
              where: {
                email: data.email,
              },
              timezone: "+03:00",
            })
              .then((rev) => {
                res.json({
                  average: average,
                  user: found,
                  reviews: rev,
                  message: "Ο χρήστης βρέθηκε",
                });
              })
              .catch((err) => {
                console.error(err);
                res.status(500).send("Ωχ κάτι πήγε στραβά.");
              });
          })
          .catch((err) => {
            console.error(err);
            res
              .status(500)
              .send("Ωχ! Κάτι πήγε στραβά στην αναζήτηση της αξιολόγησης.");
          });
      })
      .catch((err) => {
        res.status(500).send("Κάτι πήγε στραβά: " + err);
      });
  }
);

//service poy kanei review enas xrhsths se enan allon
app.post(
  "/createreview",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    var data = req.body.data;
    var results = null;

    await Reviews.create(data)
      .then((review) => {
        results = {
          message: "Η εγγραφή του review έγινε επιτυχώς.",
          review: review.toJSON(),
        };
        res.json({
          body: results,
        });
      })
      .catch((err) => {
        console.error(err);
        if (err.original.code == "ER_DUP_ENTRY")
          res.status(450).send("Έχεις κάνει ήδη review σε αυτόν τον χρήστη");
        res.status(500).send("Ωχ! Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα");
      });
  }
);

//service that return a list of posts for
app.get(
  "/getpostsperuser",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    // console.log(req.query);
    var data = req.query;
    await Posts.findAll({
      where: {
        email: data.email,
      },
    })
      .then(async (found) => {
        res.json({
          body: found,
        });
      })
      .catch((err) => {
        res.status(500).send("Κάτι πήγε στραβά: " + err);
      });
  }
);

// epistrefei lista me endiaferomenous apo ena post
app.get(
  "/getinterested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    // console.log(req.query);
    var data = req.query;
    await PostInterested.findAll({
      where: {
        postid: data.postid,
      },
    })
      .then(async (found) => {
        res.json({
          body: found,
        });
      })
      .catch((err) => {
        res.status(500).send("Κάτι πήγε στραβά: " + err);
      });
  }
);

//epistrefei to plithos twn endiaferomenwn twn post enos xrhsth
app.get(
  "/getlofinterested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    // console.log(req.query);
    var data = req.query;
    await Posts.findAll({
      where: {
        email: data.email,
      },
    })
      .then(async (found) => {
        var finalcount = 0;
        for await (fnd of found) {
          await PostInterested.count({
            where: {
              postid: fnd.postid,
            },
          }).then((count) => {
            finalcount = finalcount + count;
          });
        }
        res.status(200).send(finalcount.toString());
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Κάτι πήγε στραβά: " + err);
      });
  }
);

http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));
