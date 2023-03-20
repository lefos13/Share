// In src/services/Userservice.js
let allowCrypto = true;
// *** ADD *** (methods for all the Users that access data in db)
const User = require("../database/User");
const Review = require("../database/Review");
const Request = require("../database/Request");
const Post = require("../database/Post");
const PostInt = require("../database/PostInterested");
const ToReview = require("../database/ToReview");
const Notification = require("../database/Notifications");
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

const sendReport = async (req) => {
  try {
    let msg = await fun.determineLang(req);
    let extra = req.body.extra;
    let text = req.body.text;
    let flag = fun.sendReport(text, extra);
    // await sendReport(text, extra);

    return { status: 200, message: msg.feedbackSuc };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const webSendReport = async (req) => {
  try {
    let msg = await fun.determineLang(req);
    let extra = req.body.email;
    let text = req.body.text;
    let fullname = req.body.fullname;
    let phoneNumber = req.body.phoneNumber;
    let flag = fun.webSendReport(text, extra, fullname, phoneNumber);
    // await sendReport(text, extra);

    return { status: 200, message: msg.feedbackSuc };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const getTerms = async (req) => {
  try {
    let file;

    let lang = req.headers["accept-language"];

    if (lang == "EN")
      file = path.join(__dirname + "/../termsPolicies/terms_EN.html");
    else if (lang == "GR")
      file = path.join(__dirname + "/../termsPolicies/terms_GR.html");
    else file = path.join(__dirname + "/../termsPolicies/terms_GR.html");

    return { status: 200, file: file };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const moreMessages = async (req) => {
  try {
    let data = req.body.data;
    const msg = await determineLang(req);

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
      if (mes._id === message._id) {
        counter++;
        key = counter;
        return false;
      }
      counter++;
    });

    //PAGINATION
    var skipcount = counter;
    var takecount =
      allMessages.length - counter > 20 ? 20 : allMessages.length - counter;

    var finalMessages = _.take(_.drop(allMessages, skipcount), takecount);

    if (allowCrypto) finalMessages = await decryptMessages(finalMessages);
    //check if the are more messages after those
    let messagesLeft = allMessages.length - counter > 20 ? true : false;

    return {
      status: 200,
      data: {
        finalMessages: finalMessages,
        messagesLeft: messagesLeft,
      },
    };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const getNotifications = async (req) => {
  try {
    let email = req.body.extra;
    const msg = await determineLang(req);

    let allNotifications = await Notification.getAll(email);

    return {
      status: 200,
      notifications: allNotifications,
    };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

module.exports = {
  getNotifications,
  webSendReport,
  moreMessages,
  sendReport,
  getTerms,
};
