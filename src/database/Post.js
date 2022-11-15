// inside src/database/Post.js

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
const { savePost } = require("./utils");

const getAllPosts = () => {
  return "All posts";
};

//function that count posts for a user the current day
const countPosts = async (user) => {
  try {
    //moment conversions
    var startDay = moment();
    startDay.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    var endDay = moment();
    endDay.set({ hour: 23, minute: 59, second: 59, millisecond: 0 });

    console.log(startDay, endDay);
    const numOfPosts = await Posts.count({
      where: {
        date: { [Op.between]: [startDay, endDay] },
        email: user,
      },
    }).catch((err) => {
      throw err;
    });
    console.log(numOfPosts + " <---res === Inside countPosts()");
    return numOfPosts;
  } catch (error) {
    console.log(error);
    return false;
  }
  // code to count posts of a user the current day
};

// *** ADD ***
const createNewPost = async (data) => {
  try {
    //get current date
    var postdate = moment();
    data.date = postdate;

    //fix for return dates if not given
    if (data.withReturn == false) {
      data.returnStartDate = moment();
      data.returnEndDate = moment();
    }
    // fix gia to enddate==null
    if (data.enddate == null) {
      data.enddate = data.startdate;
    }

    // console.log("current day: ", postdate); // current date
    const post = await savePost(data); // actual creation of post to DB
    return post;
    //!!!!!!!!!!!!!!!!!!!!!!!!!!!
    //Firebase newRide notification
    //   pushNotifications(post);
  } catch (error) {
    return false;
  }
  // logic for the creation of post in db
};

const isPostOwner = async (row) => {
  try {
    const checkPost = await Posts.count({
      where: {
        postid: row.postid,
        email: row.email,
      },
    }).catch((err) => {
      throw err;
    });
    return checkPost;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const findOne = async (postid) => {
  try {
    const postForFunction = await Posts.findOne({
      where: {
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });

    return postForFunction;
  } catch (error) {
    console.log("Inside findOne: ", error);
    return false;
  }
};

const findAndCountAll = async (query) => {
  try {
    const found = await Posts.findAndCountAll(query).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const countAllPastHalfYear = async (email, today) => {
  try {
    const count = await Posts.count({
      where: {
        email: email,
        enddate: { [Op.gte]: today },
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

const findAllPastHalfYear = async (email, today) => {
  try {
    const all = await Posts.findAndCountAll({
      where: {
        email: email,
        enddate: { [Op.gte]: today },
      },
    }).catch((err) => {
      throw err;
    });
    return all;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const countFavourites = async (email) => {
  try {
    const countFavourites = await Posts.count({
      where: {
        email: email,
        isFavourite: true,
      },
    }).catch((err) => {
      throw err;
    });
    return countFavourites;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const countPostsQuery = async (query) => {
  try {
    const countPosts = await Posts.count(query).catch((err) => {
      throw err;
    });
    return countPosts;
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = {
  getAllPosts,
  createNewPost,
  countPosts,
  isPostOwner,
  findOne,
  findAndCountAll,
  countAllPastHalfYear,
  countFavourites,
  countPostsQuery,
  findAllPastHalfYear,
};