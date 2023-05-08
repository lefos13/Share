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

/**
 * This function creates a new group and returns true if successful, otherwise it returns false and
 * logs an error.
 * @param data - The `data` parameter is an object that contains the information needed to create a new
 * group. It likely includes properties such as the group name, description, and members. The `Groups`
 * object is likely a model or schema for a database that stores information about groups. The `create`
 * method is
 * @returns The `create` function is returning a boolean value. If the `Groups.create` operation is
 * successful, it returns `true`. If there is an error, it catches the error and logs it to the
 * console, then returns `false`.
 */
const create = async (data) => {
  try {
    const group = await Groups.create(data).catch((err) => {
      throw err;
    });
    return group;
  } catch (error) {
    console.error("Inside findOne of postinterested:", error);
    return false;
  }
  // code to count posts of a user the current day
};

/**
 * The function retrieves all groups where the given email is either an admin or a member.
 * @param email - The email parameter is a string that represents the email address of a user. This
 * function uses the email parameter to find all the groups where the user is a member or an admin.
 * @returns The function `getAll` is returning a Promise that resolves to an array of `Groups` objects
 * that match the specified criteria. If there is an error, it returns `false`.
 */
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

/**
 * This function retrieves all groups where the specified email is the admin.
 * @param email - The email parameter is a string that represents the email address of the admin user.
 * This function uses the email parameter to query the database for all groups where the admin is the
 * user with the specified email address.
 * @returns The function `getAsAdmin` returns a promise that resolves to an array of `Groups` where the
 * `admin` property matches the `email` parameter. If there is an error, it returns `false`.
 */
const getAsAdmin = async (email) => {
  try {
    const groups = await Groups.findAll({
      where: {
        admin: email,
      },
      //order by isCreated
      order: [["isCreated", "DESC"]],
    });
    return groups;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function retrieves groups where a given email is a member and not pending.
 * @param email - The email of the user for whom we want to retrieve the groups they belong to.
 * @returns The function `getAsGuest` returns an array of groups that the guest with the given email is
 * a member of and has been approved to join.
 */
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
      order: [["isCreated", "DESC"]],
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

/**
 * This function retrieves all groups that a user is invited to and have pending invites.
 * @param email - The email of the user for whom we want to retrieve all the groups they are invited
 * to.
 * @returns an array of groups that the user with the given email is invited to and has a pending
 * invitation.
 */
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

/**
 * This is an asynchronous function that attempts to delete a group with a specific ID and admin email,
 * returning true if successful and false if there was an error.
 * @param email - The email of the admin who is trying to destroy the group.
 * @param groupId - The ID of the group that needs to be destroyed.
 * @returns a boolean value. If the `Groups.destroy` operation is successful, it will return `true`. If
 * there is an error, it will log the error to the console and return `false`.
 */
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

/**
 * This function updates the name of a group if the email provided is the admin of the group.
 * @param email - The email of the user who is the admin of the group and wants to change the group
 * name.
 * @param groupId - The ID of the group that needs to be updated.
 * @param groupName - The new name for the group that needs to be updated.
 * @returns a boolean value - `true` if the update operation was successful and `false` if there was an
 * error.
 */
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

/**
 * The function removes a member from a group and deletes the group if there are no members left.
 * @param groupId - The ID of the group that the member wants to leave.
 * @param email - The email of the member who wants to leave the group.
 * @returns a boolean value - `true` if the member was successfully removed from the group, and `false`
 * if there was an error.
 */
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

/**
 * This function accepts an invitation to join a group by updating the group's member list to mark the
 * user as no longer pending.
 * @param groupId - The ID of the group that the invitation is for.
 * @param email - The email of the member whose invitation is being accepted.
 * @returns a boolean value - `true` if the update is successful and `false` if there is an error.
 */
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
/**
 * This function removes a member from a group's list of members based on their email address.
 * @param groupId - The ID of the group from which the invitation is being declined.
 * @param email - The email of the member who is declining the invitation to the group.
 * @returns a boolean value - `true` if the member was successfully removed from the group, and `false`
 * if there was an error.
 */
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

const getPendingUsers = async (groupId) => {
  try {
    const users = await Groups.findOne({
      where: {
        groupId: groupId,
      },
    }).catch((err) => {
      throw err;
    });
    if (IsJsonString(users.members)) {
      users.members = JSON.parse(users.members);
    }
    //loop through all the members of the group
    for await (let member of users.members) {
      // if the member is the current user
      if (member.pending === true) {
        // return the group
        return true;
      }
    }
    return "ok";
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * This is an asynchronous function that finds a group by its ID and returns it, or returns false if
 * there is an error.
 * @param groupId - The parameter `groupId` is a unique identifier for a group that is being searched
 * for in the database. It is used in the `where` clause of the Sequelize query to find a specific
 * group with the matching `groupId` value.
 * @returns The `findOne` function is returning a Promise that resolves to either the `group` object if
 * it is found in the database, or `false` if there is an error.
 */
const findOne = async (groupId) => {
  try {
    const group = await Groups.findOne({
      where: {
        groupId: groupId,
      },
    });
    return group;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const isGroupMember = async (postid, groupId) => {
  try {
    //get post of postid
    const post = await Posts.findOne({
      where: {
        postid: postid,
      },
    });
    //get group of groupId
    const group = await Groups.findOne({
      where: {
        groupId: groupId,
      },
    });
    const postOwner = post.email;
    //Parse the group members
    if (IsJsonString(group.members)) {
      group.members = JSON.parse(group.members);
    }
    //loop through all the members of the group
    for await (let member of group.members) {
      // if the member is the current user
      if (member.email === postOwner) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error(err);
    return new Error(err);
  }
};
module.exports = {
  isGroupMember,
  findOne,
  getPendingUsers,
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
