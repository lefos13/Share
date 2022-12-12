//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
// END OF SECTION (ENV VAR)

const nodemailer = require("nodemailer");
// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});
const fs = require("fs");
const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const moment = require("moment");
// ==== code for db

const verification = async (otp, email) => {
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
    console.log(err);
  }
};

const checkPass = async (result, user, fcmToken, email) => {
  try {
    if (result) {
      //console.log(user.toJSON());
      let data = user.toJSON();
      data.password = null;
      if (fcmToken != null) {
        fcmData = {
          email: email,
          fcmToken: fcmToken,
        };
        const fcmUser = await FcmToken.findOne({
          where: {
            email: email,
          },
        }).catch((err) => {
          throw err;
        });
        if (fcmUser != null) {
          fcmUser.update({ fcmToken: fcmToken }).catch((err) => {
            throw err;
          });
        } else {
          FcmToken.create(fcmData).catch((err) => {
            throw err;
          });
        }
      }

      let { password, mobile, ...rest } = data;
      const photoPath = "./uploads/" + data.email + ".jpeg";
      if (fs.existsSync(photoPath)) {
        rest.photo = "images/" + data.email + ".jpeg";
      }
      // console.log("useraaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      return {
        status: 200,
        message: "Επιτυχής είσοδος.",
        user: rest,
        forceUpdate: false,
      };
    } else {
      return { status: 405, message: "Λάθος κωδικός." };
    }
  } catch (err) {
    console.log(err);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const saveFcm = async (fcmToken, email) => {
  try {
    if (fcmToken != null) {
      fcmData = {
        email: email,
        fcmToken: fcmToken,
      };
      const fcmUser = await FcmToken.findOne({
        where: {
          email: email,
        },
      }).catch((err) => {
        throw err;
      });
      if (fcmUser != null) {
        fcmUser.update({ fcmToken: fcmToken }).catch((err) => {
          throw err;
        });
      } else {
        FcmToken.create(fcmData).catch((err) => {
          throw err;
        });
      }
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

const fixDate = async (date) => {
  try {
    let tempd = date;
    let dateonly = moment(tempd).format("DD/MM/YYYY");
    let newtime = moment(tempd).format("hh:mm");

    // console.log(dateonly, newtime);
    return {
      dateMonthDay: dateonly,
      hoursMinutes: newtime,
    };
  } catch (err) {
    console.log(err);
  }
};

module.exports = { verification, checkPass, fixDate, saveFcm };
