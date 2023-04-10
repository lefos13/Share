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

const createGroup = async (req) => {
  try {
    let msg = await fun.determineLang(req);
    //data for group creation
    let extra = req.body.extra;
    let data = req.body.data;
    let admin = extra;
    let pendingMembers = data.Users;
    let groupName = data.groupName;

    for await (let member of pendingMembers) {
      //do stuff for each member
    }

    let finalData = {
      admin: admin,
      pendingMembers: pendingMembers,
      members: null,
      groupName: groupName,
    };

    //logic for creating group
    let response = await Group.create(finalData);
    if (response === false) {
      throw new Error("Group Creation Failed");
    }
    //get all groups of the user
    let allGroups = await Group.getAll(email);
    console.log("Groups found for user", allGroups);
    // for each group
    for await (let group of allGroups) {
      if (fun.IsJsonString(group.members)) {
        group.members = JSON.parse(group.members);
      }
      //if members is not null
      if (group.members.length !== 0) {
        for await (let member of group.members) {
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
    //return all groups
    return { status: 200, message: msg.groupCreated, data: allGroups };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

module.exports = {
  createGroup,
};
