// inside src/database/PostInterested.js

//ENVIROMENTAL VAR

// END OF SECTION (ENV VAR)

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const Groups = require("../modules/group");
// ==== code for db

//
const { HOST, USERR, PASS, DATABASEE } = process.env;
const { Op } = require("sequelize");
const { Sequelize, DataTypes, fn } = require("sequelize");
const sequelize = new Sequelize(DATABASEE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

//function that count posts for a user the current day
const create = async (data) => {
  try {
    await Groups.create(data).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error("Inside findOne of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

//get all groups of a user
const getAll = async (email) => {
  try {
    const groups = await Groups.findAll({
      where: {
        [Op.or]: [
          sequelize.literal(
            `JSON_CONTAINS(JSON_EXTRACT(members, "$[*].email"), '"` +
              email +
              `"')`
          ),
          { admin: email },
        ],
      },
    });
    return groups;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getAsAdmin = async (email) => {
  try {
    const groups = await Groups.findAll({
      where: {
        admin: email,
      },
    });
    return groups;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getAsGuest = async (email) => {
  try {
    const groups = await Groups.findAll({
      where: {
        [Op.or]: [
          sequelize.literal(
            `JSON_CONTAINS(JSON_EXTRACT(members, "$[*].email"), '"` +
              email +
              `"')`
          ),
        ],
      },
    });
    return groups;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getAllInvitedTo = async (email) => {
  try {
    const groups = await Groups.findAll({
      where: {
        [Op.or]: [
          sequelize.literal(
            `JSON_CONTAINS(JSON_EXTRACT(members, "$[*].email"), '"` +
              email +
              `"')`
          ),
        ],
      },
    });

    let pendingInvites = [];
    // for each group
    for await (let group of groups) {
      // loop through all the members of the group
      for await (let member of group.members) {
        // if the member is the current user
        if (member.email === email && member.pending === true) {
          // return the group
          pendingInvites.push(group);
        }
      }
    }
    return pendingInvites;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = {
  getAllInvitedTo,
  getAsGuest,
  getAsAdmin,
  create,
  getAll,
};
