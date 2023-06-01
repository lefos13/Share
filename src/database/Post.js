// inside src/database/Post.js

//ENVIROMENTAL VAR

// END OF SECTION (ENV VAR)

const { pushNotifications } = require("../utils/functions");
// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const fs = require("fs");
const moment = require("moment");

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

    const numOfPosts = await Posts.count({
      where: {
        date: { [Op.between]: [startDay, endDay] },
        email: user,
      },
    }).catch((err) => {
      throw err;
    });
    return numOfPosts;
  } catch (error) {
    console.error(error);
    return false;
  }
  // code to count posts of a user the current day
};

// *** ADD ***
const createNewPost = async (data, image, msg) => {
  try {
    var postdate = moment();
    data.date = postdate;

    const post = await Posts.create(data).catch((err) => {
      throw err;
    });
    if (image.includes("postimages")) {
      //create new image file from the existing
      console.log("CASE OF REPOSTING WITH IMAGE");
      const array = image.split("/");
      const oldPostId = array.split(".")[0];
      fs.copyFile(
        "postImages/" + oldPostId + ".jpeg",
        "postImages/" + post.postid + ".jpeg",
        (err) => {
          throw err;
        }
      );
    } else if (image == null) {
      console.log("POSTING WITH NO IMAGE");
    } else {
      console.log(`CASE OF PLAIN POSTING WITH IMAGE`);
      const postid = post.postid;
      //create new image file from the base64 string
      const base64 = image;
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync("postImages/" + postid + ".jpeg", buffer);
      await post.update({ image: "postimages/" + postid + ".jpeg" });
    }
    //get current date

    //!!!!!!!!!!!!!!!!!!!!!!!!!!!
    //Firebase newRide notification

    pushNotifications(post, msg);
    return post;
  } catch (error) {
    console.error(error);
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
    console.error(error);
    return false;
  }
};

/**
 * This is an asynchronous function that finds a post by its ID and returns it, or returns false if
 * there is an error.
 * @param postid - The parameter `postid` is the unique identifier of a post that is being searched for
 * in the database table `Posts`. The function `findOne` uses this parameter to search for a specific
 * post in the database and returns the post object if it exists, or `false` if it does not.
 * @returns The function `findOne` returns either the `postForFunction` object if the `Posts.findOne`
 * query is successful, or `false` if there is an error caught in the `try-catch` block.
 */
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
      order: [["date", "DESC"]],
    }).catch((err) => {
      throw err;
    });
    return all;
  } catch (error) {
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
    return false;
  }
};

const deleteFavourite = async (postid) => {
  try {
    await Posts.update(
      {
        isFavourite: false,
        favouriteDate: null,
      },
      { where: { postid: postid } }
    ).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const makeFavourite = async (postid) => {
  try {
    let curDate = moment();
    await Posts.update(
      {
        isFavourite: true,
        favouriteDate: curDate,
      },
      { where: { postid: postid } }
    ).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.error(error);
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
      order: [["favouriteDate", "DESC"]],
    }).catch((err) => {
      throw err;
    });

    return allFavourites;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findExpired = async (postid, date) => {
  try {
    const post = await Posts.findOne({
      where: {
        postid: postid,
        [Op.or]: [
          { enddate: { [Op.gte]: date } }, //enddate megalutero tou curdate
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
    console.error(error);
    return false;
  }
};

const findAllExpired = async (email, date) => {
  try {
    const post = await Posts.findAll({
      where: {
        email: email,
        [Op.or]: [
          { enddate: { [Op.lte]: date } }, //enddate megalutero tou curdate
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.lte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findAllActive = async (email, date) => {
  try {
    const post = await Posts.findAll({
      where: {
        email: email,
        [Op.or]: [
          { enddate: { [Op.gte]: date } }, //enddate megalutero tou curdate
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
    console.error(error);
    return false;
  }
};

const destroyAllPerIds = async (postids) => {
  try {
    const post = await Posts.destroy({
      where: {
        postid: postids,
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const globalAllExpired = async () => {
  try {
    let date = moment();
    const post = await Posts.findAll({
      where: {
        [Op.or]: [
          { enddate: { [Op.lte]: date } }, //enddate megalutero tou curdate
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.lte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = {
  globalAllExpired,
  destroyAllPerIds,
  findAllExpired,
  findAllActive,
  getAllPosts,
  findExpired,
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
