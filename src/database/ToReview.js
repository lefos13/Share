// inside src/database/ToReview.js

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

const findForProfile = async (searcherEmail, profileEmail, dateToCheck) => {
  try {
    const possibleReviews = await ToReview.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { driverEmail: searcherEmail },
              { passengerEmail: searcherEmail },
            ],
          },
          {
            [Op.or]: [
              { driverEmail: profileEmail },
              { passengerEmail: profileEmail },
            ],
          },
        ],
        endDate: { [Op.lte]: dateToCheck },
      },
    }).catch((err) => {
      throw err;
    });
    return possibleReviews;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const findForCreatingReview = async (review) => {
  try {
    const possibleReview = await ToReview.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { driverEmail: review.emailreviewer },
              { passengerEmail: review.emailreviewer },
            ],
          },
          {
            [Op.or]: [
              { driverEmail: review.email },
              { passengerEmail: review.email },
            ],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return possibleReview;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const setDriverDone = async (possibleReview) => {
  try {
    await possibleReview
      .update({
        driverDone: true,
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

const setPassengerDone = async (possibleReview) => {
  try {
    await possibleReview
      .update({
        passengerDone: true,
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
  findForProfile,
  findForCreatingReview,
  setDriverDone,
  setPassengerDone,
};
