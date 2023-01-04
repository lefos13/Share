// inside src/database/PostInterested.js

//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
// END OF SECTION (ENV VAR)

// code for db
const { Op } = require("sequelize");

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
// ==== code for db

// *** ADD ***

//function that count posts for a user the current day
const findOne = async (email, postid) => {
  try {
    const found = await PostInterested.findOne({
      where: {
        email: email,
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.log("Inside findOne of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

// destroy the interest
const destroyOne = async (email, postid) => {
  try {
    const deleted = await PostInterested.destroy({
      where: {
        email: email,
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    return false;
  }
};

//get the count of interests between two dates of a user
const getCountOfUser = async (email, starttime, curtime) => {
  try {
    const count = await PostInterested.count({
      where: {
        email: email,
        date: { [Op.between]: [starttime, curtime] },
      },
    }).catch((err) => {
      throw err;
    });
    return count;
  } catch (error) {
    console.log("Inside getCountofUser:", error);
    return null;
  }
};

// create an interest
const createInterest = async (row) => {
  try {
    const inter = await PostInterested.create(row).catch((err) => {
      throw err;
    });
    // console.log(row.date, inter.date);
    return inter;
  } catch (error) {
    console.log("Inside createInterest: ", error);
    return false;
  }
};

// find all interests of a user
const findAny = async (email) => {
  try {
    const found = await PostInterested.findAll({
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.log("Inside findAny of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

const countInterestedOfPost = async (postid, email) => {
  try {
    const countInt = await PostInterested.count({
      where: {
        postid: postid,
        email: { [Op.ne]: email },
      },
    }).catch((err) => {
      throw err;
    });
    return countInt;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const updateNotify = async (postInt) => {
  try {
    await postInt.update({ isNotified: true }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// find all per id of post
const findAllPerId = async (postid) => {
  try {
    const interested = await PostInterested.findAll({
      where: {
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });
    return interested;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// destroy all interested users per post id
const detroyAllPerPost = async (postid) => {
  try {
    const interested = await PostInterested.destroy({
      where: {
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.log(error);
    return null;
  }
};

//delete one interest
const deleteOne = async (piid) => {
  try {
    const del = await PostInterested.destroy({
      where: {
        piid: piid,
      },
    }).catch((err) => {
      throw err;
    });
    return del;
  } catch (error) {
    console.log(error);
    return null;
  }
};

//find one interest by id
const findOneById = async (piid) => {
  try {
    const results = await PostInterested.findOne({
      where: {
        piid: piid,
      },
    }).catch((err) => {
      throw err;
    });
    return results;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// count verified for specific postid
const countVerified = async (postid) => {
  try {
    const allIntersted = await PostInterested.count({
      where: {
        postid: postid,
        isVerified: true,
      },
    }).catch((err) => {
      throw err;
    });
    return allIntersted;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const updateVerify = async (postInt) => {
  try {
    await postInt.update({ isVerified: true }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

//reset every flag of an interest (notified, verified)
const resetFlags = async (postInt) => {
  try {
    await postInt
      .update({ isVerified: false, isNotified: false })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getInterestedIfVerified = async (postid, email) => {
  try {
    const intP = await PostInterested.findOne({
      where: {
        postid: postid,
        email: email,
        isVerified: true,
      },
    }).catch((err) => {
      throw err;
    });
    return intP;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// find all interests of a user that are verified
const findAllVerifed = async (email) => {
  try {
    const found = await PostInterested.findAll({
      where: {
        email: email,
        isVerified: true,
      },
    }).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.log("Inside findAny of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

const findAllperUser = async (email) => {
  try {
    const all = await PostInterested.findAll({
      where: {
        email: email,
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
// destroy all interested users per post id
const detroyAllPerUser = async (postid, email) => {
  try {
    const deleted = await PostInterested.destroy({
      where: {
        postid: postid,
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// destroy all interested users per post id
const destroyPerArrayIds = async (postids) => {
  try {
    const deleted = await PostInterested.destroy({
      where: {
        postid: postids,
      },
    }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// *** ADD ***

module.exports = {
  destroyPerArrayIds,
  findAllperUser,
  detroyAllPerUser,
  findOne,
  findAllVerifed,
  destroyOne,
  getCountOfUser,
  createInterest,
  findAny,
  countInterestedOfPost,
  updateNotify,
  findAllPerId,
  detroyAllPerPost,
  deleteOne,
  findOneById,
  countVerified,
  updateVerify,
  resetFlags,
  getInterestedIfVerified,
};
