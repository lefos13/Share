// inside src/database/Post.js

//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
// END OF SECTION (ENV VAR)

const { pushNotifications } = require("../utils/functions");
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
    // if (data.withReturn == false) {
    //   data.returnStartDate = moment();
    //   data.returnEndDate = moment();
    // } else if (data.withReturn == true && data.returnEndDate == null) {
    //   // console.log("gamw ton antitheo sou");
    //   data.returnEndDate = data.returnStartDate;
    // }
    console.log(data);
    // fix gia to enddate==null
    // if (data.enddate === null) {
    //   data.enddate = data.startdate;
    // }

    const post = await Posts.create(data).catch((err) => {
      throw err;
    });

    //!!!!!!!!!!!!!!!!!!!!!!!!!!!
    //Firebase newRide notification
    pushNotifications(post);
    return post;
  } catch (error) {
    console.log(error);
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

const findOneNotOwnerGTEToday = async (postid, email, date) => {
  try {
    let post = await Posts.findOne({
      where: {
        postid: postid,
        email: { [Op.ne]: email },
        [Op.or]: [
          { enddate: { [Op.gte]: date } },
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.gte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.log(error);
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
        [Op.or]: [
          { enddate: { [Op.gte]: today } },
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.gte]: today } }],
          },
        ],
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

const deleteOne = async (postid) => {
  try {
    const countPosts = await Posts.destroy({
      where: {
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });
    return countPosts;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const findAllOfUser = async (email) => {
  try {
    const passengerPosts = await Posts.findAll({
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return passengerPosts;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const deleteFavourite = async (postid) => {
  try {
    await Posts.update(
      {
        isFavourite: false,
      },
      { where: { postid: postid } }
    ).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const makeFavourite = async (postid) => {
  try {
    await Posts.update(
      {
        isFavourite: true,
      },
      { where: { postid: postid } }
    ).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const findAllFavourites = async (email) => {
  try {
    const allFavourites = await Posts.findAll({
      where: {
        email: email,
        isFavourite: true,
      },
      order: [["date", "DESC"]],
    }).catch((err) => {
      throw err;
    });

    return allFavourites;
  } catch (error) {
    console.log(error);
    return false;
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
  findOneNotOwnerGTEToday,
  deleteOne,
  findAllOfUser,
  deleteFavourite,
  makeFavourite,
  findAllFavourites,
};
