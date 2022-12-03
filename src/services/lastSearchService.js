// In src/services/lastSearchService.js

// *** ADD *** (methods for all the Users that access data in db)
const User = require("../database/User");
const Review = require("../database/Review");
const Request = require("../database/Request");
const Post = require("../database/Post");
const PostInt = require("../database/PostInterested");
const ToReview = require("../database/ToReview");
const LastSearch = require("../database/LastSearch");

const fun = require("../utils/functions");

//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { HOST, USER, PASS, DATABASE } = process.env;
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
    let extra = req.body.extra;
    let text = req.body.text;
    let flag = fun.sendReport(text, extra);
    // await sendReport(text, extra);

    return { status: 200, message: "Ευχαριστούμε για το feedback" };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε λάθος!" };
  }
};

module.exports = {
  sendReport,
};
