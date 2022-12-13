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
const moment = require("moment");
const _ = require("lodash");

//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { HOST, USER, PASS, DATABASE } = process.env;
// END OF SECTION (ENV VAR)
// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");
const { last } = require("lodash");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

//CREATE A FAVOURITE SEARCH IF THERE IS LESS THAN 10 OF THEM ALREADY
const addFavouriteSearch = async (req) => {
  try {
    let email = req.body.extra;
    let data = req.body.data;
    let curDate = moment();
    // console.log(data);
    data.isUpdated = curDate;
    data.isCreated = curDate;
    data.email = email;
    const exist = await LastSearch.favouriteExist(data);
    if (exist === false)
      throw new Error("Something went wrong at finding favourite search");
    else {
      if (exist != null) {
        return { status: 406, message: "Η αγαπημένη αναζήτηση υπάρχει ήδη!" };
      }
    }
    const count = await LastSearch.countFavourites(email);
    if (count > 9) {
      return { status: 406, message: "Έχεις ήδη δέκα αγαπημένες αναζητήσεις!" };
    } else {
      const doneFavourite = await LastSearch.createFavourite(data);
      if (doneFavourite === false) {
        throw new Error(
          "Something went wrong with creating a new favourite last search"
        );
      }
    }

    return {
      status: 200,
      message: "Επιτυχής δημιουργία αγαπημένης αναζήτησης!",
    };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε λάθος!" };
  }
};

const getAllSearches = async (req) => {
  try {
    let email = req.body.extra;
    let data = req.body.data;

    let allSearches = await LastSearch.getAll(email);
    if (allSearches === false) {
      throw new Error(
        "Something went wrong with getting all the searches of the user"
      );
    }
    let lastSearches = [];
    let favSearches = [];
    // console.log(allSearches);
    _.forEach(allSearches, (val) => {
      if (val.isFavourite) favSearches.push(val);
      else lastSearches.push(val);
    });
    // check with last searches are favourite searches too
    _.forEach(lastSearches, (val) => {
      _.forEach(favSearches, (fav) => {
        if (
          (val.startPlace == fav.startPlace ||
            val.startCoord == fav.startCoord) &&
          (val.endPlace == fav.endPlace || val.endCoord == fav.endCoord)
        ) {
          val.isFavourite = true;
        }
      });
    });
    const finalData = {
      favouriteSearches: favSearches,
      lastSearches: lastSearches,
    };
    // console.log(finalData);
    return {
      status: 200,
      data: finalData,
      message: "Βρεθηκαν αναζητήσεις!",
    };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε λάθος!" };
  }
};

const deleteFavourite = async (req) => {
  try {
    let email = req.body.extra;
    let data = req.body.data;

    const response = await LastSearch.deleteFavourite(data.lsid, email);
    if (response === false)
      throw new Error("Something went wrong at deleting the favourite search");

    return {
      status: 200,
      message: "Η αγαπημένη αναζήτηση διαγράφηκε!",
    };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε λάθος!" };
  }
};

module.exports = {
  addFavouriteSearch,
  getAllSearches,
  deleteFavourite,
};
