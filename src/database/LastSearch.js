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

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const LastSearch = require("../modules/lastsearch");
const moment = require("moment");

const createIfNotExist = async (data) => {
  try {
    // find if this search exists
    const exist = await LastSearch.findOne({
      where: {
        email: data.email,
        isFavourite: false,
        [Op.and]: [
          {
            [Op.or]: [
              { startPlace: data.startPlace },
              { startCoord: data.startCoord },
            ],
          },
          {
            [Op.or]: [{ endPlace: data.endPlace }, { endCoord: data.endCoord }],
          },
        ],
      },
    });
    console.log(data);

    //if it exists
    if (exist === null) {
      //find and count all of the user
      const allAndCount = await LastSearch.findAndCountAll({
        where: {
          email: data.email,
          isFavourite: false,
        },
        order: [["isUpdated", "ASC"]],
      }).catch((err) => {
        throw err;
      });
      // if they are less than 10 searches
      if (allAndCount.count < 10) {
        //create the last search
        const results = await LastSearch.create(data).catch((err) => {
          throw err;
        });
      } else {
        // update the oldest search and make it the last one
        await allAndCount.rows[0]
          .update({
            isCreated: data.isCreated,
            isUpdated: data.isUpdated,
            startPlace: data.startPlace,
            endPlace: data.endPlace,
            startCoord: data.startCoord,
            endCoord: data.endCoord,
          })
          .catch((err) => {
            throw err;
          });
      }
    } else {
      let updateDate = moment();
      const results = await exist
        .update({
          isUpdated: updateDate,
        })
        .catch((err) => {
          throw err;
        });
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = {
  createIfNotExist,
};
