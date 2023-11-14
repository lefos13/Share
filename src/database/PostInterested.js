// inside src/database/PostInterested.js

//ENVIROMENTAL VAR

// END OF SECTION (ENV VAR)

// code for db
const { Op } = require("sequelize");

const PostInterested = require("../modules/postinterested");
const Groups = require("./Group");
const Post = require("./Post");
const { isJsonString } = require("../utils/functions");
const moment = require("moment");
// ==== code for db

// *** ADD ***
const checkIfInterestExists = async (groupId) => {
  try {
    const found = await PostInterested.findAll({ where: { groupId } });
    let flagOfExistingPost = null;
    for await (const interest of found) {
      const postData = await Post.findExpired(interest.postid, moment());
      if (postData !== null) {
        flagOfExistingPost = postData.postid;
      }
    }
    return flagOfExistingPost;
  } catch (error) {
    console.error(error);
    return new Error(error);
  }
};
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
    console.error("Inside findOne of postinterested:", error);
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
    console.error("Inside getCountofUser:", error);
    return null;
  }
};

// create an interest
const createInterest = async (row) => {
  try {
    const inter = await PostInterested.create(row).catch((err) => {
      throw err;
    });
    return inter;
  } catch (error) {
    console.error("Inside createInterest: ", error);
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
      order: [["date", "DESC"]],
    }).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.error("Inside findAny of postinterested:", error);
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

// count verified for specific postid
const countVerifiedEnchanced = async (postid) => {
  try {
    //find all interests of this postid
    const allIntersted = await PostInterested.findAll({
      where: {
        postid: postid,
        isVerified: true,
      },
    }).catch((err) => {
      throw err;
    });
    let countOfUsers = 0;
    for await (const interested of allIntersted) {
      //CHECK IF THE INTEREST IS OF A GROUP
      if (interested.groupId != null) {
        //get data of the group
        let groupData = await Groups.findOne(interested.groupId);
        if (groupData === false) {
          throw new Error("Group not found");
        }
        //count members of the group
        if (isJsonString(groupData.members)) {
          groupData.members = JSON.parse(groupData.members);
        }
        countOfUsers += groupData.members.length + 1;
      } else {
        countOfUsers++;
      }
    }
    return countOfUsers;
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
    console.error("Inside findAllVerifed of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

const findAllVerifedPerPost = async (email, postList) => {
  try {
    const found = await PostInterested.findAll({
      where: {
        email: email,
        isVerified: true,
        postid: postList,
      },
    }).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.error("Inside findAllVerifedPerPost of postinterested:", error);
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

const getAllVerifiedInterestsPerPost = async (postid) => {
  try {
    console.log(`post id ${postid}`);
    const postInterests = await PostInterested.findAll({
      where: {
        postid: postid,
        isVerified: true,
      },
    });

    return postInterests;
  } catch (error) {
    console.log(`error at getAllVerifiedInterestsPerPost: ${error}`);
    return new Error("Error at Database Layer");
  }
};

// *** ADD ***

module.exports = {
  countVerifiedEnchanced,
  getAllVerifiedInterestsPerPost,
  findAllVerifedPerPost,
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
  checkIfInterestExists,
};
