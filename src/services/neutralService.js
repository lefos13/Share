// In src/services/Userservice.js
let allowCrypto = false;
// *** ADD *** (methods for all the Users that access data in db)
const User = require("../database/User");
const Review = require("../database/Review");
const Request = require("../database/Request");
const Post = require("../database/Post");
const PostInt = require("../database/PostInterested");
const ToReview = require("../database/ToReview");
const ConvUsers = require("../database/ConvUsers");

const bcrypt = require("bcrypt");
var otpGenerator = require("otp-generator");
const saltRounds = 10;
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { verification, checkPass } = require("../database/utils");
const {
  insertAver,
  determineLang,
  decryptMessages,
} = require("../utils/functions");
const moment = require("moment");
const _ = require("lodash");
const fun = require("../utils/functions");
const path = require("path");

//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
// END OF SECTION (ENV VAR)
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

const sendReport = async (req) => {
  try {
    let msg = await fun.determineLang(req);
    let extra = req.body.extra;
    let text = req.body.text;
    let flag = fun.sendReport(text, extra);
    // await sendReport(text, extra);

    return { status: 200, message: msg.feedbackSuc };
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

const getTerms = async (req) => {
  try {
    let file = path.join(__dirname + "/../terms/terms.txt");

    return { status: 200, file: file };
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

const moreMessages = async (req) => {
  try {
    let data = req.body.data;
    const msg = await determineLang(req);

    console.log(req.body.data);

    let conversationId = data.conversationId;
    let message = data.lastMessage;

    const conv = await ConvUsers.findOne(conversationId);
    if (conv === false) {
      throw new Error("Error at finding the conversation");
    }

    let allMessages = conv.messages;
    allMessages = JSON.parse(allMessages);
    allMessages.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    let counter = 0;
    let key;
    _.forEach(allMessages, (mes) => {
      // console.log(mes._id.valueOf() === message._id.valueOf());
      // console.log(mes._id);
      // console.log(message._id);
      // console.log();
      if (mes._id === message._id) {
        counter++;
        key = counter;
        console.log("Key of the array is:", key, " and message is: ", mes);
        return false;
      }
      counter++;
    });

    //PAGINATION
    var skipcount = counter;
    var takecount =
      allMessages.length - counter > 20 ? 20 : allMessages.length - counter;
    console.log("takecount:", takecount);
    var finalMessages = _.take(_.drop(allMessages, skipcount), takecount);
    // console.log(finalMessages);
    if (allowCrypto) finalMessages = await decryptMessages(finalMessages);
    //check if the are more messages after those
    let messagesLeft = allMessages.length - counter > 20 ? true : false;
    console.log(allMessages.length - counter);

    return {
      status: 200,
      data: {
        finalMessages: finalMessages,
        messagesLeft: messagesLeft,
      },
    };
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

module.exports = {
  moreMessages,
  sendReport,
  getTerms,
};
