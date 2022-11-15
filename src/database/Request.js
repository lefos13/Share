// inside src/database/Request.js

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
const moment = require("moment-timezone");

const requestCount = async (email) => {
  try {
    const count = await SearchPost.count({
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return count;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const requestCountDub = async (email, startCoord, endCoord) => {
  try {
    const countDubl = await SearchPost.count({
      where: {
        email: email,
        startcoord: startCoord,
        endcoord: endCoord,
      },
    }).catch((err) => {
      throw err;
    });
    return countDubl;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const saveRequest = async (data) => {
  try {
    const request1 = await SearchPost.create(data).catch((err) => {
      console.log("Error sto creation of request");
      throw err;
    });
    return request1;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getAll = async (email) => {
  try {
    const requests = await SearchPost.findAll({
      where: {
        email: email,
      },
    }).catch((err) => {
      console.log(err);
      throw err;
    });
    return requests;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const deleteOne = async (postId, email) => {
  try {
    const reqDel = await SearchPost.destroy({
      where: {
        postSearchId: postId,
        email: email,
      },
    }).catch((err) => {
      console.log("error kata thn diagrafh enos request");
      throw err;
    });
    // console.log(reqDel);
    return reqDel;
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = {
  requestCount,
  requestCountDub,
  saveRequest,
  getAll,
  deleteOne,
};