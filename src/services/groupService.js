// In src/services/Userservice.js
// *** ADD *** (methods for all the Users that access data in db)
const User = require("../database/User");
const Review = require("../database/Review");
const Request = require("../database/Request");
const Post = require("../database/Post");
const PostInt = require("../database/PostInterested");
const ToReview = require("../database/ToReview");
const Notification = require("../database/Notifications");
const ConvUsers = require("../database/ConvUsers");
const Group = require("../database/Group");
const { insertAver } = require("../utils/functions");
const moment = require("moment");
const _ = require("lodash");
const fun = require("../utils/functions");
const path = require("path");

// API /createGroup
const createGroup = async (req) => {
  try {
    let msg = await fun.determineLang(req);
    //data for group creation
    let extra = req.body.extra;
    let data = req.body;
    let admin = extra;
    let members = data.users;
    //insert pending=false into each member
    for await (let member of members) {
      member.pending = true;
    }
    let groupName = data.groupName;

    let finalData = {
      admin: admin,
      members: members,
      groupName: groupName,
    };

    //logic for creating group
    let response = await Group.create(finalData);
    if (response === false) {
      throw new Error("Group Creation Failed");
    }
    // SECTION 2 - GET GROUPS
    let results = await getGroupsOfUser(extra);
    let requests = await getActiveRequestsOfUser(extra);

    let getGroupsData = {
      asAdminGroups: results.allGroupsAsAdmin,
      asGuestGroups: results.allGroupsAsGuest,
      activeRequests: requests,
    };
    //return all groups
    return { status: 200, message: msg.groupCreated, data: getGroupsData };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const getGroupsOfUser = async (admin) => {
  try {
    //get all groups of the user that is admin
    let allGroupsAsAdmin = await Group.getAsAdmin(admin);
    if (allGroupsAsAdmin === false) {
      throw new Error("Getting groups Failed");
    }

    //get all groups of the user that is guest
    let allGroupsAsGuest = await Group.getAsGuest(admin);
    if (allGroupsAsGuest === false) {
      throw new Error("Getting groups Failed");
    }

    //for await for each group that the he is an admin
    for await (let group of allGroupsAsAdmin) {
      // update data of group
      group = await updateDataOfGroup(group);
    }

    //for await for each group that the he is a guest
    for await (let group of allGroupsAsGuest) {
      //UPDATE DATA OF group
      group = await updateDataOfGroup(group);
    }
    return {
      allGroupsAsAdmin: allGroupsAsAdmin,
      allGroupsAsGuest: allGroupsAsGuest,
    };
  } catch (error) {}
};

const updateDataOfGroup = async (group) => {
  let adminUser = await User.findOneLight(group.admin);
  if (adminUser === false) {
    throw new Error("Admin not found");
  }
  let ratingDataAdmin = await insertAver(adminUser);
  if (await fun.checkImagePath(adminUser.email)) {
    adminUser.imagePath = "images/" + adminUser.email + ".jpeg";
  } else {
    adminUser.imagePath = null;
  }
  let adminObject = {
    email: adminUser.email,
    fullname: adminUser.fullname,
    average: ratingDataAdmin.average,
    count: ratingDataAdmin.count,
    imagePath: adminUser.imagePath,
  };
  group.admin = adminObject;
  if (fun.IsJsonString(group.members) && group.members != null) {
    group.members = JSON.parse(group.members);
    //if members is not null
    if (group.members.length !== 0) {
      for await (let member of group.members) {
        let memberFullname = await User.findOneLight(member.email);
        member.fullname = memberFullname.fullname;
        //get average rating for each member
        let ratingData = await insertAver(member);
        member.average = ratingData.average;
        member.count = ratingData.count;
        //insert imagePath into member object
        if (await fun.checkImagePath(member.email)) {
          member.imagePath = "images/" + member.email + ".jpeg";
        } else {
          member.imagePath = null;
        }
      }
    }
  }
  return group;
};

const getActiveRequestsOfUser = async (email) => {
  try {
    //get all the invitations of the user
    let invitedTo = await Group.getAllInvitedTo(email);
    if (invitedTo === false) {
      throw new Error("Getting groups that i am invited Failed");
    }
    if (invitedTo.length === 0) {
      return [];
    }

    let invitations = [];
    //loop through all the invitations
    for await (let invitation of invitedTo) {
      //get the data of the admin of the group
      let adminUser = await User.findUserMinimal(invitation.admin);
      if (adminUser === false) {
        throw new Error("Admin not found");
      }
      let dataToPush = {
        admin: {
          email: adminUser.email,
          fullname: adminUser.fullname,
        },
        groupName: invitation.groupName,
        groupId: invitation.groupId,
      };
      invitations.push(dataToPush);
    }
    return invitations;
  } catch (error) {
    console.error(error);
  }
};

//API /getGroup
const getGroups = async (req) => {
  try {
    let extra = req.body.extra;
    let msg = await fun.determineLang(req);
    let allGroups = await Group.getAll(extra);
    if (allGroups === false) {
      throw new Error("Getting groups Failed");
    } else if (allGroups.length === 0) {
      return { status: 404, message: msg.noGroups };
    }
    console.log("Groups found for user", allGroups);
    // for each group
    for await (let group of allGroups) {
      //UPDATE DATA OF ADMIN
      let adminUser = await User.findOneLight(group.admin);
      if (adminUser === false) {
        throw new Error("Admin not found");
      }
      let ratingDataAdmin = await insertAver(adminUser);

      if (await fun.checkImagePath(adminUser.email)) {
        adminUser.imagePath = "images/" + adminUser.email + ".jpeg";
      } else {
        adminUser.imagePath = null;
      }

      let adminObject = {
        email: adminUser.email,
        fullname: adminUser.fullname,
        average: ratingDataAdmin.average,
        count: ratingDataAdmin.count,
        imagePath: adminUser.imagePath,
      };
      group.admin = adminObject;

      if (fun.IsJsonString(group.members) && group.members != null) {
        group.members = JSON.parse(group.members);
        //if members is not null
        if (group.members.length !== 0) {
          for await (let member of group.members) {
            let memberFullname = await User.findOneLight(member.email);
            member.fullname = memberFullname.fullname;
            //get average rating for each member

            let ratingData = await insertAver(member);
            member.average = ratingData.average;
            member.count = ratingData.count;
            //insert imagePath into member object
            if (await fun.checkImagePath(member.email)) {
              member.imagePath = "images/" + member.email + ".jpeg";
            } else {
              member.imagePath = null;
            }
          }
        }
      }
      //scan pending members list
      if (
        fun.IsJsonString(group.pendingMembers) &&
        group.pendingMembers != null
      ) {
        group.pendingMembers = JSON.parse(group.pendingMembers);
        //if members is not null
        if (group.pendingMembers.length !== 0) {
          for await (let member of group.pendingMembers) {
            let memberFullname = await User.findOneLight(member.email);
            member.fullname = memberFullname.fullname;
            //get average rating for each member
            let ratingData = await insertAver(member);
            member.average = ratingData.average;
            member.count = ratingData.count;
            //insert imagePath into member object
            if (await fun.checkImagePath(member.email)) {
              member.imagePath = "images/" + member.email + ".jpeg";
            } else {
              member.imagePath = null;
            }
          }
        }
      }
    }
    return { status: 200, message: msg.groupsFound, data: allGroups };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

module.exports = {
  createGroup,
  getGroups,
};
