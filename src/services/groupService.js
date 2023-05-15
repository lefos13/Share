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
const ConvGroup = require("../database/ConvGroups");
const { insertAver } = require("../utils/functions");
const moment = require("moment");
const _ = require("lodash");
const fun = require("../utils/functions");
const path = require("path");
const socket = require("../index");

// API /createGroup
/**
 * This function creates a group with specified members and returns all groups associated with the
 * admin.
 * @param req - The `req` parameter is an object that contains the request information sent by the
 * client to the server. It typically includes information such as the HTTP method, headers, and body
 * of the request.
 * @returns An object with a status code and a message, and possibly some data. If there is an error,
 * only a status code is returned.
 */
const createGroup = async (req) => {
  const io = socket.io;
  try {
    const msg = await fun.determineLang(req);
    // Extract data for group creation
    const { extra, users, groupName } = req.body;
    const admin = extra;
    const members = users.map((user) => ({ ...user, pending: true }));

    // Create the group
    const groupCreated = await Group.create({
      admin,
      members,
      groupName,
    });
    if (groupCreated === false) {
      throw new Error("Group creation failed");
    }

    console.log("GROUP THAT WAS CREATED", groupCreated);
    //extract the converted id of the group
    const extractedConvId = await fun.extractConvid(
      await Group.findOne(groupCreated.groupId)
    );
    if (extractedConvId instanceof Error) {
      throw extractedConvId;
    }

    console.log("EXTRACTED CONV ID", extractedConvId);
    //prepare data for group chat
    const data = {
      convid: extractedConvId,
      messages: null,
      groupId: groupCreated.groupId,
      pending: true,
    };

    //create Group chat
    const groupChat = await ConvGroup.saveOne(data);
    if (groupChat instanceof Error) {
      throw groupChat;
    }

    //send events for new group
    newGroupChat(admin, groupChat);

    // Get all groups
    const results = await getGroupsOfUser(extra);
    const requests = await getActiveRequestsOfUser(extra);
    const getGroupsData = {
      asAdminGroups: results.allGroupsAsAdmin,
      asGuestGroups: results.allGroupsAsGuest,
      activeRequests: requests,
    };

    // Return all groups
    return { status: 200, message: msg.groupCreated, data: getGroupsData };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }

  async function newGroupChat(admin, groupChat) {
    try {
      let adminData = await User.findOneLight(admin);
      if (!adminData) {
        throw new Error(
          "Failed to find admin inside newGroupChat(sending events)"
        );
      }
      let group = await Group.findOne(groupChat.groupId);
      let socketList = await io.fetchSockets();
      for (const socket of socketList) {
        if (socket.id === adminData.socketId) {
          console.log(
            "ADMIN FOUND ONLINE AND THE RIGHT SOCKET IS IN DB",
            socket.id === adminData.socketId
          );
          socket.join(groupChat.groupId + "-" + groupChat.convid);
          break;
        }
      }
      const ratingData = await insertAver(adminData);
      //prepare data for group chat
      const data = {
        conversationId: groupChat.groupId + "-" + groupChat.convid,
        socketId: adminData.socketId,
        username: group.groupName,
        photo: (await fun.checkImagePath(adminData.email))
          ? `images/${adminData.email}.jpeg`
          : null,
        email: adminData.email,
        average: ratingData.average,
        count: ratingData.count,
        isGroupInterest: false,
        members: null,
        isUserOnline: false,
        expiresIn: null,
        messages: [],
        isRead: true,
        lastMessage: null,
        lastMessageTime: null,
        isLastMessageMine: false,
        messagesLeft: false,
        pending: true,
      };
      //send user the chat data
      console.log("EMITTING NEW GROUP CHAT TO ADMIN", adminData.socketId);
      io.to(adminData.socketId).emit("action", {
        type: "onGroupConversationAdded",
        data: {
          conversation: data,
        },
      });
    } catch (error) {
      console.error(error);
      return new Error("Failed to send events for new Chat");
    }
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
    // Get all groups of the user that is admin
    const allGroupsAsAdmin = await Group.getAsAdmin(admin);
    if (!allGroupsAsAdmin) {
      throw new Error("Failed to get groups");
    }

    // Get all groups of the user that is guest
    const allGroupsAsGuest = await Group.getAsGuest(admin);
    if (!allGroupsAsGuest) {
      throw new Error("Failed to get groups");
    }

    // Update data of each group that the user is an admin of
    const updatedGroupsAsAdmin = await Promise.all(
      allGroupsAsAdmin.map(updateDataOfGroup)
    );

    // Update data of each group that the user is a guest of
    const updatedGroupsAsGuest = await Promise.all(
      allGroupsAsGuest.map(updateDataOfGroup)
    );

    return {
      allGroupsAsAdmin: updatedGroupsAsAdmin,
      allGroupsAsGuest: updatedGroupsAsGuest,
    };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
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
  const io = socket.io;
  try {
    let extra = req.body.extra;
    let msg = await fun.determineLang(req);
    let groupId = req.body.groupId;
    let admin = extra;
    // check if there is an interest with this group of users
    let interested = await PostInt.checkIfInterestExists(groupId);
    if (interested instanceof Error) {
      throw interested;
    } else if (interested != null) {
      return {
        status: 405,
        message: msg.notAllowedToDelete,
        postid: interested,
      };
    }

    // delete a group
    let response = await Group.destroy(admin, groupId);
    if (response === false) {
      throw new Error("Group Deletion Failed");
    }
    //inform users that a group chat has been deleted
    let groupChat = await ConvGroup.findOneByGroupId(groupId);
    io.to(groupChat.groupId + "-" + groupChat.convid).emit("action", {
      type: "onGroupConversationRemoved",
      data: {
        conversation: groupChat.convid,
      },
    });
    //delete chat of group
    let chatDeleted = await ConvGroup.deleteOneByGroupId(groupId);
    if (chatDeleted === false) {
      throw new Error("Chat Deletion Failed");
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
    let interestData = await PostInt.checkIfInterestExists(groupId);
    if (interestData instanceof Error) {
      throw interestData;
    } else if (interestData != null) {
      return {
        status: 405,
        message: msg.notAllowedToLeave,
        postid: interestData,
      };
    }
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
    const io = socket.io;

    let userInvited = await User.findOneLight(invitedEmail);
    if (userInvited === false) {
      throw new Error("Error at finding initiatior of service " + invitedEmail);
    }

    // accept invitation
    const group = await Group.acceptInvitation(groupId, invitedEmail);
    if (group === false) {
      throw new Error("Invitation Acceptance Failed");
    }

    let members = group.members;
    if (fun.IsJsonString(members)) members = JSON.parse(members);
    let isChatStillPending = false;
    members.forEach((member) => {
      if (member.pending === true) {
        isChatStillPending = true;
      }
    });

    const groupChat = await ConvGroup.findOneByGroupId(group.groupId);

    //EMIT EVENT OF GROUP CHAT TO MEMBER
    const socketList = await io.fetchSockets();
    const userSocket = socketList.find(
      (val) => val.id === userInvited.socketId
    );
    userSocket.join(groupChat.convid);

    if (!isChatStillPending) {
      console.log("GROUP CHAT IS NOT PENDING ANYMORE");
      //EMIT EVENTS THAT GROUP CHAT IS NOT PENDING ANYMORE
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
    let group = await Group.declineInvitation(groupId, invitedEmail);
    if (group === false) {
      throw new Error("Invitation Declination Failed");
    }
    let members = group.members;
    if (fun.IsJsonString(members)) members = JSON.parse(members);
    let isChatStillPending = false;
    members.forEach((member) => {
      if (member.pending === true) {
        isChatStillPending = true;
      }
    });

    if (!isChatStillPending) {
      console.log("GROUP CHAT IS NOT PENDING ANYMORE");
      //EMIT EVENTS THAT GROUP CHAT IS NOT PENDING ANYMORE
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
