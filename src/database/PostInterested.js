// inside src/database/PostInterested.js

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
require("moment/locale/el");
moment.locale("el");
// import "moment/locale/gr";
// moment.locale("gr");
// ==== code for db

// *** ADD ***

//function that count posts for a user the current day
const findOne = async (email, postid) => {
  try {
    const found = await PostInterested.findOne({
      where: {
        email: email,
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.log("Inside findOne of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

const destroyOne = async (email, postid) => {
  try {
    const deleted = await PostInterested.destroy({
      where: {
        email: email,
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    return false;
  }
};

const getCountOfUser = async (email, starttime, curtime) => {
  try {
    const count = await PostInterested.count({
      where: {
        email: email,
        date: { [Op.between]: [starttime, curtime] },
      },
    }).catch((err) => {
      throw err;
    });
    return count;
  } catch (error) {
    console.log("Inside getCountofUser:", error);
    return null;
  }
};

const createInterest = async (row) => {
  try {
    const inter = await PostInterested.create(row).catch((err) => {
      throw err;
    });
    return inter;
  } catch (error) {
    console.log("Inside createInterest: ", error);
    return false;
  }
};

const findAny = async (email) => {
  try {
    const found = await PostInterested.findAll({
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.log("Inside findAny of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

const countInterestedOfPost = async (postid, email) => {
  try {
    const countInt = await PostInterested.count({
      where: {
        postid: postid,
        email: { [Op.ne]: email },
      },
    }).catch((err) => {
      throw err;
    });
    return countInt;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// *** ADD ***

module.exports = {
  findOne,
  destroyOne,
  getCountOfUser,
  createInterest,
  findAny,
  countInterestedOfPost,
};
