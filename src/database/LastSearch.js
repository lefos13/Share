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
    if (exist === null) {
      const allAndCount = await LastSearch.findAndCountAll({
        where: {
          email: data.email,
          isFavourite: false,
        },
      }).catch((err) => {
        throw err;
      });
      // console.log(allAndCount.count);
      if (allAndCount.count < 10) {
        //create the last search
        const results = await LastSearch.create(data).catch((err) => {
          throw err;
        });
      } else {
        //get the list of all the last searches
        const resultsAll = await LastSearch.findAll({
          where: {
            email: data.email,
            isFavourite: false,
          },
          order: [["isUpdated", "ASC"]],
        }).catch((err) => {
          throw err;
        });
        // update the oldest search and make it the last one
        await resultsAll[0]
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
