//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { HOST, USERR, PASS, DATABASE } = process.env;
// END OF SECTION (ENV VAR)

// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASE, USERR, PASS, {
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
    console.error(error);
    return false;
  }
};

const favouriteExist = async (data) => {
  try {
    //check if favourite already exists
    const found = await LastSearch.findOne({
      where: {
        email: data.email,
        isFavourite: true,
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
    }).catch((err) => {
      throw err;
    });

    return found;
  } catch (error) {
    console.error(error);
    return false;
  }
};
const createFavourite = async (data) => {
  try {
    await LastSearch.create(data).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const countFavourites = async (email) => {
  try {
    const count = await LastSearch.count({
      where: {
        email: email,
        isFavourite: true,
      },
    }).catch((err) => {
      throw err;
    });
    return count;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getAll = async (email) => {
  try {
    const searches = await LastSearch.findAll({
      where: {
        email: email,
      },
      order: [["isUpdated", "DESC"]],
    }).catch((err) => {
      throw err;
    });

    return searches;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const deleteFavourite = async (lsid, email) => {
  try {
    const target = await LastSearch.findOne({
      where: {
        email: email,
        lsid: lsid,
      },
    }).catch((err) => {
      throw err;
    });
    if (target == null) {
      throw new Error("Η αναζήτηση δεν είναι στις αγαπημένες!");
    }

    const existExtra = await LastSearch.findOne({
      where: {
        email: email,
        lsid: { [Op.ne]: target.lsid },
        [Op.and]: [
          {
            [Op.or]: [
              { startPlace: target.startPlace },
              { startCoord: target.startCoord },
            ],
          },
          {
            [Op.or]: [
              { endPlace: target.endPlace },
              { endCoord: target.endCoord },
            ],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    if (target.isFavourite == true) {
      await target.destroy().catch((err) => {
        throw err;
      });
    }

    if (existExtra != null && existExtra.isFavourite == true) {
      await existExtra.destroy().catch((err) => {
        throw err;
      });
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = {
  createIfNotExist,
  createFavourite,
  countFavourites,
  getAll,
  favouriteExist,
  deleteFavourite,
};
