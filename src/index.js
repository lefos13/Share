const express = require("express");
const app = express();
var http = require("http").Server(app);

//helmet for security
const helmet = require("helmet");
app.use(helmet());

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
    dateStrings: true,
    typeCast: true,
  },
});
const saltRounds = 10;

const Users = require("./modules/user");
const Posts = require("./modules/post");
const PostInterested = require("./modules/postinterested");
const Reviews = require("./modules/review");
const { values, hasIn } = require("lodash");

checkconnection();

const schedule = require("node-schedule");

//run once a time to delete old posts from the database
const deleteOldPosts = schedule.scheduleJob("0 0 1 */1 *", async function () {
  try {
    // console.log("Posts are being deleted");
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth()).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();
    if (mm == "00") {
      mm = "12";
      yyyy = yyyy - 1;
    }

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

// instertPosts();
const insertReviews = async (main, second) => {
  let pseudo = 0;
  let data = {
    email: main,
    emailreviewer: second + pseudo,
    rating: 5,
    text: "",
  };
  for (let i = 0; i <= 100; i++) {
    data.text = " FAKE REVIEW NUMBER: " + i;
    await Reviews.create(data)
      .then((res) => {
        data.rating >= 5 ? (data.rating = 1) : data.rating++;
      })
      .catch((err) => {
        console.error(err);
      });
    pseudo++;
    data.emailreviewer = second + pseudo;
  }
};
async function insertPosts(email) {
  try {
    var data = {
      email: email,
      date: "2021-10-06",
      startplace: "Τρίκαλα",
      startcoord: "39.5557317,21.7678951",
      endplace: "Γαλατάς",
      endcoord: "35.498456,23.9630835",
      numseats: 2,
      startdate: "2021-12-15",
      enddate: "2021-12-16",
      costperseat: 25,
      comment: "Αν δεν επικοινωνήσω σημαίνει ότι δεν υπάρχουν θέσεις.",
      moreplaces: [
        {
          place: "Αθήνα",
          placecoords: "37.9838096,23.7275388",
        },
      ],
    };

    var startplace = "Αθήνα";
    var endplace = "Θεσσαλονίκη";
    var startcoord = "37.9838096,23.7275388";
    var endcoord = "40.6400629,22.9444191";
    var numseats = 1;
    var costperseat = 0;
    var moreplaces = [
      {
        place: "Γαλατάς",
        placecoords: "35.498456,23.9630835",
      },
    ];

    setTime(0);
    var datetime = new Date().today() + " " + new Date().timeNow();
    data.date = datetime;

    // dates(data);
    var counter = 0;
    for (var i = 0; i <= 50; i++) {
      if (numseats < 3) numseats++;
      else numseats = 0;
      data.numseats = numseats;

      costperseat++;
      data.costperseat = costperseat;

      if (i > 24) {
        data.email = "cs141082@uniwa.gr";
        data.startcoord = startcoord;
        data.endcoord = endcoord;
        data.startplace = startplace;
        data.endplace = endplace;
        data.moreplaces = moreplaces;
      }

      var today = new Date();
      dates();

      await Posts.create(data)
        .then((data) => {
          // console.log(data);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  } catch (error) {
    console.error("Something Went wrong: " + error);
  }

  function dates() {
    if (counter + today.getDate() <= 21) {
      var dd = String(today.getDate() + counter).padStart(2, "0");
      var dd2 = String(today.getDate() + counter + 5).padStart(2, "0");
      var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      var mm2 = String(today.getMonth() + 2).padStart(2, "0"); //January is 0!
      var yyyy = today.getFullYear();

      today = yyyy + "-" + mm + "-" + dd;
      var lastday = yyyy + "-" + mm2 + "-" + dd2;

      var tempdate = new Date();
      setTime(tempdate.getDate() > counter && counter < 0 ? -counter : 0);
      // setTime(2);
      data.date = new Date().today() + " " + new Date().timeNow();
      data.startdate = today;
      data.enddate = lastday;
      counter++;
      // console.log(data);
    } else {
      counter = counter - 20;
      var dd = String(today.getDate() - counter).padStart(2, "0");
      var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      var mm2 = String(today.getMonth() + 2).padStart(2, "0"); //January is 0!
      var yyyy = today.getFullYear();

      today = yyyy + "-" + mm + "-" + dd;
      var lastday = yyyy + "-" + mm2 + "-" + dd;
      setTime(0);
      data.date = new Date().today() + " " + new Date().timeNow();
      console.log("data.date: " + data.date + " counter: " + counter);
      console.log("today: " + today + " counter: " + counter);
      console.log("lastday: " + lastday + " counter: " + counter);
      data.startdate = today;
      data.enddate = lastday;
      // console.log(data2);
    }
  }
}

//eisagwgh endiaferomenwn gia ena post
const insertInterested = async (postid) => {
  try {
    setTime(0);
    var curtime = new Date().today() + " " + new Date().timeNow();
    let data = {
      email: "lefterisevagelinos@gmail.com",
      postid: postid,
      date: curtime,
      isVerified: false,
      isNotified: false,
      ownerNotified: false,
    };
    for (let i = 0; i < 70; i++) {
      data.email = "lefterisevagelinos1996@gmail.com" + i;
      await PostInterested.create(data).catch((err) => {
        console.error(err);
        return 0;
      });
    }
  } catch (err) {
    console.error(err);
    return 0;
  }
};

//eisagwgh endiaferwn gia enan xrhsth se polla post
const insertInterested2 = async (postidList, mainEmail) => {
  try {
    setTime(0);
    var curtime = new Date().today() + " " + new Date().timeNow();
    let data = {
      email: mainEmail,
      postid: 0,
      date: curtime,
    };
    for await (id of postidList) {
      data.postid = id;
      await PostInterested.create(data).catch((err) => {
        console.error(err);
        return 0;
      });
    }
  } catch (err) {
    console.error(err);
    return 0;
  }
};

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, TOKEN_KEY, (err, email) => {
      if (err)
        return res.json({
          body: null,
          message: "Token expired or didnt even exist",
        });
      else {
        // console.log("inside auth: " + JSON.stringify(req.body.data));
        console.log("Athenticated!");
        req.body["extra"] = email.email;
      }
      next();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong!" });
  }
}

// sunarthsh poy eisagei fake users (70) ---- gia testing --- password 12356
const insertUsers = async () => {
  let arr = [];
  for (let i = 0; i < 70; i++) {
    arr.push({
      email: "user" + i + "@gmail.com",
      password: "$2b$10$GsLPti1c129vcZdPdK8gk.VDX1oSHyWfg.I7Rh77tKvtZEWtl9nJ.",
      mobile: "12313",
      fullname: "lefos evan",
      gender: "male",
      car: "toyota",
      cardate: "1996",
      age: "26",
      photo: "12131231",
      verified: true,
    });
  }

  // console.log(arr);
  Users.bulkCreate(arr).catch((err) => {
    console.error(err);
  });
};

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
    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(data.password, salt, async function (err, hash) {
        var data2 = req.body.data;
        data2.password = hash;
        console.log(data.email);

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
            console.log("inside query email: " + data2.email);
            verification(otp, data2.email);
            results = {
              message:
                "Εγγραφήκατε επιτυχώς. Πάμε για την εξακρίβωση του email!",
              otp: otp,
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

//rest api service that creates the token for the user. Also checks if he is verified and sends the right message
app.post("/createtoken", [], cors(corsOptions), async (req, res) => {
  try {
    var email = req.body.data.email;
    console.log(req.body);
    const user = await Users.findOne({
      where: {
        email: email,
      },
    }).catch((err) => {
      console.log("Error:" + err);
    });

    if (user === null) {
      res.status(404).json({
        message: "Ο χρήστης δεν βρέθηκε.",
      });
    } else {
      if (user.verified === false) {
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
        res.json({
          message: "Επιτυχής είσοδος.",
          user: data,
        });
      } else {
        body = "Λάθος κωδικός.";
        res.status(405).json({ message: body });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
    });
  }
});

//api that checks if the user exists and if he is verified. Also, it sends an otp for the reset of his password
app.post("/passotp", [], cors(corsOptions), async (req, res) => {
  try {
    var email = req.body.data.email;

    var body = null;

    // console.log();
    const user = await Users.findOne({
      where: {
        email: email,
      },
    })
      .catch((err) => {
        console.log("Error:" + err);
        body = "Κάτι πήγε στραβά. Παρακαλούμε προσπαθήστε ξανά αργότερα!";
        res.status(500).json({
          message: body,
        });
      })
      .then((user) => {
        if (user === null) {
          res.status(404).json({
            message: "Ο χρήστης δεν βρέθηκε",
          });
        } else {
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
        }
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
      var datetime = new Date().today() + " " + new Date().timeNow();
      console.log(datetime);
      setTime(1);
      var firsttime = new Date().today() + " " + new Date().timeNow();
      console.log(firsttime);
      data.date = datetime;
      // await Posts.count({
      //   where: {
      //     date: { [Op.between]: [firsttime, datetime] },
      //     email: data.email,
      //   },
      // }).then(async (count) => {
      //   console.log(count);
      //   if (count >= 3) {
      //     res.status(405).json({
      //       message: "Έχεις κάνει ήδη 3 post σήμερα! Προσπάθησε ξανά αύριο.",
      //       body: null,
      //     });
      //   } else {
      //     await Posts.create(data)
      //       .then((post) => {
      //         // console.log(post.moreplaces);
      //         var data = {
      //           body: post.toJSON(),
      //           message: "Η υποβολή πραγματοποιήθηκε επιτυχώς.",
      //         };
      //         res.json(data);
      //       })
      //       .catch((err) => {
      //         console.log(err);
      //         res.status(400).json({ message: "Κάτι πήγε στραβά.", body: null });
      //       });
      //   }
      // });

      // auto to kommati kanei mono eggrafi opote vgalto apo sxolio otan theliseis

      await Posts.create(data)
        .then((post) => {
          // console.log(post.moreplaces);
          var data = {
            body: post.toJSON(),
            message: "Η υποβολή πραγματοποιήθηκε επιτυχώς.",
          };
          res.json({ message: "Επιτυχής δημιουργία!" });
        })
        .catch((err) => {
          console.log(err);
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

//service that is being called when someone is interested for a post
app.post(
  "/interested",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
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
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
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
      }
      await Posts.findAndCountAll({
        where: {
          // elaxisto kostos
          costperseat: { [Op.lte]: data.cost },
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
                    { startdate: { [Op.lte]: data.startdate } },
                    { enddate: { [Op.gte]: data.enddate } },
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
            var arr;

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
                return parseInt(obj.user.cardate) >= data.cardate;
              });
            }
            if (data.gender != null) {
              //afairese ta post twn xrhstwn pou den exoun to katallhlo fulo
              array = _.filter(array, (obj) => {
                return obj.user.gender == data.gender;
              });
            }

            //PAGINATION
            var skipcount = 0;
            var takecount = 20;
            if (data.page > 1) skipcount = data.page * 20 - 20;
            var finalarr = _.take(_.drop(array, skipcount), takecount);
            var counter = 0;
            //FORMAT CHANGE OF TIMSTAMP
            for await (ps of finalarr) {
              const fixedDate = await fixDate(ps.post.date);

              ps.post.dataValues.date =
                fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
            }
            //CHECK IF ARRAY IS EMPTY AND SEND THE RESULTS
            if (finalarr.length == 0) {
              res
                .status(404)
                .json({ message: "Δεν υπάρχει διαδρομή.", body: null });
            } else {
              // console.log(array[0].post.newdate);
              var mod = array.length % 20;
              var totallength = 1;
              mod == 0
                ? (totallength = array.length / 20)
                : (totallength = array.length / 20 - mod / 20 + 1);
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
      var tokenEmail = req.body.extra;
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

              //psaxnei na dei an exei posts
              const post = await Posts.findOne({
                where: {
                  email: data.email,
                  enddate: { [Op.gte]: today },
                },
              });

              //psaxnei an endiaferetai gia kapoio post
              const interested = await PostInterested.findAll({
                where: {
                  email: data.email,
                },
              }).catch((err) => {
                console.error(err);
              });

              let hasInterested = false;
              if (interested.length != 0) {
                for await (int of interested) {
                  let dateForInt = await getCurDate(0);
                  let countP = await Posts.count({
                    where: {
                      postid: int.postid,
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
              let hasIntPosts;
              isAny > 0 ? (hasIntPosts = true) : (hasIntPosts = false);

              let hasPosts;
              post == null ? (hasPosts = false) : (hasPosts = true);

              res.json({
                user: found,
                average: average,
                count: revfound.count,
                hasPosts: hasPosts,
                hasInterested: hasInterested,
                interestedForYourPosts: hasIntPosts, //4th tab
                reviewAble: true, //boolean gia to an o xrhsths mporei na kanei review se afto to profil
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

      await Reviews.create(data)
        .then(async (review) => {
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
            res.status(500).json({ message: "Κάτι πήγε στραβά.", body: null });
          }
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      });
    }
  }
);

//database posts and reviews population
app.post("/dbMigration", [], cors(corsOptions), async (req, res) => {
  try {
    var data = req.body.data;
    // insertPosts(data.mainEmail);
    // insertReviews(data.mainEmail, data.secondaryEmail);
    insertInterested(data.postid);
    // insertInterested2(data.postidList, data.mainEmail);
    // insertUsers();
    res.send("σωστο");
  } catch (err) {
    console.error(err);
    res.status(500).send("Λαθος");
  }
});

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
          let takecount = 20;
          if (data.page > 1) skipcount = data.page * 20 - 20;
          let finalarr = _.take(_.drop(rows, skipcount), takecount);
          let mod = count % 20;
          // console.log(mod);
          let totallength = 1;
          mod == 0
            ? (totallength = count / 20)
            : (totallength = count / 20 - mod / 20 + 1);
          let array = [];
          for await (post of finalarr) {
            const fixedDate = await fixDate(post.date);

            let nnDate = new Date(post.startdate);
            post.dataValues.startdate = await fixOnlyMonth(nnDate);
            nnDate = new Date(post.enddate);
            post.dataValues.enddate = await fixOnlyMonth(nnDate);

            post.dataValues.date =
              fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
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
              console.error("provlima sto postinterested line 1258");
            });
            let flag;
            interested === null ? (flag = false) : (flag = true);

            let results = {
              user: user,
              imagePath: image,
              post: post,
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
                enddate: {
                  [Op.gte]: curDate,
                },
              },
            }).catch((err) => {
              console.error(err);
              res.status(500).json({ message: "Κάτι πήγε στραβά!" });
            });

            if (post != null) {
              //diorthwseis hmeromhniwn
              const fixedDate = await fixDate(post.date);
              post.dataValues.date =
                fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
              // console.log(postI);
              let nnDate = new Date(post.startdate);
              post.dataValues.startdate = await fixOnlyMonth(nnDate);
              nnDate = new Date(post.enddate);
              post.dataValues.enddate = await fixOnlyMonth(nnDate);

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
          let allI = [];
          for await (post of posts) {
            let fixedDate = await fixDate(post.date);

            post.dataValues.date =
              fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;

            let nnDate = new Date(post.startdate);
            post.dataValues.startdate = await fixOnlyMonth(nnDate);
            nnDate = new Date(post.enddate);
            post.dataValues.enddate = await fixOnlyMonth(nnDate);
            // endiaferomoi gia ena sygekrimeno post
            const interested = await PostInterested.count({
              where: {
                postid: post.postid,
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
          const fixedDate = await fixDate(posts.date);
          posts.dataValues.date =
            fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
          let nnDate = new Date(posts.startdate);
          posts.dataValues.startdate = await fixOnlyMonth(nnDate);
          nnDate = new Date(posts.enddate);
          posts.dataValues.enddate = await fixOnlyMonth(nnDate);
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
            let takecount = 20;
            if (data.page > 1) skipcount = data.page * 20 - 20;
            let finalarr = _.take(_.drop(allUsers, skipcount), takecount);
            let mod = isAny % 20;
            // console.log(mod);
            let totallength = 1;
            mod == 0
              ? (totallength = isAny / 20)
              : (totallength = isAny / 20 - mod / 20 + 1);
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

      if (allIntersted < post.numseats || results.isVerified == true) {
        if (results.isVerified == false) {
          results.update({ isVerified: true });
          res.json({
            message: "Επιτυχής έγκριση ενδιαφερόμενου!",
          });
        } else {
          results.update({ isVerified: false, isNotified: false });
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

//service for notification if someone has verified me or for people that are interested for one of my posts
app.post(
  "/notifyMe",
  [authenticateToken],
  cors(corsOptions),
  async (req, res) => {
    try {
      // let data = req.body.data;
      let extra = req.body.extra;
      let flag = false;

      let message = "Καμία νέα ειδοποίηση!";
      let posts = [];
      let history = [];

      // entopismos egrisewn gia ton xrhsth
      const allInt = await PostInterested.findAll({
        where: {
          email: extra,
        },
      }).catch((err) => {
        throw err;
      });

      for await (one of allInt) {
        const post = await Posts.findOne({
          where: {
            postid: one.postid,
          },
        }).catch((err) => {
          throw err;
        });
        const fixedDate = await fixDate(post.date);
        post.dataValues.date =
          fixedDate.dateMonthDay + " " + fixedDate.hoursMinutes;
        // console.log(postI);
        let nnDate = new Date(post.startdate);
        post.dataValues.startdate = await fixOnlyMonth(nnDate);
        nnDate = new Date(post.enddate);
        post.dataValues.enddate = await fixOnlyMonth(nnDate);

        const userPost = await Users.findOne({
          attributes: {
            exclude: ["password"],
          },
          where: {
            email: post.email,
          },
        }).catch((err) => {
          throw err;
        });

        if (one.isVerified == true && one.isNotified == false) {
          flag = true;
          message = "Έχεις ειδοποιήσεις!";
          post.dataValues = { ...post.dataValues, ...{ piid: one.piid } };
          posts.push({
            post: post,
            userOwner: userPost,
          });
          // await PostInterested.update(
          //   { isNotified: true },
          //   {
          //     where: {
          //       piid: one.piid,
          //     },
          //   }
          // );
        } else if (
          one.isNotified == true &&
          one.isVerified == true &&
          history.length < 5
        ) {
          history.push({
            post: post,
            userOwner: userPost,
          });
        }
      }

      // flow pou psaxnei tous neous endiaferomenous.
      const exposts = await Posts.findAll({
        where: {
          email: extra,
        },
      }).catch((err) => {
        throw err;
      });
      let case1L = 0;
      let finData = [];
      for await (ex of exposts) {
        let tempint = await PostInterested.findAll({
          where: {
            postid: ex.postid,
            ownerNotified: false,
          },
        }).catch((err) => {
          throw err;
        });
        case1L = case1L + tempint.length;
        //   for await(i of tempint)
        //   {
        //   exArray.push(i);
        // }
        tempint != 0
          ? finData.push({
              post: ex,
              postInt: tempint,
            })
          : null;
      }

      res.json({
        notify: flag,
        case0: {
          verifications: posts,
          lOfCase0: posts.length,
        },
        case1: {
          postAndInter: finData,
          lOfCase1: case1L,
        },
        finalLength: posts.length + case1L,
        // alreadyNotified: history,
        message: message,
      });
    } catch (err) {
      console.error("!!!!!!!!!!!!!!sto notifyme: ", err);
      res.status(500).json({ message: "Κάτι πήγε στραβά" });
    }
    // console.log(req.query);
  }
);

//test api async await functions
app.get("/test", [authenticateToken], cors(corsOptions), async (req, res) => {
  var now = "now";
  now = await test(now);

  await prom(false)
    .then((res) => {
      console.log(res);
    })
    .catch((rej) => {
      console.error("error arpagmeno: " + rej);
    });
  console.log(now);
  res.json(now);
});

//test function for await
async function test(now) {
  for (var i = 0; i <= 10000; i++) {
    var date = new Date();
    // i == 10000 ? await sleep(1000) : "";
  }
  now = "not now";
  return now;
}

//function for the usage of then and catch
async function prom(param) {
  if (param) return Promise.resolve(true);
  else return Promise.reject(false);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    console.log(req.body);

    res.json({ message: "Το upload έγινε επιτυχώς" });
  }
);

function setTime(extrad) {
  Date.prototype.today = function () {
    return (
      this.getFullYear() +
      "-" +
      (this.getMonth() + 1 < 10 ? "0" : "") +
      (this.getMonth() + 1) +
      "-" +
      (this.getDate() - extrad < 10 ? "0" : "") +
      (this.getDate() - extrad)
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
