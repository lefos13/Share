// inside src/database/Review.js

// END OF SECTION (ENV VAR)

// code for db

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const moment = require("moment");
const { Op } = require("sequelize");
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
    console.error(error);
    return false;
  }
};

const findOne = async (email, emailReviewer) => {
  try {
    const revExist = await Reviews.findOne({
      where: {
        emailreviewer: emailReviewer,
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return revExist;
  } catch (error) {
    console.error(error);
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
    console.error(error);
    return false;
  }
};

const updateReview = async (review, data) => {
  try {
    let curDate = moment();
    await review
      .update({
        rating: data.rating,
        text: data.text,
        createdAt: curDate,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findAll = async (email) => {
  try {
    const reviews = await Reviews.findAll({
      where: {
        [Op.or]: [
          {
            email: email,
          },
          {
            emailReviewer: email,
          },
        ],
      },
    });
    return reviews;
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
  findAll,
};
