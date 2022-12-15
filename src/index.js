const express = require("express");
const app = express();
var http = require("http").Server(app);
var axios = require("axios");
const { createProxyMiddleware } = require("http-proxy-middleware");
var fun = require("./utils/functions");
var path = require("path");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");
const RFC_H = "DD MMM YYYY hh:mm";
const RFC_ONLYM = "DD MMM YYYY";

//limit the size of request
var bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "5mb", type: "application/json" }));

//helmet for security
const helmet = require("helmet");
app.use(helmet());

//base64 library
const fs = require("fs");

var where = require("lodash.where");
var _ = require("lodash");
//fileserver option
// var op = {
//   dotfiles: "ignore",
//   extensions: ["jpeg", "jpg"],
// };
app.use("/images", express.static("uploads"));

//cors of course
const cors = require("cors");

//jwt
const jwt = require("jsonwebtoken");

app.use(express.json());

// package to send emails
const nodemailer = require("nodemailer");

// generator for otp codes
var otpGenerator = require("otp-generator");

//middleware for handling multipart
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    console.log(file, req.body);
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;

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
  logging: true,
  timezone: "+02:00",
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

const Users = require("./modules/user");
const Posts = require("./modules/post");
const PostInterested = require("./modules/postinterested");
const Reviews = require("./modules/review");
const SearchPost = require("./modules/searchPost");
const ToReview = require("./modules/toreview");
const FcmToken = require("./modules/fcmtoken");
const { values, hasIn, functions } = require("lodash");

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    // console.log(token);
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, TOKEN_KEY, (err, email) => {
      if (err)
        return res.json({
          body: null,
          message: "Token expired or didnt even exist",
        });
      else {
        // console.log("inside auth: " + JSON.stringify(req.body.data));
        // console.log("Athenticated: " + email.email + "lol");
        console.log("Authenticated:", email.email);
        req.body["extra"] = email.email;
      }
      next();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong!" });
  }
}
//ROUTES IMPORT

// *** ADD ***
const v1PostRouter = require("./v1/routes/postRoutes");
const v1UserRouter = require("./v1/routes/userRoutes");
const v1RequestRouter = require("./v1/routes/requestRoutes");
const v1ReviewRouter = require("./v1/routes/reviewsRoutes");
const v1NeutralRouter = require("./v1/routes/neutralRoutes");
const v1LastSearchesRouter = require("./v1/routes/lastSearchRoutes");

app.use("/reviews", v1ReviewRouter);
app.use("/requests", v1RequestRouter);
app.use("/posts", v1PostRouter);
app.use("/users", v1UserRouter);
app.use("/neutral", v1NeutralRouter);
app.use("/searches", v1LastSearchesRouter);
// === END OF ROUTES IMPORT
const saltRounds = 10;
checkconnection();

const schedule = require("node-schedule");
const { sendReport } = require("./utils/functions");

//run once a time to delete old posts from the database
const deleteOldPosts = schedule.scheduleJob("0 0 1 */1 *", async function () {
  // const deleteOldPosts = schedule.scheduleJob("*/1 * * * * *", async function () {
  try {
    // console.log("Posts are being deleted");
    var today = new Date("2022-12-01");
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(
      today.getMonth() + 1 > 3
        ? today.getMonth() + 1 - 3
        : 12 - 3 + today.getMonth() + 1
    ).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();

    today.getMonth() + 1 <= 3 ? yyyy-- : yyyy;

    today = yyyy + "-" + mm + "-" + dd;
    console.log(today);
    //find all posts that their enddate is older than curdate
    await Posts.findAll({
      where: { enddate: { [Op.lt]: today } },
    }).then(async (res) => {
      if (res.length != 0) {
        for await (r of res) {
          //find interested of post
          const postInt = await PostInterested.findAll({
            where: {
              postid: r.postid,
            },
          });
          if (postInt.length != 0) {
            for await (p of postInt) {
              //destroy interested
              p.destroy();
            }
          }

          //destroy post
          r.destroy();
        }
      }
    });
  } catch (err) {
    console.error(err);
  }
});

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
  try {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL,
        pass: PASSEMAIL,
      },
      port: 465,
      host: "smtp.gmail.com",
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
        "</b></h1>", // html body bale enan diko s xristi tha kanw ena register
    });
  } catch (err) {
    console.error(err);
  }
}

//rest api service that registers the user to the database, checks if he already exists and sends an otp for verification.
app.post("/register", [], cors(corsOptions), async (req, res) => {
  try {
    // crypto the password
    var data = req.body.data;
    data["verified"] = true;
    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(data.password, salt, async function (err, hash) {
        var data2 = req.body.data;
        data2.password = hash;
        // console.log(data.email);

        //generate otp to send to the user's mail
        // var otp = otpGenerator.generate(4, {
        //   digits: true,
        //   upperCase: false,
        //   alphabets: false,
        //   specialChars: false,
        // });

        var results = null;
        let base64 = data2.photo;
        const buffer = Buffer.from(base64, "base64");
        // console.log(buffer);
        fs.writeFileSync("uploads/" + data2.email + ".jpeg", buffer);
        // fs.writeFileSync("test.jpeg", buffer);
        data2.photo = "";

        // console.log(base64);
        await Users.create(data)
          .then((user) => {
            // verification(otp, data2.email);
            results = {
              message: "Εγγραφήκατε επιτυχώς!",
              user: data,
            };
            var data = {
              body: results,
            };

            res.json(data);
          })
          .catch((err) => {
            // console.log(err);
            // res.json(err);
            if (err.parent.errno == 1062) {
              let data = {
                message: "Βρέθηκε λογαριασμός με το ίδιο email.",
              };
              res.status(405).json(data);
            } else {
              console.log(err);
              let data = {
                message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
              };
              res.status(500).json(data);
            }
          });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
    });
  }
});

//update profile
app.post(
  "/updateProfile",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // crypto the password
      var data = req.body.data;
      let email = req.body.extra;
      // console.log("test Log: ", data, email);
      // console.log(email + "test");

      const user = await Users.update(
        {
          mobile: data.mobile,
          fullname: data.fullname,
          age: data.age,
          facebook: data.facebook,
          instagram: data.instagram,
          car: data.car,
          cardate: data.cardate,
        },
        {
          where: {
            email: email,
          },
        }
      ).catch((err) => {
        // console.log("Update profil: ", err);
        throw err;
      });

      // console.log(user);
      if (data.photo != null) {
        let base64 = data.photo;
        const buffer = Buffer.from(base64, "base64");
        // console.log(buffer);
        fs.writeFileSync("uploads/" + email + ".jpeg", buffer);
      } else {
        // console.log("photo is null");
      }
      res.json({ message: "Η ενημέρωση έγινε επιτυχώς!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//rest api service that creates the token for the user. Also checks if he is verified and sends the right message
app.post("/createtoken", [], cors(corsOptions), async (req, res) => {
  try {
    var email = req.body.data.email;
    console.log("'" + email + "'");
    const user = await Users.findOne({
      where: {
        email: email,
      },
    }).catch((err) => {
      console.log("Error:" + err);
    });

    console.log(user.toJSON());
    if (user == null) {
      res.status(404).json({
        message: "Ο χρήστης δεν βρέθηκε.",
      });
    } else {
      if (user.verified == false) {
        var otp = otpGenerator.generate(4, {
          digits: true,
          upperCase: false,
          alphabets: false,
          specialChars: false,
        });

        let response = {
          message: "Πρέπει να επιβεβαιώσεις το email σου.",
          email: email,
          otp: otp,
        };
        verification(otp, email);

        res.json(response);
      } else {
        //create token
        payload = {
          email: email,
          data: new Date(),
        };
        const accessToken = jwt.sign(payload, TOKEN_KEY, { expiresIn: "60d" });
        // console.log(accessToken);
        res.json({
          message: "Επιτυχής δημιουργία του token",
          accessToken: accessToken,
        });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
    });
  }
});

//service that updates the user's password (with encryption)
app.post("/updateUserPass", [], cors(corsOptions), async (req, res) => {
  try {
    //console.log(req.body);
    var email = req.body.data.email;
    var password = req.body.data.pass;
    // var email = "asdasd";
    // var password = "asdasdd";

    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        var newpass = hash;
        const user = await Users.update(
          { password: newpass },
          { where: { email: email } }
        ).catch((err) => {
          console.log(err);
          res.status(500).json("Κάτι πήγε στραβά!");
        });

        if (user === null) {
          res.status(404).json({
            message: "Ο χρήστης δεν βρέθηκε.",
          });
        } else {
          res.json({
            message: "Ο κωδικός ανανεώθηκε.",
          });
        }
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
    });
  }
});

//service that updates the user's verification to true
app.post("/verify", [], cors(corsOptions), async (req, res) => {
  try {
    var email = req.body.data.email;

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
        res.status(500).json({ message: "Κάτι πήγε στραβά." });
      })
      .then((user) => {
        res.json({
          message: "Το email επιβεβαιώθηκε με επιτυχία.",
        });
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
    });
  }
});

//service that verifies the login process of the user
app.post("/login", [authenticateToken], cors(corsOptions), async (req, res) => {
  try {
    var email = req.body.data.email;
    var pass = req.body.data.pass;
    console.log(req.body);
    let fcmToken = req.body.data.fcmToken;

    var body = null;

    await Users.findOne({
      where: {
        email: email,
      },
    })
      .then((user) => {
        // console.log(user);
        if (user == null) {
          res.status(404).json({
            message: "Ο Χρήστης δεν βρέθηκε.",
          });
        } else {
          if (user.verified === false) {
            message = "Πρέπει να επιβεβαιώσεις το email σου.";
            res.json({
              message: message,
            });
          } else {
            // console.log("I AM IN user.verified === false ELSE");
            bcrypt.compare(pass, user.password, function (err, result) {
              checkPass(result, user);
            });
          }
        }
      })
      .catch((err) => {
        console.log("Error:" + err);
      });

    function checkPass(result, user) {
      if (result) {
        //console.log(user.toJSON());
        let data = user.toJSON();
        data.password = null;

        if (fcmToken != null) {
          fcmData = {
            email: email,
            fcmToken: fcmToken,
          };

          FcmToken.findOne({
            where: {
              email: email,
            },
          })
            .then((fcmUser) => {
              if (fcmUser != null) {
                fcmUser.update({ fcmToken: fcmToken }).catch((err) => {
                  throw err;
                });
              } else {
                FcmToken.create(fcmData).catch((err) => {
                  throw err;
                });
              }
            })
            .catch((err) => {
              throw err;
            });
        }

        data.photo = "images/" + data.email + ".jpeg";
        res.json({
          message: "Επιτυχής είσοδος.",
          user: data,
          forceUpdate: false,
        });
      } else {
        body = "Λάθος κωδικός.";
        res.status(405).json({ message: body });
      }
    }
  } catch (err) {
    console.error("LOGIN ERROR: ", err);
    res.status(500).json({
      message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
    });
  }
});

app.post(
  "/setVisible",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      var email = req.body.extra;

      const user = await Users.findOne({
        where: {
          email: email,
        },
      }).catch((err) => {
        throw err;
      });

      if (user.isVisible == true) {
        user.update({ isVisible: false });
        res.json({
          message: "Απόκρυψη κινητού τηλεφώνου από όλους",
        });
      } else {
        user.update({ isVisible: true });
        res.json({
          message: "Εμφανιση κινητου τηλεφώνου στους εγκεκριμένους χρήστες",
        });
      }
    } catch (err) {
      console.error("setVisible ERROR: ", err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//api that checks if the user exists and if he is verified. Also, it sends an otp
app.post("/passotp", [], cors(corsOptions), async (req, res) => {
  try {
    var email = req.body.data.email;

    var otp = otpGenerator.generate(4, {
      digits: true,
      upperCase: false,
      alphabets: false,
      specialChars: false,
    });
    // send email for verification
    verification(otp, email);
    res.json({
      message: "Έλεγξε το email σου για τον ειδικό κωδικό.",
      otp: otp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
    });
  }
});

//service that creates a post
app.post(
  "/createpost",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      var data = req.body.data;

      setTime(0);
      var datetime = new Date().today() + " " + "00:00:01";
      console.log(datetime);
      // setTime(1);
      var firsttime = new Date().today() + " " + "23:59:59";
      console.log(firsttime);

      var postdate = new Date().today() + " " + new Date().timeNow();
      data.date = postdate;
      if (data.withReturn == false) {
        data.returnStartDate = moment();
        data.returnEndDate = moment();
      }
      // fix gia to enddate==null
      if (data.enddate == null) {
        data.enddate = data.startdate;
      }
      // console.log("Dates limit:", firsttime, datetime, postdate);
      // ========================= PRAGMATIKO KOMMATI - ME ELEGXO GIA TRIA MAX POSTS
      await Posts.count({
        where: {
          date: { [Op.between]: [datetime, firsttime] },
          email: data.email,
        },
      }).then(async (count) => {
        console.log(count);
        if (count >= 3) {
          res.status(405).json({
            message: "Έχεις κάνει ήδη 3 post σήμερα! Προσπάθησε ξανά αύριο.",
            body: null,
          });
        } else {
          await Posts.create(data)
            .then((post) => {
              // console.log(post.moreplaces);
              var data = {
                body: post.toJSON(),
                message: "Η υποβολή πραγματοποιήθηκε επιτυχώς.",
              };
              res.json(data);
              //Firebase newRide notification
              pushNotifications(post);
            })
            .catch((err) => {
              console.log(err);
              res
                .status(400)
                .json({ message: "Κάτι πήγε στραβά.", body: null });
            });
        }
      });

      // auto to kommati kanei mono eggrafi opote vgalto apo sxolio otan theliseis

      // await Posts.create(data)
      //   .then((post) => {
      //     // console.log(post.moreplaces);
      //     // var data = {
      //     //   body: post.toJSON(),
      //     //   message: "Η υποβολή πραγματοποιήθηκε επιτυχώς.",
      //     // };
      //     res.json({ message: "Επιτυχής δημιουργία!" });

      //     // =========== καλώ function για το Push notification των request.
      //     pushNotifications(post);
      //     // ===========
      //   })
      //   .catch((err) => {
      //     console.log(err);
      //     res.status(400).json({ message: "Κάτι πήγε στραβά.", body: null });
      //   });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

const pushNotifications = async (post) => {
  try {
    let arrayToNotify = [];
    // GATHER ALL THE REQUESTS WITH THE SPECIFIC STARTCOORD AND THE ENDCOORD OF THE POST THAT HAS BEEN CREATED
    const allRequests = await SearchPost.findAll({
      where: {
        startcoord: post.startcoord,
        endcoord: post.endcoord,
      },
    }).catch((err) => {
      console.log("Inside function that pushes notifications, threw error!");
      throw err;
    });

    // FLAG TO SEND OR NOT THE NOTIFICATION
    let toSendNotification = false;

    if (allRequests.length > 0) {
      // CASE THAT THE POST HAS THE RIGHT ENDPLACE OF A REQUEST
      // GATHER THE USERS TO BE INFORMED
      toSendNotification = true;
      for await (req of allRequests) {
        arrayToNotify.push(req.email);
      }
    }

    // IF THE POST HASN'T THE ENDPLACE OF THE REQUESTS, CHECK FOR MOREPLACES IF THEY INCLUDE THE ENDPLACE OF THE REQUEST ----
    const allRequests2 = await SearchPost.findAll({
      where: {
        startcoord: post.startcoord,
      },
    }).catch((err) => {
      console.log("Inside function that pushes notifications, threw error!");
      throw err;
    });

    // IF THE ENDPLACE OF A REQUEST IS INSIDE THE MOREPLACES, GATHER THE USERS THAT I NEED TO NOTIFY
    if (allRequests2.length > 0) {
      for await (req of allRequests2) {
        let moreplaces = IsJsonString(post.moreplaces)
          ? JSON.parse(post.moreplaces)
          : post.moreplaces;
        for await (place of moreplaces) {
          if (place.placecoords == req.endcoord) {
            toSendNotification = true;

            // array with the users that need to be informed that a post of their request has been created
            arrayToNotify.push(req.email);
          }
        }
      }
    }

    // HERE YOU SEND THE NOTIFICATIONS
    if (toSendNotification) {
      // Data for the notification, postid and the array of users
      fun.newRide(post.postid, arrayToNotify, post.email);
    } else {
      console.log("No request is found to be valid for the new post");
    }
  } catch (err) {
    console.log("Error inside try and catch!!!!!", err);
  }
  // console.log("Inside func", post);
};

//service that creates a request
app.post(
  "/createRequest",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      let data = req.body.data;
      let email = req.body.extra;

      let curTime = new Date();
      data.created_at = curTime;
      data.email = email;
      // curTime.setMonth(curTime.getMonth() - 1);
      const count = await SearchPost.count({
        where: {
          email: email,
        },
      }).catch((err) => {
        console.log("error in count", err);
        throw err;
      });

      const countDubl = await SearchPost.count({
        where: {
          email: email,
          startcoord: data.startcoord,
          endcoord: data.endcoord,
        },
      }).catch((err) => {
        console.log("error in count", err);
        throw err;
      });

      //check if you have more than 3 requests
      if (count < 3 && countDubl == 0) {
        const request = await SearchPost.create(data).catch((err) => {
          console.log("Error sto creation of request");
          throw err;
        });
        // console.log(request);
        res.json({ request: request, message: "Επιτυχής δημιουργία!" });
      } else if (countDubl > 0) {
        res.status(405).json({
          message: "Έχεις ήδη αίτηση διαδρομής με αυτές τις τοποθεσίες!",
        });
      } else {
        res
          .status(405)
          .json({ message: "Έχεις ήδη τρεις διαδρομές που ψάχνεις!" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//api that returns a list of all the requests of a user. (Maximum 3)
app.get(
  "/getRequests",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // let data = req.body.data;
      let email = req.body.extra;

      const requests = await SearchPost.findAll({
        where: {
          email: email,
        },
      }).catch((err) => {
        console.log(err);
        throw err;
      });

      if (requests.length > 0) {
        for await (r of requests) {
          const fixedDate = await fixDate(new Date(r.created_at));
          r.dataValues.created_at = fixedDate.dateMonthDay;
        }
        res.json({ requests: requests });
      } else {
        res
          .status(404)
          .json({ message: "Δεν βρέθηκαν αναζητήσεις διαδρομών!" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//service that deletes a request of a user
app.post(
  "/deleteRequest",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      let data = req.body.data;
      let email = req.body.extra;

      const reqDel = await SearchPost.destroy({
        where: {
          postSearchId: data.postSearchId,
          email: email,
        },
      }).catch((err) => {
        console.log("error kata thn diagrafh enos request");
        throw err;
      });

      // console.log(reqDel);
      reqDel == 1
        ? res.json({ message: "Η διαγραφή έγινε επιτυχώς!" })
        : res.status(404).json({ message: "Το request δεν υπάρχει!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//service that is being called when someone is interested for a post
app.post(
  "/interested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      let extra = req.body.extra;
      // console.log(req.query);
      var results = null;
      setTime(0);
      var curtime = new Date().today() + " " + new Date().timeNow();
      // console.log(curtime);
      setTime(1);
      var starttime = new Date().today() + " " + new Date().timeNow();
      // console.log(starttime);
      var row = {
        email: req.body.data.email,
        postid: req.body.data.postid,
        date: curtime,
        isVerified: false,
        isNotified: false,
        ownerNotified: false,
      };
      row["date"] = curtime;

      //CHECK IF THE CLIENT IS THE OWNER OF THE POST
      const checkPost = await Posts.count({
        where: {
          postid: row.postid,
          email: row.email,
        },
      }).catch((err) => {
        throw err;
      });

      if (checkPost > 0) {
        throw 1;
      }

      await PostInterested.findOne({
        where: {
          email: row.email,
          postid: row.postid,
        },
      })
        .then(async (found) => {
          if (found != null) {
            await PostInterested.destroy({
              where: {
                email: row.email,
                postid: row.postid,
              },
            }).then(() => {
              res.status(200).json({
                body: null,
                message: "Ακυρώθηκε το ενδιαφέρον σου",
              });
            });
          } else {
            await PostInterested.count({
              where: {
                email: row.email,
                date: { [Op.between]: [starttime, curtime] },
              },
            })
              .then(async (count) => {
                // console.log("COUNT INTERESTED: ", res);
                if (count == 9) {
                  res.status(405).json({
                    message:
                      "Έχεις δηλώσει ήδη 10 φορές ενδιαφέρον. Δοκίμασε πάλι αύριο!",
                    body: null,
                  });
                } else {
                  await PostInterested.create(row)
                    .then(async (inter) => {
                      results = inter;
                      var data = {
                        body: results,
                        message: "Ο οδηγός θα ενημερωθεί πως ενδιαφέρθηκες",
                      };
                      res.json(data);

                      const postForFunction = await Posts.findOne({
                        where: {
                          postid: row.postid,
                        },
                      }).catch((err) => {
                        throw err;
                      });
                      //Function to push notification to the owner of the post === FIREBASE
                      fun.toNotifyOwner(
                        postForFunction.email,
                        extra,
                        row.postid
                      );
                    })
                    .catch((err) => {
                      console.log(err);
                      res
                        .status(400)
                        .json({ message: "Κάτι πήγε στραβά.", body: null });
                    });
                }
              })
              .catch((err) => {
                res.status(500).json({
                  message: "Κάτι πήγε στραβά.",
                  body: "Επίπεδο count" + err,
                });
              });
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(400).json({ message: "Κάτι πήγε στραβά.", body: null });
        });
    } catch (err) {
      if (err == 1) {
        res
          .status(405)
          .json({ message: "Δεν μπορείς να ενδιαφερθείς για δικό σου Post!" });
      } else {
        console.error(err);
        res.status(500).json({
          message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
        });
      }
    }
  }
);

//service that is searching posts
app.post(
  "/searchposts",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;
      var results = null;
      var array = [];

      // ==========  if startdate is null, then search from the current date to a month after today.
      if (data.startdate == null) {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, "0");
        var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
        var mm2 = String(today.getMonth() + 2).padStart(2, "0"); //January is 0!
        var yyyy = today.getFullYear();

        today = yyyy + "-" + mm + "-" + dd;
        var lastday = yyyy + "-" + mm2 + "-" + dd;
        data.startdate = today;
        data.enddate = lastday;
        console.log("dates if client sends no startdate", today, lastday);
      }
      // =============

      // MEGA query for the results
      await Posts.findAndCountAll({
        where: {
          // minimum cost
          costperseat: { [Op.lte]: data.cost },
          // email different than one that do the search
          email: { [Op.ne]: data.email },
          [Op.and]: [
            // arxikos proorismos h syntetagmenes
            {
              [Op.or]: [
                { startplace: data.startplace },
                { startcoord: data.startcoord },
              ],
            },
            // elegxos na peftei h arxikh hmeromhnia tou post anamesa sthn arxikh kai telikh toy xrhsth
            // ή na peftei h telikh hmeromhnia tou post anamesa sthn arxikh h telikh hmeromhnia tou xrhsth
            // ή na peftei h arxikh KAI h telikh hmeromhnia toy xrhsth na peftei anamesa sthn arxikh KAI telikh hmeromhnia tou post
            {
              [Op.or]: [
                { startdate: { [Op.between]: [data.startdate, data.enddate] } },
                { enddate: { [Op.between]: [data.startdate, data.enddate] } },
                {
                  [Op.and]: [
                    { startdate: { [Op.gte]: data.startdate } },
                    { enddate: { [Op.lte]: data.enddate } },
                  ],
                },
              ],
            },
            // elegxos an o telikos proorismos einai proorismos pou uparxei entos twn stasewn tou xrhsth
            // h an o telikos proorismos tou xrhsth einai telikos proorismos tou post antistoixa oi syntetagmenes
            {
              [Op.or]: [
                // sequelize.literal(
                //   `json_contains(moreplaces->'$[*].place', json_array("` +
                //     data.endplace +
                //     `")) OR json_contains(moreplaces->'$[*].placecoords', json_array("` +
                //     data.endcoord +
                //     `"))`
                // ),
                sequelize.literal(
                  `JSON_CONTAINS(JSON_EXTRACT(moreplaces, "$[*].place"), '"` +
                    data.endplace +
                    `"') OR json_contains(JSON_EXTRACT(moreplaces, '$[*].placecoords'), '"` +
                    data.endcoord +
                    `"')`
                ),
                {
                  [Op.or]: [
                    { endplace: data.endplace },
                    { endcoord: data.endcoord },
                  ],
                },
              ],
            },
          ],
        },
        order: [["date", "DESC"]],
      })
        .then(async (found) => {
          if (found.count == 0) {
            console.log(found.count);
            res.status(404).json({ message: "Δεν υπάρχει καμία διαδρομή" });
          } else {
            for await (fnd of found.rows) {
              if (IsJsonString(fnd.moreplaces)) {
                fnd.moreplaces = JSON.parse(fnd.moreplaces);

                let testDate = new Date(fnd.startdate);

                fnd.dataValues.startdate = await fixOnlyMonth(testDate);

                testDate = new Date(fnd.enddate);

                fnd.dataValues.enddate = await fixOnlyMonth(testDate);
              }

              await Users.findOne({
                attributes: {
                  exclude: [
                    "password",
                    "verified",
                    "facebook",
                    "instagram",
                    "mobile",
                  ],
                },
                where: {
                  email: fnd.email,
                },
              })
                .then(async (user) => {
                  var flag;
                  let extraData = await insertAver(user);
                  user.dataValues = { ...user.dataValues, ...extraData };
                  // console.log(user);

                  await PostInterested.findOne({
                    where: {
                      email: data.email,
                      postid: fnd.postid,
                    },
                  })
                    .then((interested) => {
                      if (interested === null) {
                        flag = false;
                      } else {
                        flag = true;
                      }
                      results = {
                        user: user.toJSON(),
                        imagePath: "images/" + fnd.email + ".jpeg",
                        post: fnd,
                        interested: flag,
                      };
                      array.push(results);
                    })
                    .catch((err) => {
                      console.error(err);
                      res
                        .status(400)
                        .json({ message: "Κάτι πήγε στραβά.", body: null });
                    });
                })
                .catch((err) => {
                  console.error(err);
                  res
                    .status(400)
                    .json({ message: "Κάτι πήγε στραβά.", body: null });
                });
              // }

              // console.log(fnd.email);
            }

            if (data.age != null) {
              // afairese ta post twn xrhstwn pou einai panw apo data.age_end
              array = _.filter(array, (obj) => {
                return parseInt(obj.user.age) <= data.age_end;
              });
              // afairese ta post twn xrhstwn pou einai katw apo data.age
              array = _.filter(array, (obj) => {
                return parseInt(obj.user.age) >= data.age;
              });
            }
            if (data.car != null) {
              //afairese ta post twn xrhstwn pou den exoun to dhlwmeno amaksi
              array = _.filter(array, (obj) => {
                return obj.user.car == data.car;
              });
            }
            if (data.cardate != null) {
              //afairese ta post twn xrhstwn pou den exoun thn katallhlh xronologia amaksiou
              array = _.filter(array, (obj) => {
                data.cardate = parseInt(data.cardate, 10);
                obj.user.cardate = parseInt(obj.user.cardate, 10);
                return parseInt(obj.user.cardate) >= data.cardate;
              });
            }
            if (data.gender != null) {
              //afairese ta post twn xrhstwn pou den exoun to katallhlo fulo
              array = _.filter(array, (obj) => {
                return obj.user.gender == data.gender;
              });
            }
            if (data.withReturn != null) {
              //afairese ta post twn xrhstwn pou den exoun epistrofh
              array = _.filter(array, (obj) => {
                let postStartDate = new Date(obj.post.returnStartDate);
                let postEndDate = new Date(obj.post.returnEndDate);
                let searchStartDate = new Date(data.returnStartDate);
                let searchEndDate = new Date(data.returnEndDate);

                // console.log(postStartDate, postEndDate);
                // console.log(
                //   postStartDate,
                //   postEndDate,
                //   (searchStartDate.getTime() >= postStartDate.getTime() &&
                //     searchStartDate.getTime() <= postEndDate.getTime()) ||
                //     (searchEndDate.getTime() <= postEndDate.getTime() &&
                //       searchEndDate.getTime() >= postStartDate.getTime()) ||
                //     (searchStartDate.getTime() <= postStartDate.getTime() &&
                //       searchEndDate.getTime() >= postEndDate.getTime())
                // );

                return (
                  obj.post.withReturn == true &&
                  ((searchStartDate.getTime() >= postStartDate.getTime() &&
                    searchStartDate.getTime() <= postEndDate.getTime()) ||
                    (searchEndDate.getTime() <= postEndDate.getTime() &&
                      searchEndDate.getTime() >= postStartDate.getTime()) ||
                    (searchStartDate.getTime() <= postStartDate.getTime() &&
                      searchEndDate.getTime() >= postEndDate.getTime()))
                );
              });
            }
            //fix return dates
            if (data.petAllowed != null) {
              array = _.filter(array, (obj) => {
                return obj.post.petAllowed == data.petAllowed;
              });
            }

            //PAGINATION
            var skipcount = 0;
            var takecount = 10;
            if (data.page > 1) skipcount = data.page * 10 - 10;
            var finalarr = _.take(_.drop(array, skipcount), takecount);
            var counter = 0;
            //FORMAT CHANGE OF TIMSTAMP
            for await (ps of finalarr) {
              const fixedDate = await fixDate(ps.post.date);

              ps.post.dataValues.date =
                fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;

              let testDate = new Date(ps.post.returnStartDate);

              ps.post.dataValues.returnStartDate = await fixOnlyMonth(testDate);

              let testDate2 = new Date(ps.post.returnEndDate);

              ps.post.dataValues.returnEndDate = await fixOnlyMonth(testDate2);

              // console.log(JSON.stringify(ar));
              // console.log(ar.post.returnEndDate, ar.post.returnStartDate);
              // console.log(fixOnlyMonth(testDate), fixOnlyMonth(testDate2));
            }
            //CHECK IF ARRAY IS EMPTY AND SEND THE RESULTS
            if (finalarr.length == 0) {
              res.status(404).json({
                message: "Δεν υπάρχει καμία διαδρομή.",
                body: "filtra",
              });
            } else {
              // console.log(array[0].post.newdate);
              var mod = array.length % 10;
              var totallength = 1;
              mod == 0
                ? (totallength = array.length / 10)
                : (totallength = array.length / 10 - mod / 10 + 1);
              results = {
                postUser: finalarr,
                totalPages: totallength,
                pageLength: finalarr.length,
                // test: array,
              };

              res.json({ body: results, message: null });
            }
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(400).json({ message: "Κάτι πήγε στραβά", body: null });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
//service pou anazhta enan xrhsth
app.post(
  "/searchuser",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;
      var searcherEmail = req.body.extra;
      // console.log("Token Email: " + JSON.stringify(tokenEmail));
      // let isUserReviwable = await Posts.findOne({
      //   where: {
      //     email: tokenEmail,
      //     emailreviewer: data.emailreviewer,
      //   },
      // }).catch((err) => {
      //   res.status(500).json({ message: "Κάτι πήγε στραβά.", body: null });
      // });

      await Users.findOne({
        attributes: {
          exclude: ["password"],
        },
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
              var today = new Date();
              today = await getCurDate(6);

              let hasRequests = false;
              let hasPosts = false;
              let hasFavourites = false;
              let hasInterested = false;
              let hasIntPosts = false;

              // ================ MEGA case that the person that sees the profil is the same user as the profil
              if (data.email == searcherEmail) {
                //psaxnei na dei an exei requests
                const requests = await SearchPost.count({
                  where: {
                    email: data.email,
                  },
                }).catch((err) => {
                  throw err;
                });
                // console.log(requests, "My requests");

                requests > 0 && data.email == searcherEmail
                  ? (hasRequests = true)
                  : null;

                //psaxnei na dei an exei posts
                const post = await Posts.findOne({
                  where: {
                    email: data.email,
                    enddate: { [Op.gte]: today },
                  },
                });

                post != null && data.email == searcherEmail
                  ? (hasPosts = true)
                  : (hasPosts = false);

                //elegxos an exei agaphmena
                const countFavourites = await Posts.count({
                  where: {
                    email: data.email,
                    isFavourite: true,
                  },
                }).catch((err) => {
                  throw err;
                });

                countFavourites > 0 && data.email == searcherEmail
                  ? (hasFavourites = true)
                  : (hasFavourites = false);

                //psaxnei an endiaferetai gia kapoio post
                const interested = await PostInterested.findAll({
                  where: {
                    email: data.email,
                  },
                }).catch((err) => {
                  console.error(err);
                });

                if (interested.length != 0 && data.email == searcherEmail) {
                  for await (int of interested) {
                    let dateForInt = await getCurDate(0);
                    let countP = await Posts.count({
                      where: {
                        postid: int.postid,
                        email: { [Op.ne]: data.email },
                        enddate: {
                          [Op.gte]: dateForInt,
                        },
                      },
                    });
                    if (countP > 0) {
                      hasInterested = true;
                      break;
                    }
                  }
                }

                //psaxnei an exei endiaferomenous
                today = await getCurDate(0);
                const posts = await Posts.findAll({
                  where: {
                    email: data.email,
                    enddate: { [Op.gte]: today },
                  },
                }).catch((err) => {
                  console.error(err);
                });
                let isAny = 0;
                console.log(posts.length);
                if (posts.length != 0) {
                  for await (one of posts) {
                    const interested2 = await PostInterested.findOne({
                      where: {
                        postid: one.postid,
                      },
                    }).catch((err) => {
                      console.error(err);
                    });

                    if (interested2 != null) {
                      isAny++;
                      break;
                    }
                  }
                }

                isAny > 0 ? (hasIntPosts = true) : (hasIntPosts = false);
              }
              // =============== End of section of user == searchuser

              // ==================== section if the one who searches can review the profil ======================
              let reviewable = false;

              /*
              HERE I MUST WRITE THE NEW CODE FOR THE REVIEWABLE
              */

              let dateToCheck = moment()
                .date(moment().get("date") - 1)
                .format("MM-DD-YYYY");
              // console.log(dateToCheck);

              // FIND THE ROWS THAT I AM A PASSENGER OR DRIVER AND THE POST IS ALREADY FINISHED BY A DAY
              let possibleReviews = await ToReview.findAll({
                where: {
                  [Op.and]: [
                    {
                      [Op.or]: [
                        { driverEmail: searcherEmail },
                        { passengerEmail: searcherEmail },
                      ],
                    },
                    {
                      [Op.or]: [
                        { driverEmail: data.email },
                        { passengerEmail: data.email },
                      ],
                    },
                  ],
                  endDate: { [Op.lte]: dateToCheck },
                },
              }).catch((err) => {
                throw err;
              });
              // CHECK IF THE USER HAS ALREADY DONE HIS PART OF THE REVIEW
              possibleReviews = _.filter(possibleReviews, (obj) => {
                if (
                  obj.passengerEmail == searcherEmail &&
                  obj.driverEmail == data.email &&
                  obj.passengerDone == true
                ) {
                  return false;
                } else if (
                  obj.driverEmail == searcherEmail &&
                  obj.passengerEmail == data.email &&
                  obj.driverDone == true
                ) {
                  return false;
                } else return true;
              });

              // console.log(possibleReviews);
              if (possibleReviews.length > 0 && searcherEmail != data.email) {
                reviewable = true;
              }

              //================= Section for isVisible... Check if the user can see the other's user phone ================
              let isVisible = false;
              console.log("CHECK: " + searcherEmail + " AND " + data.email);
              if (searcherEmail != data.email) {
                // && found.isVisible == true
                //CHECK IF THE PHONE SOULD BE VISIBLE
                let visibleDate = new Date();

                // =========== Search for posts for both users that their enddate is greater or equal to the current date ==========
                const posts = await Posts.findAll({
                  where: {
                    email: { [Op.or]: [data.email, searcherEmail] },
                    enddate: { [Op.gte]: visibleDate },
                  },
                }).catch((err) => {
                  throw err;
                });

                // For each post of both users, find interest that is verified by the owner of the post
                for await (p of posts) {
                  console.log("FOUND POST TO CHECK FOR IS VISIBLE!");
                  const pInt = await PostInterested.findOne({
                    where: {
                      postid: p.postid,
                      email: { [Op.or]: [data.email, searcherEmail] },
                      isVerified: true,
                    },
                  }).catch((err) => {
                    throw err;
                  });

                  // IF you find a verification, then make isVisible=true
                  if (pInt != null) {
                    console.log(
                      "FOUND THAT ONE OF TWO ARE INTERESTED TO " + p.postid
                    );
                    isVisible = true;
                  }
                }
              } else if (data.email == searcherEmail) {
                isVisible = true;
              } else isVisible = false;
              //================= END OF SECTION
              //data response
              res.json({
                user: found,
                average: average,
                count: revfound.count,
                hasFavourites: hasFavourites, // boolean if the user has any favourites
                hasRequests: hasRequests, //boolean if the user has any post requsts
                hasPosts: hasPosts, //boolean gia to an o xrhshs exei posts
                hasInterested: hasInterested, // boolean gia to an o xrhsths endiaferetai gia posts
                interestedForYourPosts: hasIntPosts, // boolean gia to an uparxoun endiaferomenoi twn post tou user
                reviewAble: reviewable, //boolean gia to an o xrhsths mporei na kanei review se afto to profil
                isVisible: isVisible, //Boolean for the phone to be visible or not.
                image: "images/" + data.email + ".jpeg",
                message: "Ο χρήστης βρέθηκε",
              });
            })
            .catch((err) => {
              console.error(err);
              res.status(400).json({
                message: "Κάτι πήγε στραβά κατά την αναζήτηση.",
                body: null,
              });
            });
        })
        .catch((err) => {
          res.status(400).json({ message: "Κάτι πήγε στραβά.", body: null });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//service pou epistrefei ta reviews paginated
app.post(
  "/getReviews",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;
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
          console.log("total: " + total + " count: " + revfound.count);

          await Reviews.findAndCountAll({
            where: {
              email: data.email,
            },
          })
            .then(async (rev) => {
              let counter = 0;
              for await (r of rev.rows) {
                let fixDate = new Date(r.dataValues.createdAt);
                r.dataValues.createdAt = await fixOnlyMonth(fixDate);

                fixDate = new Date(r.dataValues.updatedAt);
                r.dataValues.updatedAt = await fixOnlyMonth(fixDate);
                // console.log(r.emailreviewer);
                r.dataValues.revId = counter;
                counter++;

                let user = await Users.findOne({
                  where: {
                    email: r.emailreviewer,
                  },
                }).catch((err) => {
                  console.error(err);
                });
                if (user == null) {
                  r.dataValues["fullname"] = "Ο χρήστης δεν υπάρχει";
                  r.dataValues.imagepath = "Η εικόνα δεν υπάρχει";
                } else {
                  r.dataValues["fullname"] = user.fullname;
                  r.dataValues.imagepath =
                    "images/" + r.emailreviewer + ".jpeg";
                  // console.log(r);
                }
              }

              //PAGINATION
              var skipcount = 0;
              var takecount = 20;
              if (data.page > 1) skipcount = data.page * 20 - 20;
              var finalarr = _.take(_.drop(rev.rows, skipcount), takecount);
              let mod = rev.count % 20;
              // console.log(mod);
              let totallength = 1;
              mod == 0
                ? (totallength = rev.count / 20)
                : (totallength = rev.count / 20 - mod / 20 + 1);
              res.json({
                body: {
                  reviews: finalarr,
                  average: average,
                  total_pages: totallength,
                  page_length: finalarr.length,
                },
                message: "Αξιολογήσεις, Page: " + data.page,
              });
            })
            .catch((err) => {
              console.error(err);
              res
                .status(400)
                .json({ message: "Κάτι πήγε στραβά.", body: null });
            });
        })
        .catch((err) => {
          console.error(err);
          res.status(400).json({
            message: "Κάτι πήγε στραβά κατά την αναζήτηση.",
            body: null,
          });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//service poy kanei review enas xrhsths se enan allon
app.post(
  "/createreview",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      var data = req.body.data;
      var results = null;
      const revExist = await Reviews.findOne({
        where: {
          email: data.email,
          emailreviewer: data.emailreviewer,
        },
      }).catch((err) => {
        throw err;
      });

      if (revExist == null) {
        await Reviews.create(data)
          .then(async (review) => {
            const possibleReview = await ToReview.findOne({
              where: {
                [Op.and]: [
                  {
                    [Op.or]: [
                      { driverEmail: review.emailreviewer },
                      { passengerEmail: review.emailreviewer },
                    ],
                  },
                  {
                    [Op.or]: [
                      { driverEmail: review.email },
                      { passengerEmail: review.email },
                    ],
                  },
                ],
              },
            }).catch((err) => {
              throw err;
            });

            if (possibleReview == null) {
              throw " H KATAGRAFH STON PINAKA TO REVIEWS DEN UPARXEI";
            }

            // if the reviewer is the driver then update the driver
            if (possibleReview.driverEmail == review.emailreviewer) {
              console.log("Driver done review");
              await possibleReview
                .update({
                  driverDone: true,
                })
                .catch((err) => {
                  throw err;
                });

              // console.log(possibleReview);
            } else {
              console.log("Passenger done Review");
              //if the reviewer is the passenger update the passenger
              await possibleReview
                .update({
                  passengerDone: true,
                })
                .catch((err) => {
                  throw err;
                });
            }

            await Reviews.findAndCountAll({
              attributes:
                // [sequelize.fn("count", sequelize.col("rating")), "counter"],
                [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
              where: {
                email: data.email,
              },
            })
              .then(async (results) => {
                var rows = results.rows;

                var total = null;
                for await (r of rows) {
                  // console.log(results.count);
                  total = r.toJSON().total;
                }
                var average = total / results.count;

                //Section where i update the toreview row

                const possibleReview = await ToReview.findOne({
                  [Op.or]: [
                    { driverEmail: data.emailreviewer },
                    { passengerEmail: data.emailreviewer },
                  ],
                }).catch((err) => {
                  throw err;
                });

                if (possibleReview == null) {
                  throw err + " H KATAGRAFH STON PINAKA TO REVIEWS DEN UPARXEI";
                }
                // if the reviewer is the driver then update the driver
                if (possibleReview.driverEmail == data.emailreviewer) {
                  await possibleReview
                    .update({
                      driverDone: true,
                    })
                    .catch((err) => {
                      throw err;
                    });
                } else {
                  //if the reviewer is the passenger update the passenger
                  await possibleReview
                    .update({
                      passengerDone: true,
                    })
                    .catch((err) => {
                      throw err;
                    });
                }
                //==========
                res.json({
                  review: review,
                  average: average,
                  count: results.count,
                  message: "Η αξιολόγηση έγινε επιτυχώς!",
                });
              })
              .catch((err) => {
                console.error(err);
                res
                  .status(500)
                  .json({ message: "Κάτι πήγε στραβά.", body: null });
              });
          })
          .catch((err) => {
            console.error(err);
            if (err.original.code == "ER_DUP_ENTRY") {
              res.status(405).json({
                message: "Έχεις κάνει ήδη αξιολόγηση σε αυτόν τον χρήστη.",
                body: null,
              });
            } else {
              res
                .status(500)
                .json({ message: "Κάτι πήγε στραβά.", body: null });
            }
          });
      } else {
        // CASE THAT THE REVIEW IS TO BE UPDATED.

        //Section where i update the toreview row!!!!!!!!!!!!1

        const possibleReview = await ToReview.findOne({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { driverEmail: data.emailreviewer },
                  { passengerEmail: data.emailreviewer },
                ],
              },
              {
                [Op.or]: [
                  { driverEmail: data.email },
                  { passengerEmail: data.email },
                ],
              },
            ],
          },
        }).catch((err) => {
          throw err;
        });

        if (possibleReview == null) {
          throw err + " H KATAGRAFH STON PINAKA TO REVIEWS DEN UPARXEI";
        }

        //update the review
        await revExist
          .update({
            rating: data.rating,
            text: data.text,
          })
          .catch((err) => {
            throw err;
          });

        // if the reviewer is the driver then update the driver
        if (possibleReview.driverEmail == data.emailreviewer) {
          await possibleReview
            .update({
              driverDone: true,
            })
            .catch((err) => {
              throw err;
            });
        } else {
          //if the reviewer is the passenger update the passenger
          await possibleReview
            .update({
              passengerDone: true,
            })
            .catch((err) => {
              throw err;
            });
        }

        const results = await Reviews.findAndCountAll({
          attributes:
            // [sequelize.fn("count", sequelize.col("rating")), "counter"],
            [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
          where: {
            email: data.email,
          },
        }).catch((err) => {
          throw err;
        });

        var rows = results.rows;

        var total = null;
        for await (r of rows) {
          // console.log(results.count);
          total = r.toJSON().total;
        }
        var average = total / results.count;
        res.json({
          review: revExist,
          average: average,
          count: results.count,
          message: "Η αξιολόγηση ανανεώθηκε επιτυχώς!",
        });
        //==========
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

const getCurDate = async (dif) => {
  try {
    var today = new Date();
    let df = 1 - dif;
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + df).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();

    //an to prohgoymeno eksamhno peftei se prohgoymenh xronia
    if (dif > today.getMonth() + 1) {
      df = 12 - dif + today.getMonth() + 1;
      mm = String(df).padStart(2, "0");
      yyyy = yyyy - 1;
    }
    // console.log(df, dd, mm, yyyy);
    today = yyyy + "-" + mm + "-" + dd;
    return today;
  } catch (err) {
    console.error(err);
  }
};

//service pou epistrefei mia lista apo ta posts tou user
app.post(
  "/getPostsUser",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;

      var today = new Date();
      today = await getCurDate(6);
      // console.log(today);
      await Posts.findAndCountAll({
        where: {
          email: data.email,
          enddate: { [Op.gte]: today },
        },
        order: [["date", "DESC"]],
      })
        .then(async (found) => {
          //console.log(found);
          let rows = found.rows;
          let count = found.count;
          // console.log(count);
          // for await (r of rows) {
          //   // console.log(r.toJSON());
          //   // let total = r.toJSON().total;
          //   // console.log(total);
          // }
          let skipcount = 0;
          let takecount = 10;
          if (data.page > 1) skipcount = data.page * 10 - 10;
          let finalarr = _.take(_.drop(rows, skipcount), takecount);
          let mod = count % 10;
          // console.log(mod);
          let totallength = 1;
          mod == 0
            ? (totallength = count / 10)
            : (totallength = count / 10 - mod / 10 + 1);
          let array = [];
          for await (post of finalarr) {
            if (IsJsonString(post.moreplaces)) {
              post.moreplaces = JSON.parse(post.moreplaces);
            }
            const fixedDate = await fixDate(post.date);
            post.dataValues.date =
              fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;

            let nnDate = new Date(post.startdate);
            post.dataValues.startdate = await fixOnlyMonth(nnDate);
            nnDate = new Date(post.enddate);
            post.dataValues.enddate = await fixOnlyMonth(nnDate);

            let testDate = new Date(post.returnStartDate);

            post.dataValues.returnStartDate = await fixOnlyMonth(testDate);

            let testDate2 = new Date(post.returnEndDate);

            post.dataValues.returnEndDate = await fixOnlyMonth(testDate2);

            let image = "images/" + post.email + ".jpeg";

            //find user of post
            let user = await Users.findOne({
              attributes: {
                exclude: [
                  "password",
                  "verified",
                  "facebook",
                  "instagram",
                  "mobile",
                ],
              },
              where: {
                email: post.email,
              },
            }).catch((err) => {
              console.error(err);
            });

            // insert review data to user data
            let extraData = await insertAver(user);
            user.dataValues = { ...user.dataValues, ...extraData };

            let interested = await PostInterested.findOne({
              where: {
                email: post.email,
                postid: post.postid,
              },
            }).catch((err) => {
              // console.error("provlima sto get posts user");
              throw err;
            });

            let flag;
            interested == null ? (flag = false) : (flag = true);

            // endiaferomoi gia ena sygekrimeno post
            const countInt = await PostInterested.count({
              where: {
                postid: post.postid,
                email: { [Op.ne]: data.email },
              },
              // order: [["date", "DESC"]],
            }).catch((err) => {
              console.error(err);
            });
            let moreUsers = false;
            // let finalInt = _.take(_.drop(interested, 0), 10);
            if (countInt > 0) {
              moreUsers = true;
              message = "Βρέθηκαν Ενδιαφερόμενοι!";
            }

            let results = {
              user: user,
              imagePath: image,
              post: post,
              hasMoreUsers: moreUsers,
              countUsers: countInt,
              interested: flag,
            };
            array.push(results);
          }

          res.json({
            postUser: array,
            totalPages: totallength,
            totalLength: count,
            pageLength: finalarr.length,
          });
          // res.json({ ok: "ok" });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: "Κάτι πήγε στραβά.", body: null });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//service that returns a post by its id
app.get(
  "/getPostPerId",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var postid = req.query.postid;
      let email = req.body.extra;

      console.log(postid);

      let post = await Posts.findOne({
        where: {
          postid: postid,
        },
      }).catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Κάτι πήγε στραβά.", body: null });
      });

      if (IsJsonString(post.moreplaces)) {
        post.moreplaces = JSON.parse(post.moreplaces);
      }

      //set the language
      moment.locale("el"); // or "en" depends on the header
      //get the dates from the post
      let newDate = moment(post.dataValues.date);
      let startDate = moment(post.startdate);
      let endDate = moment(post.enddate);
      let returnStartDate = moment(post.returnStartDate);
      let returnEndDate = moment(post.returnEndDate);

      //convert to RFC format
      post.dataValues.date = newDate.format(RFC_H);
      post.dataValues.startdate = startDate.format(RFC_ONLYM);
      post.dataValues.enddate = endDate.format(RFC_ONLYM);
      post.dataValues.returnStartDate = returnStartDate.format(RFC_ONLYM);
      post.dataValues.returnEndDate = returnEndDate.format(RFC_ONLYM);

      // CHECK IF THE SEARCHER IS INTERESTED
      let interested = false;
      const postInt = await PostInterested.findOne({
        where: {
          email: email,
          postid: postid,
        },
      }).catch((err) => {
        throw err;
      });
      // if the searcher is interested then true
      postInt == null ? (interested = false) : (interested = true);

      // find creator of post
      const user = await Users.findOne({
        attributes: {
          exclude: ["password", "verified", "mobile"],
        },
        where: {
          email: post.email,
        },
      }).catch((err) => {
        throw err;
      });

      // get average and count from reviews and insert them into the object
      let extraData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...extraData };

      // change cardate format
      user.cardate = parseInt(user.cardate, 10);

      res.json({
        imagePath: "images/" + post.email + ".jpeg",
        interested: interested,
        post: post,
        user: user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//service poy epistrefei ta post gia ta opoia einai interested o user
app.post(
  "/getInterestedPerUser",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;
      await PostInterested.findAll({
        where: {
          email: data.email,
        },
      })
        .then(async (found) => {
          let array = [];
          for await (postI of found) {
            let curDate = await getCurDate(0);

            let post = await Posts.findOne({
              where: {
                postid: postI.postid,
                email: { [Op.ne]: data.email },
                enddate: {
                  [Op.gte]: curDate,
                },
              },
            }).catch((err) => {
              console.error(err);
              res.status(500).json({ message: "Κάτι πήγε στραβά!" });
            });

            if (post != null) {
              if (IsJsonString(post.moreplaces)) {
                post.moreplaces = JSON.parse(post.moreplaces);
              }
              //diorthwseis hmeromhniwn
              const fixedDate = await fixDate(post.date);
              post.dataValues.date =
                fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
              // console.log(postI);
              let nnDate = new Date(post.startdate);
              post.dataValues.startdate = await fixOnlyMonth(nnDate);
              nnDate = new Date(post.enddate);
              post.dataValues.enddate = await fixOnlyMonth(nnDate);

              let testDate = new Date(post.returnStartDate);

              post.dataValues.returnStartDate = await fixOnlyMonth(testDate);

              let testDate2 = new Date(post.returnEndDate);

              post.dataValues.returnEndDate = await fixOnlyMonth(testDate2);

              const intDate = await fixDate(postI.date);
              postI.dataValues.date =
                intDate.dateMonthDay + " " + intDate.hoursMinutes;

              // sugxwneush post kai stoixeia endiaferomenou
              if (postI.isNotified == false) {
                postI.update({ isNotified: true });
                post.dataValues = {
                  ...post.dataValues,
                  ...{ withColor: true },
                };
              } else
                post.dataValues = {
                  ...post.dataValues,
                  ...{ withColor: false },
                };

              let tempPost = {
                ...post.dataValues,
                ...{ piid: postI.piid, dateOfInterest: postI.date },
              };
              // console.log(obj[counter]);
              let user = await Users.findOne({
                attributes: {
                  exclude: [
                    "password",
                    "verified",
                    "facebook",
                    "instagram",
                    "mobile",
                  ],
                },
                where: {
                  email: post.dataValues.email,
                },
              }).catch((err) => {
                console.error("line 1344 " + err);
              });
              console.log(post.dataValues.email);
              let extraData = await insertAver(user);

              user.dataValues = { ...user.dataValues, ...extraData };
              let image = "images/" + post.email + ".jpeg";

              let results = {
                user: user,
                imagePath: image,
                post: tempPost,
                interested: true,
              };
              array.push(results);
            }
          }
          if (array.length == 0) {
            res.status(404).json({ message: "Nothing found" });
          } else {
            res.json({
              postUser: array,
              message: "No pagination",
            });
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: "Κάτι πήγε στραβά.", body: null });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

// epistrefei lista twn endiaferomenwn twn post enos xrhsth
app.post(
  "/getInterested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;
      let curDate = await getCurDate(0);
      // console.log(curDate);

      await Posts.findAll({
        where: {
          email: data.email,
          enddate: {
            [Op.gte]: curDate,
          },
        },
        order: [["date", "DESC"]],
      })
        .then(async (posts) => {
          let array = [];
          let message = "Δεν βρέθηκαν ενδιαφερόμενοι";
          let isAny = 0;
          for await (post of posts) {
            if (IsJsonString(post.moreplaces)) {
              post.moreplaces = JSON.parse(post.moreplaces);
            }
            let fixedDate = await fixDate(post.date);

            post.dataValues.date =
              fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;

            let nnDate = new Date(post.startdate);
            post.dataValues.startdate = await fixOnlyMonth(nnDate);
            nnDate = new Date(post.enddate);
            post.dataValues.enddate = await fixOnlyMonth(nnDate);

            let testDate = new Date(post.returnStartDate);

            post.dataValues.returnStartDate = await fixOnlyMonth(testDate);

            let testDate2 = new Date(post.returnEndDate);

            post.dataValues.returnEndDate = await fixOnlyMonth(testDate2);
            // endiaferomoi gia ena sygekrimeno post
            const interested = await PostInterested.count({
              where: {
                postid: post.postid,
                email: { [Op.ne]: data.email },
              },
              // order: [["date", "DESC"]],
            }).catch((err) => {
              console.error(err);
            });
            let moreUsers = false;
            // let finalInt = _.take(_.drop(interested, 0), 10);

            if (interested > 0) {
              moreUsers = true;
              isAny++;
              message = "Βρέθηκαν Ενδιαφερόμενοι!";
              let image = "images/" + post.email + ".jpeg";
              let results = {
                post: post,
                users: interested,
                imagePath: image,
                hasMoreUsers: moreUsers,
              };
              array.push(results);
            }
          }

          if (isAny > 0) {
            message = "Βρέθηκαν ενδιαφερόμενοι";
            let skipcount = 0;
            let takecount = 10;
            if (data.page > 1) skipcount = data.page * 10 - 10;
            let finalarr = _.take(_.drop(array, skipcount), takecount);
            let mod = isAny % 10;
            // console.log(mod);
            let totallength = 1;
            mod == 0
              ? (totallength = isAny / 10)
              : (totallength = isAny / 10 - mod / 10 + 1);
            res.json({
              postUser: finalarr,
              totalPages: totallength,
              totalLength: isAny,
              pageLength: finalarr.length,
              message: message,
            });
          } else {
            message = "Δεν βρέθηκαν ενδιαφερόμενοι";
            res.status(404).json({
              message: message,
            });
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: "Κάτι πήγε στραβά.", body: null });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

// epistrefei lista twn endiaferomenwn enos post
app.post(
  "/getIntPost",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;
      var extra = req.body.extra;
      // console.log(req.body.extra, extra);
      await Posts.findOne({
        where: {
          postid: data.postid,
        },
      })
        .then(async (posts) => {
          if (IsJsonString(posts.moreplaces)) {
            posts.moreplaces = JSON.parse(posts.moreplaces);
          }
          const fixedDate = await fixDate(posts.date);
          posts.dataValues.date =
            fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
          let nnDate = new Date(posts.startdate);
          posts.dataValues.startdate = await fixOnlyMonth(nnDate);
          nnDate = new Date(posts.enddate);
          posts.dataValues.enddate = await fixOnlyMonth(nnDate);

          let testDate = new Date(posts.returnStartDate);

          posts.dataValues.returnStartDate = await fixOnlyMonth(testDate);

          let testDate2 = new Date(posts.returnEndDate);

          posts.dataValues.returnEndDate = await fixOnlyMonth(testDate2);
          let message = "Βρέθηκαν ενδιαφερόμενοι";
          let isAny = 0;
          // euresh endiafermonwn gia to post
          const interested = await PostInterested.findAll({
            where: {
              postid: posts.postid,
            },
          }).catch((err) => {
            console.error(err);
          });

          let fullpost;
          let allUsers = [];

          // ean vrethikan endiaferomenoi
          if (interested.length != 0) {
            //gia kathe endiaferomeno
            for await (one of interested) {
              isAny++;
              // pare ta stoixeia tou endiaferomenou
              const user = await Users.findOne({
                attributes: {
                  exclude: [
                    "password",
                    "verified",
                    "facebook",
                    "instagram",
                    "mobile",
                  ],
                },
                where: {
                  email: one.email,
                },
              }).catch((err) => {
                console.error(err);
              });

              if (user != null) {
                user.dataValues.imagePath = "images/" + user.email + ".jpeg";
                let testdata = await insertAver(user);
                user.dataValues = { ...user.dataValues, ...testdata };
                user.dataValues.isVerified = one.isVerified;
                user.dataValues.piid = one.piid;
                // console.log(JSON.stringify(testdata));
                allUsers.push(user);
              } else {
                allUsers.push({
                  email: "Fake User",
                  fullname: one.email,
                  car: "BMW",
                  cardate: "2016",
                  gender: "male",
                  age: "25",
                  photo: "1",
                  imagePath: "images/lefterisevagelinos1996@gmail.com.jpeg",
                  average: 5,
                  count: 100,
                  isVerified: one.isVerified,
                  piid: one.piid,
                });
              }
              fullpost = { ...posts.dataValues };
            }
          }

          let image = "images/" + extra + ".jpeg";

          if (isAny > 0) {
            message = "Βρέθηκαν ενδιαφερόμενοι";
            let skipcount = 0;
            let takecount = 10;
            if (data.page > 1) skipcount = data.page * 10 - 10;
            let finalarr = _.take(_.drop(allUsers, skipcount), takecount);
            let mod = isAny % 10;
            // console.log(mod);
            let totallength = 1;
            mod == 0
              ? (totallength = isAny / 10)
              : (totallength = isAny / 10 - mod / 10 + 1);
            res.json({
              users: finalarr,
              post: fullpost,
              postImage: image,
              totalPages: totallength,
              totalLength: isAny,
              pageLength: finalarr.length,
              curPage: data.page,
              message: message,
            });
          } else {
            message = "Δεν βρέθηκαν ενδιαφερόμενοι";
            res.status(404).json({
              message: message,
            });
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: "Κάτι πήγε στραβά.", body: null });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//delete a post from database
app.post(
  "/deletePost",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // console.log(req.query);
      var data = req.body.data;
      await Posts.destroy({
        where: {
          postid: data.postid,
        },
      })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: "Κάτι πήγε στραβά!" });
        })
        .then(async (results) => {
          console.log(results);
          await PostInterested.destroy({
            where: {
              postid: data.postid,
            },
          }).catch((err) => {
            console.log(err);
          });
          if (results == 0) {
          }
          results == 0
            ? res.status(404).json({ message: "Το post δεν υπάρχει" })
            : res.json({ message: "Το post διαγράφηκε" });
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//service that deletes an interested from the db
app.post(
  "/deleteInterested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      var data = req.body.data;
      await PostInterested.destroy({
        where: {
          piid: data.piid,
        },
      })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: "Κάτι πήγε στραβά!" });
        })
        .then((results) => {
          console.log(results);
          if (results == 0) {
          }
          results == 0
            ? res.status(404).json({ message: "Ο ενδιαφερόμενος δεν υπάρχει" })
            : res.json({ message: "Ο ενδιαφερόμενος διαγράφηκε" });
        });
    } catch (err) {
      console.error("sto try and catch", err);
      res.status(500).json({ message: "Κάτι πήγε στραβά" });
    }
    // console.log(req.query);
  }
);

//service that verifies an insterested or unverfies him if already verified
app.post(
  "/verInterested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      var data = req.body.data;
      var extra = req.body.extra;
      const results = await PostInterested.findOne({
        where: {
          piid: data.piid,
        },
      }).catch((err) => {
        throw err;
      });

      const allIntersted = await PostInterested.count({
        where: {
          postid: data.postid,
          isVerified: true,
        },
      }).catch((err) => {
        throw err;
      });

      // console.log(allIntersted);
      const post = await Posts.findOne({
        where: {
          postid: data.postid,
        },
      }).catch((err) => {
        throw err;
      });
      console.log("test   " + post);
      if (allIntersted < post.numseats || results.isVerified == true) {
        if (results.isVerified == false) {
          results.update({ isVerified: true }).catch((err) => {
            throw err;
          });

          // Create possible review notification

          //Find if a possible review already exists
          const toReviewExists = await ToReview.findOne({
            where: {
              [Op.and]: [
                {
                  [Op.or]: [
                    { driverEmail: post.email },
                    { passengerEmail: post.email },
                  ],
                },
                {
                  [Op.or]: [
                    { driverEmail: results.email },
                    { passengerEmail: results.email },
                  ],
                },
              ],
            },
          }).catch((err) => {
            throw err;
          });

          //If there is no possible review, create a new one
          if (toReviewExists == null) {
            await ToReview.create({
              driverEmail: post.email,
              passengerEmail: results.email,
              endDate: post.enddate,
              piid: results.piid,
            });
          } else {
            //if a review is done already check if the driver and the passenger have the right emails.

            //if the possibleReview has the post owner as the passenger, change the row so that the owner become the driver
            // and the interested user become the passenger.
            if (
              toReviewExists.driverEmail != post.email &&
              toReviewExists.driverEmail == results.email
            ) {
              await toReviewExists
                .update({
                  driverEmail: post.email,
                  passengerEmail: results.email,
                  piid: results.piid,
                })
                .catch((err) => {
                  throw err;
                });
            }

            //if a review is done already by the owner of the post and the owner is marked as driver
            //update him as false so he can review again the same user
            if (
              toReviewExists.driverDone == true &&
              toReviewExists.driverEmail == post.email
            ) {
              await toReviewExists
                .update({
                  driverDone: false,
                  passengerDone: false,
                  piid: data.piid,
                })
                .catch((err) => {
                  throw err;
                });
            }
          }

          res.json({
            message: "Επιτυχής έγκριση ενδιαφερόμενου!",
          });

          // push notification to the user that was interested ---- FIREBASE
          fun.toNotifyTheVerified(results.email, post.postid, post.email);
        } else {
          //unverify the interested user
          results.update({ isVerified: false, isNotified: false });
          // delete possible review notification
          // check if the unverification should destroy the possible review
          // get all posts of current passenger
          // console.log("Find the posts of: ", results.email);
          const passengerPosts = await Posts.findAll({
            where: {
              email: results.email,
            },
          }).catch((err) => {
            throw err;
          });
          let flagCounter = 0;

          //Check if the current driver was ever interested for a post of current passenger
          // console.log("Find the interested of:", post.email);
          for await (p of passengerPosts) {
            const intP = await PostInterested.findOne({
              where: {
                postid: p.postid,
                email: post.email,
                isVerified: true,
              },
            }).catch((err) => {
              throw err;
            });

            // if you find such a post, then update the possible review and dont delete it
            if (intP != null) {
              // console.log("Found such a post", intP.toJSON());
              // console.log("New driver:", p.email);
              // console.log("New passenger:", intP.email);
              flagCounter++;
              ToReview.update(
                {
                  driverEmail: p.email,
                  passengerEmail: intP.email,
                  piid: intP.piid,
                  endDate: p.enddate,
                },
                {
                  where: {
                    piid: results.piid,
                  },
                }
              ).catch((err) => {
                throw err;
              });
            }
          }

          if (flagCounter == 0) {
            await ToReview.destroy({
              where: {
                piid: results.piid,
              },
            }).catch((err) => {
              throw err;
            });
          }
          res.json({
            message: "Ακύρωση έγκρισης ενδιαφερόμενου!",
          });
        }
      } else {
        res.status(405).json({
          message: "Έχεις καλύψει πλήρως τις διαθέσιμες θέσεις!",
        });
      }
    } catch (err) {
      console.error("!!!!!!!!!!!!!!sto verInterested: ", err);
      res.status(500).json({ message: "Κάτι πήγε στραβά" });
    }
    // console.log(req.query);
  }
);

//service for notification for reviews
app.get(
  "/notifyMe",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // let data = req.body.data;
      let extra = req.body.extra;

      let dateToCheck = new Date();
      dateToCheck.setDate(dateToCheck.getDate() + -1);
      dateToCheck =
        dateToCheck.getFullYear() +
        "-" +
        String(dateToCheck.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dateToCheck.getDate()).padStart(2, "0");
      console.log("Date to check:", dateToCheck);

      // FIND THE ROWS THAT I AM A PASSENGER OR DRIVER AND THE POST IS ALREADY FINISHED BY A DAY
      let possibleReviews = await ToReview.findAll({
        where: {
          [Op.or]: [{ passengerEmail: extra }, { driverEmail: extra }],
          endDate: { [Op.lte]: dateToCheck },
        },
      }).catch((err) => {
        throw err;
      });

      // CHECK IF THE USER HAS ALREADY DONE HIS PART OF THE REVIEW
      possibleReviews = _.filter(possibleReviews, (obj) => {
        if (obj.passengerEmail == extra && obj.passengerDone == true) {
          return false;
        } else if (obj.driverEmail == extra && obj.driverDone == true) {
          return false;
        } else return true;
      });

      let arrayOfUsers = [];

      //SCAN THE LIST AND GATHER THE USERS THAT THE CLIENT NEED TO REVIEW
      for await (val of possibleReviews) {
        // console.log(val.toJSON());
        console.log(val.driverEmail, extra);

        // IF YOU ARE WERE A PASSENGER
        if (val.passengerEmail == extra) {
          const user = await Users.findOne({
            attributes: {
              exclude: ["password"],
            },
            where: {
              email: val.driverEmail,
            },
          }).catch((err) => {
            throw err;
          });

          const reviewExist = await Reviews.findOne({
            where: {
              emailreviewer: extra,
              email: val.driverEmail,
            },
          }).catch((err) => {
            throw err;
          });

          let toEdit = false;
          if (reviewExist != null) {
            toEdit = true;
          }

          user.dataValues.toEdit = toEdit;
          user.dataValues.imagePath = "images/" + user.email + ".jpeg";
          let res = await insertAver(user);
          user.dataValues.average = res.average;
          user.dataValues.count = res.count;
          // console.log(user);

          arrayOfUsers.push(user);
        } else {
          //IF THE USER WAS THE DRIVER
          const user = await Users.findOne({
            attributes: {
              exclude: ["password"],
            },
            where: {
              email: val.passengerEmail,
            },
          }).catch((err) => {
            throw err;
          });

          const reviewExist = await Reviews.findOne({
            where: {
              emailreviewer: extra,
              email: val.passengerEmail,
            },
          }).catch((err) => {
            throw err;
          });

          let toEdit = false;
          if (reviewExist != null) {
            toEdit = true;
          }

          if (user == null) {
            console.log(
              "Ο XRHSTHS " + val.passengerEmail + "  DEN UPARXEI!!!!"
            );
          }
          user.dataValues.toEdit = toEdit;
          user.dataValues.imagePath = "images/" + user.email + ".jpeg";
          let res = await insertAver(user);
          user.dataValues.average = res.average;
          user.dataValues.count = res.count;
          // console.log(user);
          // console.log(user.toJSON());

          arrayOfUsers.push(user);
          // console.log("Inside truth: ", arrayOfUsers);
        }
      }

      // console.log(arrayOfUsers);

      if (arrayOfUsers.length > 0) res.json({ usersToReview: arrayOfUsers });
      else
        res
          .status(404)
          .json({ message: "Δεν βρέθηκαν χρήστες ως προς αξιολόγηση" });
    } catch (err) {
      console.error("!!!!!!!!!!!!!!sto notifyme: ", err);
      res.status(500).json({ message: "Κάτι πήγε στραβά" });
    }

    // console.log(req.query);
  }
);

app.post(
  "/sendReport",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      let extra = req.body.extra;
      let text = req.body.text;
      let flag = await fun.sendReport(text, extra);
      // await sendReport(text, extra);
      flag == true
        ? res.json({ message: "Ευχαριστούμε για το feedback" })
        : res.status(500).json({ message: "Κάτι πήγε λάθος!" });
    } catch (err) {
      console.error("!!!!!!!!!!!!!!sto sendReport: ", err);
      res.status(500).json({ message: "Κάτι πήγε στραβά" });
    }
  }
);

//get terms of user and service
app.post(
  "/getTerms",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      let email = req.body.extra;
      res.sendFile(path.join(__dirname + "/terms/terms.txt"));
    } catch (err) {
      console.error("!!!!!!!!!!!!!!sto sendReport: ", err);
      res.status(500).json({ message: "Κάτι πήγε στραβά" });
    }
  }
);

app.post(
  "/handleFavourite",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      let email = req.body.extra;
      let postid = req.body.data.postid;
      const countall = await Posts.count({
        where: {
          isFavourite: true,
          email: email,
        },
      }).catch((err) => {
        throw err;
      });

      const count = await Posts.count({
        where: {
          postid: postid,
          isFavourite: true,
          email: email,
        },
      }).catch((err) => {
        throw err;
      });

      if (countall < 5) {
        if (count > 0) {
          await Posts.update(
            {
              isFavourite: false,
            },
            { where: { postid: postid } }
          )
            .catch((err) => {
              throw err;
            })
            .then((data) => {
              res.json({
                // data: data,
                message: "Το post αφαιρέθηκε από τα αγαπημένα σας!",
              });
            });
        } else {
          await Posts.update(
            {
              isFavourite: true,
            },
            { where: { postid: postid } }
          )
            .catch((err) => {
              throw err;
            })
            .then((data) => {
              res.json({
                // data: data,
                message: "Το post προστέθηκε στα αγαπημένα σας!",
              });
            });
        }
      } else {
        if (count > 0) {
          await Posts.update(
            {
              isFavourite: false,
            },
            { where: { postid: postid } }
          )
            .catch((err) => {
              throw err;
            })
            .then((data) => {
              res.json({
                // data: data,
                message: "Το post αφαιρέθηκε από τα αγαπημένα σας!",
              });
            });
        } else {
          res.status(405).json({ message: "Έχεις ήδη 5 αγαπημένα posts" });
        }
      }
    } catch (err) {
      console.error("!!!!!!!!!!!!!!sto makeFavourite: ", err);
      res.status(500).json({ message: "Κάτι πήγε στραβά" });
    }
  }
);

app.get(
  "/getFavourites",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      let email = req.body.extra;

      const user = await Users.findOne({
        attributes: {
          exclude: ["password", "verified", "facebook", "instagram", "mobile"],
        },
        where: {
          email: email,
        },
      }).catch((err) => {
        throw err;
      });

      let extraData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...extraData };

      const allFavourites = await Posts.findAll({
        where: {
          email: email,
          isFavourite: true,
        },
        order: [["date", "DESC"]],
      }).catch((err) => {
        throw err;
      });

      if (allFavourites.length == 0) {
        throw { status: 404 };
      }
      let allResults = [];
      for await (post of allFavourites) {
        let nnDate = new Date(post.startdate);
        post.dataValues.startdate = await fixOnlyMonth(nnDate);
        nnDate = new Date(post.enddate);
        post.dataValues.enddate = await fixOnlyMonth(nnDate);

        let testDate = new Date(post.returnStartDate);

        post.dataValues.returnStartDate = await fixOnlyMonth(testDate);

        let testDate2 = new Date(post.returnEndDate);

        post.dataValues.returnEndDate = await fixOnlyMonth(testDate2);
        const fixedDate = await fixDate(post.date);
        post.dataValues.date =
          fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
        allResults.push({
          user: user,
          post: post,
          imagePath: "images/" + post.email + ".jpeg",
          interested: false,
        });
      }

      res.json({ favourites: allResults });
    } catch (err) {
      if (err.status == 404) {
        res.status(404).json({ message: "Δεν βρέθηκαν αγαπημένα posts" });
      } else {
        console.error("!!!!!!!!!!!!!!sto getFavourites: ", err);
        res.status(500).json({ message: "Κάτι πήγε στραβά" });
      }
    }
  }
);

const API_SERVICE_URL = `https://maps.googleapis.com/maps/api/place/`;
const API_SERVICE_URL2 = `https://maps.googleapis.com/maps/api/`;

//google proxy for autocomplete
app.use(
  "/autocomplete/json",
  [authenticateToken],
  cors(corsOptions),
  createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: async function (path, req) {
      // const should_add_something = await httpRequestToDecideSomething(path);
      console.log(path);
      // path = "input=volos&key=" + GOOGLE_KEY;
      // console.log(path);
      // path = "input=volos&key=AIzaSyA4hRBFRUrIE-XtMMb1Wp_CjiVWxue6nwY";
      path += "&components=country:gr&types=(cities)&key=" + GOOGLE_KEY;
      return path;
    },
  })
);

//google proxy for place details
app.use(
  "/details/json",
  [authenticateToken],
  cors(corsOptions),
  createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: async function (path, req) {
      // const should_add_something = await httpRequestToDecideSomething(path);
      console.log(path);
      // path = "input=volos&key=" + GOOGLE_KEY;
      // console.log(path);
      // path = "input=volos&key=AIzaSyA4hRBFRUrIE-XtMMb1Wp_CjiVWxue6nwY";
      path += "&fields=geometry&key=" + GOOGLE_KEY;
      return path;
    },
  })
);

//google proxy for place details
app.use(
  "/geocode/json",
  [authenticateToken],
  cors(corsOptions),
  createProxyMiddleware({
    target: API_SERVICE_URL2,
    changeOrigin: true,
    pathRewrite: async function (path, req) {
      // const should_add_something = await httpRequestToDecideSomething(path);
      // console.log(path);
      // path = "input=volos&key=" + GOOGLE_KEY;
      // console.log(path);
      // path = "input=volos&key=AIzaSyA4hRBFRUrIE-XtMMb1Wp_CjiVWxue6nwY";
      path += "&result_type=locality&key=" + GOOGLE_KEY;
      console.log(path);
      return path;
    },
  })
);

//service poy anevazei eikona sto server
app.post(
  "/upload",
  upload.single("upload"),
  // cors(corsOptions),
  function (req, res) {
    // req.file is the name of your file in the form above, here 'uploaded_file'
    // req.body will hold the text fields, if there were any
    console.log(req.headers);
    console.log(req.file);
    console.log(JSON.stringify(req.body));

    res.json({ message: "Το upload έγινε επιτυχώς" });
  }
);

function setTime(extrad) {
  Date.prototype.today = function () {
    let fixValue = 0;
    let fixYear = 0;
    let fixMonth = 0;
    if (this.getDate() - extrad < 1) {
      if (this.getMonth() == 1) {
        fixValue = 28;
      } else if (
        this.getMonth() == 0 ||
        this.getMonth() == 2 ||
        this.getMonth() == 4 ||
        this.getMonth() == 6 ||
        this.getMonth() == 7 ||
        this.getMonth() == 9 ||
        this.getMonth() == 11
      ) {
        fixValue = 31;
      } else {
        fixValue = 30;
      }
    }

    let moreM = 0;
    fixValue > 0 ? (moreM = 1) : null;
    if (this.getMonth() + 1 - moreM < 1) {
      fixYear = 1;
      fixMonth = 11;
      moreM = 0;
    }
    return (
      this.getFullYear() -
      fixYear +
      "-" +
      (this.getMonth() + 1 + fixMonth - moreM < 10 ? "0" : "") +
      (this.getMonth() + 1 + fixMonth - moreM) +
      "-" +
      (this.getDate() - extrad + fixValue < 10 ? "0" : "") +
      (this.getDate() - extrad + fixValue)
    );
  };
  // For the time now
  Date.prototype.timeNow = function () {
    return (
      (this.getHours() < 10 ? "0" : "") +
      this.getHours() +
      ":" +
      (this.getMinutes() < 10 ? "0" : "") +
      this.getMinutes() +
      ":" +
      (this.getSeconds() < 10 ? "0" : "") +
      this.getSeconds()
    );
  };
}

const insertAver = async (user) => {
  try {
    let results = await Reviews.findAndCountAll({
      attributes:
        // [sequelize.fn("count", sequelize.col("rating")), "counter"],
        [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
      where: {
        email: user.email,
      },
    }).catch((err) => {
      throw err;
    });

    if (results.count != 0) {
      let rows = results.rows;
      let total = null;
      for await (r of rows) {
        total = r.toJSON().total;
      }
      let average = total / results.count;
      let rounded = average.toFixed(1);
      rounded = parseFloat(rounded);
      let count = results.count;
      return {
        average: rounded,
        count: count,
      };
    } else {
      let average = 0;
      let count = 0;
      return {
        average: average,
        count: count,
      };
    }
  } catch (err) {
    console.error("inside InsertAver()" + err);
  }
};

const fixDate = async (date) => {
  try {
    let tempd = date;

    let dateonly =
      (tempd.getDate() < 10 ? "0" : "") +
      tempd.getDate() +
      " " +
      tempd.toLocaleString("el-GR", { month: "short" }) +
      " " +
      tempd.getFullYear();
    let newtime =
      (tempd.getHours() < 10 ? "0" : "") +
      tempd.getHours() +
      ":" +
      (tempd.getMinutes() < 10 ? "0" : "") +
      tempd.getMinutes();
    // const test = tempd.toLocaleString("el-GR", { month: "short" });
    // console.log(test);
    return {
      dateMonthDay: dateonly,
      hoursMinutes: newtime,
    };
  } catch (err) {
    console.log(err);
  }
};

const fixOnlyMonth = async (date) => {
  try {
    // console.log(date);
    let tempd = date;
    let dateonly =
      (tempd.getDate() < 10 ? "0" : "") +
      tempd.getDate() +
      " " +
      tempd.toLocaleString("el-GR", { month: "short" }) +
      " " +
      tempd.getFullYear();
    // console.log("finaldate: " + dateonly);
    return dateonly;
  } catch (err) {
    console.log(err);
  }
};

http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));
