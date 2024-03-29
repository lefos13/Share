//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { EMAIL, PASSEMAIL } = process.env;
// END OF SECTION (ENV VAR)

const User = require("../database/User");

const nodemailer = require("nodemailer");
// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");

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

const getVersion = async () => {
  try {
    let version = JSON.parse(fs.readFileSync("./clientVersions/versions.json"));
    return version;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getLang = async (lang) => {
  let msg;
  if (lang == "EN") msg = JSON.parse(fs.readFileSync("./lang/english.json"));
  else if (lang == "GR") msg = JSON.parse(fs.readFileSync("./lang/greek.json"));
  else msg = JSON.parse(fs.readFileSync("./lang/greek.json"));

  return msg;
};

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

    // let user = await User.findOneLight(email);
    let msg = await getLang("GR");

    // send mail with defined transport object
    info = await transporter.sendMail({
      from: "OuRide <ouridecommunity@gmail.com",
      to: email, // list of receivers
      subject: "OTP code", // Subject line
      text: "Here is your OTP code:", // plain text body
      html: msg.otpMessage + otp + "</b></h1>", // html body bale enan diko s xristi tha kanw ena register
    });
  } catch (err) {
    console.error(err);
  }
};

const checkPass = async (result, user, fcmToken, email, msg) => {
  try {
    if (result) {
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

      if (fs.existsSync("./uploads/" + data.email + ".jpeg")) {
        rest.photo = "images/" + data.email + ".jpeg";
      } else rest.photo = null;
      const version = await getVersion();
      return {
        status: 200,
        message: msg.loginSuc,
        user: rest,
        forceUpdate: false,
        ...version,
      };
    } else {
      return { status: 405, message: msg.loginFailed };
    }
  } catch (err) {
    console.error(err);
    return { status: 500 };
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
    console.error(error);
    return false;
  }
};

const fixDate = async (date) => {
  try {
    let tempd = date;
    let dateonly = moment(tempd).format("DD/MM/YYYY");
    let newtime = moment(tempd).format("hh:mm");

    return {
      dateMonthDay: dateonly,
      hoursMinutes: newtime,
    };
  } catch (err) {
    console.error(err);
  }
};

module.exports = { verification, checkPass, fixDate, saveFcm };
