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
/**
 * This function creates a group and returns all groups associated with the user.
 * @param req - The `req` parameter is an object that contains information about the HTTP request made
 * to the server, including the request body, headers, and query parameters. It is likely that this
 * function is part of an Express.js or similar web framework application.
 * @returns An object with a status code and message, and data related to the groups created and the
 * user's groups and requests. If there is an error, only a status code is returned.
 */
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

/**
 * This function gets all the groups of a user, updates their data, and returns them categorized as
 * admin or guest.
 * @param admin - The user for whom we want to get all the groups they are a part of, either as an
 * admin or a guest.
 * @returns an object with two properties: "allGroupsAsAdmin" and "allGroupsAsGuest". The value of
 * "allGroupsAsAdmin" is an array of groups where the user is an admin and the value of
 * "allGroupsAsGuest" is an array of groups where the user is a guest.
 */
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

/**
 * This function updates the data of a group, including the admin and members' information and ratings.
 * @param group - The group object that needs to be updated with additional data.
 * @returns the updated `group` object with additional properties such as `admin.average`,
 * `admin.count`, `admin.imagePath`, `member.fullname`, `member.average`, `member.count`, and
 * `member.imagePath`.
 */
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
  if (fun.IsJsonString(group.members)) {
    group.members = JSON.parse(group.members);
  }

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

  return group;
};

/**
 * The function retrieves active requests of a user by getting all the invitations of the user and
 * returning the data of the admin of the group along with the group name and ID.
 * @param email - The email of the user for whom we want to get the active requests.
 * @returns The function `getActiveRequestsOfUser` returns an array of objects containing information
 * about the groups that the user has been invited to and their respective admins. Each object in the
 * array has the following properties:
 */
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
      let imagePath = null;
      if (await fun.checkImagePath(adminUser.email)) {
        imagePath = "images/" + adminUser.email + ".jpeg";
      }
      let ratingData = await insertAver(adminUser);

      let dataToPush = {
        admin: {
          email: adminUser.email,
          fullname: adminUser.fullname,
          imagePath: imagePath,
          average: ratingData.average,
          count: ratingData.count,
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
/**
 * This function retrieves groups and active requests of a user and returns them as data.
 * @param req - The `req` parameter is likely an HTTP request object that contains information about
 * the incoming request, such as headers, query parameters, and request body. It is used to extract the
 * `extra` property from the request body and pass it to other functions.
 * @returns An object with a status code, a message, and data. The status code is either 200 if the
 * function runs successfully or 500 if there is an error. The message is a string indicating that
 * groups have been found. The data is an object containing arrays of groups that the user is an admin
 * or guest of, as well as an array of active requests.
 */
const getGroups = async (req) => {
  try {
    let extra = req.body.extra;
    let msg = await fun.determineLang(req);

    let results = await getGroupsOfUser(extra);
    let requests = await getActiveRequestsOfUser(extra);

    let getGroupsData = {
      asAdminGroups: results.allGroupsAsAdmin,
      asGuestGroups: results.allGroupsAsGuest,
      activeRequests: requests,
    };
    return { status: 200, message: msg.groupsFound, data: getGroupsData };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

//service for deleting a group
/**
 * This function deletes a group and returns a success message or an error message.
 * @param req - The "req" parameter is likely an HTTP request object that contains information about
 * the incoming request, such as headers, query parameters, and request body. It is used in this
 * function to extract the request body, which contains the "extra" and "groupId" properties.
 * @returns an object with a status code and a message. If the group deletion is successful, the status
 * code is 200 and the message is "msg.groupDeleted". If there is an error, the status code is 500.
 */
const deleteGroup = async (req) => {
  try {
    let extra = req.body.extra;
    let msg = await fun.determineLang(req);
    let groupId = req.body.groupId;
    let admin = extra;
    // delete a group
    let response = await Group.destroy(admin, groupId);
    if (response === false) {
      throw new Error("Group Deletion Failed");
    }
    return { status: 200, message: msg.groupDeleted };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

//change name of a group
/**
 * This function changes the name of a group and returns a success message or an error message.
 * @param req - The "req" parameter is likely an HTTP request object that contains information about
 * the incoming request, such as the request body, headers, and query parameters. It is used to extract
 * information needed to change the name of a group and send a response back to the client.
 * @returns An object with a status code and a message. If the try block executes successfully, the
 * status code will be 200 and the message will be `msg.groupNameChanged`. If there is an error, the
 * status code will be 500.
 */
const changeName = async (req) => {
  try {
    let extra = req.body.extra;
    let msg = await fun.determineLang(req);
    let groupId = req.body.groupId;
    let newGroupName = req.body.name;
    let admin = extra;
    // change name of a group
    let response = await Group.changeGroupName(admin, groupId, newGroupName);
    if (response === false) {
      throw new Error("Group Name Change Failed");
    }
    return { status: 200, message: msg.groupNameChanged };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

//function that removes a member from a group
/**
 * The function removes a member from a group and returns a success message or an error message.
 * @param req - The "req" parameter is likely an HTTP request object that contains information about
 * the incoming request, such as the request headers, request body, and request method. It is used in
 * the "leaveGroup" function to extract information from the request body, such as the "extra" and
 * "groupId"
 * @returns an object with a status code and a message. If the try block executes successfully, it will
 * return an object with a status code of 200 and a message indicating that the user has left the
 * group. If there is an error, it will return an object with a status code of 500.
 */
const leaveGroup = async (req) => {
  try {
    let extra = req.body.extra;
    let msg = await fun.determineLang(req);
    let groupId = req.body.groupId;
    // remove a member from a group
    let response = await Group.leaveGroup(groupId, extra);
    if (response === false) {
      throw new Error("Group Member Deletion Failed");
    }
    return { status: 200, message: msg.leftGroup };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

//accept invitation service
/**
 * This function accepts an invitation to join a group and returns information about the user's groups
 * and requests.
 * @param req - The "req" parameter is likely an HTTP request object that contains information about
 * the incoming request, such as the request body, headers, and query parameters. It is used to extract
 * the necessary data to accept an invitation to a group and return a response with the updated group
 * information.
 * @returns An object with properties `status`, `message`, and `data`. The `status` property is set to
 * 200 if the invitation acceptance was successful, and 500 if there was an error. The `message`
 * property contains a message indicating whether the invitation was accepted or if there was an error.
 * The `data` property contains an object with properties `asAdminGroups`, `asGuestGroups
 */
const acceptInvitation = async (req) => {
  try {
    let invitedEmail = req.body.extra;
    let msg = await fun.determineLang(req);
    let groupId = req.body.groupId;
    // accept invitation
    let response = await Group.acceptInvitation(groupId, invitedEmail);
    if (response === false) {
      throw new Error("Invitation Acceptance Failed");
    }

    // get all the groups and requests of the user that is invited
    let results = await getGroupsOfUser(invitedEmail);
    let requests = await getActiveRequestsOfUser(invitedEmail);

    let getGroupsData = {
      asAdminGroups: results.allGroupsAsAdmin,
      asGuestGroups: results.allGroupsAsGuest,
      activeRequests: requests,
    };
    return {
      status: 200,
      message: msg.invitationAccepted,
      data: getGroupsData,
    };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

//decline invitation service
/**
 * The function declines a group invitation and returns a success message or an error.
 * @param req - The "req" parameter is likely an HTTP request object that contains information about
 * the incoming request, such as the request body, headers, and query parameters. It is used to extract
 * the necessary data to decline an invitation to a group.
 * @returns an object with a status code and a message. If the invitation decline is successful, it
 * will return a status code of 200 and a message indicating that the invitation has been declined. If
 * there is an error, it will return a status code of 500.
 */
const declineInvitation = async (req) => {
  try {
    let invitedEmail = req.body.extra;
    let msg = await fun.determineLang(req);
    let groupId = req.body.groupId;
    // decline invitation
    let response = await Group.declineInvitation(groupId, invitedEmail);
    if (response === false) {
      throw new Error("Invitation Declination Failed");
    }
    return { status: 200, message: msg.invitationDeclined };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

module.exports = {
  declineInvitation,
  acceptInvitation,
  leaveGroup,
  changeName,
  deleteGroup,
  createGroup,
  getGroups,
};
