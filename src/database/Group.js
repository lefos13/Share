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
const { IsJsonString } = require("../utils/functions");
const sequelize = new Sequelize(DATABASEE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

const fun = require("../utils/functions");

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
    //   [Op.or]: [
    //     Sequelize.fn('JSON_CONTAINS',
    //         Sequelize.fn('JSON_EXTRACT', Sequelize.col('roles'), Sequelize.literal('"$[*].role"')),
    //         '"user"'),
    //     Sequelize.fn('JSON_CONTAINS',
    //         Sequelize.fn('JSON_EXTRACT', Sequelize.col('roles'), Sequelize.literal('"$[*].role"')),
    //         '"business"')
    // ]
    let groups = await Groups.findAll({
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

    let finalGroups = [];
    //loop through groups knowing the index of array
    for await (let group of groups) {
      // loop through members of the group
      if (IsJsonString(group.members)) {
        group.members = JSON.parse(group.members);
      }
      //check equality of emails and if pending = false
      for await (let member of group.members) {
        // if the member is the current user
        if (member.email === email && member.pending === false) {
          finalGroups.push(group);
        }
      }
    }

    return finalGroups;
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
    // console.log("Found groups i am invited:", groups.length);
    let pendingInvites = [];
    // for each group
    for await (let group of groups) {
      // loop through all the members of the group

      group.members = JSON.parse(group.members);

      for await (let member of group.members) {
        console.log("User Checking: ", member);
        // if the member is the current user
        if (member.email === email && member.pending === true) {
          // console.log("Found user in members list with pending invite");
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

//delete a group
const destroy = async (email, groupId) => {
  try {
    await Groups.destroy({
      where: {
        groupId: groupId,
        admin: email,
      },
    }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

//change name of a group - function name = changeGroupName
const changeGroupName = async (email, groupId, groupName) => {
  try {
    await Groups.update(
      {
        groupName: groupName,
      },
      {
        where: {
          groupId: groupId,
          admin: email,
        },
      }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

//leaveGroup a member from a group
const leaveGroup = async (groupId, email) => {
  try {
    // get the group based on the groupId
    const group = await Groups.findOne({
      where: {
        groupId: groupId,
      },
    });
    // get the members of the group
    group.members = JSON.parse(group.members);

    // remove the member from the group
    group.members = group.members.filter((member) => member.email !== email);

    //if group.members is not empty
    if (group.members.length > 0) {
      await group
        .update({
          members: group.members,
        })
        .catch((err) => {
          throw err;
        });
    } else {
      //destroy the group
      await Groups.destroy({
        where: {
          groupId: groupId,
        },
      }).catch((err) => {
        throw err;
      });
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

//make pending=false of a member of a group. function name = acceptInvitation
const acceptInvitation = async (groupId, email) => {
  try {
    //get the group based on the groupId
    const group = await Groups.findOne({
      where: {
        groupId: groupId,
      },
    });
    //get the members of the group
    group.members = JSON.parse(group.members);
    //loop through all the members of the group
    for await (let member of group.members) {
      // if the member is the current user
      if (member.email === email) {
        // set the pending to false
        member.pending = false;
      }
    }
    await group
      .update({
        members: group.members,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

//remove member of a group. Funtion name = declineInvitation
const declineInvitation = async (groupId, email) => {
  try {
    //get the group based on the groupId
    const group = await Groups.findOne({
      where: {
        groupId: groupId,
      },
    });
    //get the members of the group
    group.members = JSON.parse(group.members);

    //remove member form the list of members of the group
    group.members = group.members.filter((member) => member.email !== email);

    await group
      .update({
        members: group.members,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = {
  declineInvitation,
  acceptInvitation,
  leaveGroup,
  changeGroupName,
  destroy,
  getAllInvitedTo,
  getAsGuest,
  getAsAdmin,
  create,
  getAll,
};
