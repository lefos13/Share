const nodemailer = require("nodemailer");

const dotenv = require("dotenv");
dotenv.config();
// get the values from the .env file

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  // databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
});
const { EMAIL, PASSEMAIL, DATABASE, USER, PASS, HOST } = process.env;
const { Sequelize, DataTypes, fn } = require("sequelize");
const { nextTick } = require("process");
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

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const { response } = require("express");

module.exports = {
  sendReport: async (text, email) => {
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
        from: `Report`,
        to: EMAIL, // list of receivers
        subject: "Report from the App", // Subject line
        text: text + " by " + email, // plain text body
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  toNotifyOwner: async (emailToNotify, emailAction, postid) => {
    try {
      const user = await Users.findOne({
        where: {
          email: emailAction,
        },
      }).catch((err) => {
        throw err;
      });

      const fcmData = await FcmToken.findOne({
        where: {
          email: emailToNotify,
        },
      }).catch((err) => {
        throw err;
      });

      let postString = postid.toString();
      let fcmToken = fcmData.fcmToken;
      let data = {
        type: "receiveInterest",
        postid: postString,
        email: emailAction,
        fullname: user.fullname,
      };

      let message = {
        data: data,
        token: fcmToken,
        notification: {
          title: "Ενδιαφέρθηκε ο " + user.fullname,
          body: "Περιμένει την έγκρισή σου...",
        },
      };

      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Success: ", response);
        })
        .catch((err) => {
          throw err;
        });
    } catch (error) {
      console.error(error);
    }
  },
};
