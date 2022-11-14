// inside src/database/Review.js

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

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const moment = require("moment");
// import "moment/locale/gr";
// moment.locale("gr");
// ==== code for db

// *** ADD ***
const {} = require("./utils");

const findAndCountAll = async (query) => {
  try {
    let results = await Reviews.findAndCountAll(query).catch((err) => {
      throw err;
    });

    return results;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const findOne = async (email, emailReviewer) => {
  try {
    const revExist = await Reviews.findOne({
      where: {
        email: email,
        emailreviewer: emailReviewer,
      },
    }).catch((err) => {
      throw err;
    });

    return revExist;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const saveReview = async (data) => {
  try {
    const review = await Reviews.create(data).catch((err) => {
      throw err;
    });

    return review;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const updateReview = async (review, data) => {
  try {
    await review
      .update({
        rating: data.rating,
        text: data.text,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  findAndCountAll,
  findOne,
  saveReview,
  updateReview,
};
