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
const {
  insertAver,
  onGroupRequestReceived,
  onGroupRequestAccepted,
  onGroupRequestDeclined,
} = require("../utils/functions");
const moment = require("moment");
const _ = require("lodash");
const fun = require("../utils/functions");
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

    //send notifications to members of group
    onGroupRequestReceived(groupCreated);

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
          socket.join(groupChat.groupId.toString());
          break;
        }
      }
      const ratingData = await insertAver(adminData);
      //prepare data for group chat
      const data = {
        conversationId: groupChat.groupId + "," + groupChat.convid,
        socketId: adminData.socketId,
        username: group.groupName,
        photo: (await fun.checkImagePath(adminData.email))
          ? `images/${adminData.email}.jpeg`
          : null,
        email: adminData.email,
        average: ratingData.average,
        count: ratingData.count,
        isGroupInterest: false,
        members: [],
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
      //get members data
      data.members = await fun.returnAllMembers(group);
      //Check if other users of group are online
      let emails = groupChat.convid.split(" ");
      emails = emails.filter((email) => email !== adminData.email);
      emails = await Promise.all(
        emails.map(async (email) => await User.findOneLight(email))
      );
      await Promise.all(
        emails.map(async (email) => {
          const socket = socketList.find(
            (socket) => socket.id === email.socketId
          );
          if (socket) {
            console.log(`FOUND ONLINE USER ${email.email}`);
            data.isUserOnline = true;
          }
        })
      );

      //send user the chat data
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
  try {
    group.members = JSON.parse(group.members);
  } catch (error) {
    // console.error("Already a JSON object");
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
      console.log(
        "FOUND POST THAT IS ACTIVE WITH POSTID " +
          interested +
          " WITH AN INSTEREST OF THIS GROUP ID,",
        groupId
      );
      return {
        status: 405,
        message: msg.notAllowedToDelete,
        postid: interested,
      };
    }
    //inform users that a group chat has been deleted
    let groupChat = await ConvGroup.findOneByGroupId(groupId);
    if (groupChat instanceof Error) {
      throw groupChat;
    }

    // delete a group
    let response = await Group.destroy(admin, groupId);
    if (response === false) {
      throw new Error("Group Deletion Failed");
    }

    //inform users that a group chat has been deleted
    console.log(
      `Sending in room ${groupId.toString()} that chat has been deleted`
    );
    io.to(groupId.toString()).emit("action", {
      type: "onGroupConversationRemoved",
      data: {
        conversation: groupChat.groupId + "," + groupChat.convid,
      },
    });
    //delete chat of group
    let chatDeleted = await ConvGroup.deleteOneByGroupId(groupId);
    if (chatDeleted === false) {
      throw new Error("Chat Deletion Failed");
    }
    //delete all personal (group) chats by groupId
    let personalChatsDeleted = await ConvUsers.deleteManyByGroupId(groupId);
    if (personalChatsDeleted instanceof Error) {
      throw personalChatsDeleted;
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
  const io = socket.io;
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
    let groupChat = await ConvGroup.findOneByGroupId(groupId);
    if (groupChat instanceof Error) {
      throw groupChat;
    }
    io.to(groupChat.groupId.toString()).emit("action", {
      type: "onGroupConversationNameChanged",
      data: {
        conversationId: groupChat.groupId + "," + groupChat.convid,
        newName: newGroupName,
      },
    });
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
  const io = socket.io;
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
    let groupChatData = await ConvGroup.findOneByGroupId(groupId);
    if (groupChatData instanceof Error) {
      throw new Error("Group Not Found");
    }
    // remove a member from a group
    let response = await Group.leaveGroup(groupId, extra);
    if (response instanceof Error) {
      throw response;
    } else if (response === "Left") {
      //Change members in group chat
      const responseRemoval = await ConvGroup.removeMembers(groupId, extra);
      if (responseRemoval instanceof Error) {
        throw responseRemoval;
      }
      let userThatLeft = await User.findOneLight(extra);
      //send event to user that group chat is removed from him/her
      io.to(userThatLeft.socketId).emit("action", {
        type: "onGroupConversationRemoved",
        data: {
          conversation: groupChatData.groupId + "," + groupChatData.convid,
        },
      });

      //Send events to group for changes to rest of group
      fun.sendUpdatedGroupChatData(groupId, false);
      return { status: 200, message: msg.leftGroup };
    } else if (response === "Destroyed") {
      //Destroy chat of group
      let chatDeleted = await ConvGroup.deleteOneByGroupId(groupId);
      if (chatDeleted instanceof Error) {
        throw chatDeleted;
      }
      //Send events to group for removal
      fun.sendRemovedGroupChatData(groupId + "," + groupChatData.convid);
      return { status: 200, message: msg.leftGroup };
    }
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
    if (fun.isJsonString(members)) members = JSON.parse(members);
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
    if (userSocket != null) {
      userSocket.join(groupChat.groupId.toString());
    }

    onGroupRequestAccepted(group, userInvited);

    if (!isChatStillPending) {
      console.log("GROUP CHAT IS NOT PENDING ANYMORE");
      //EMIT EVENTS THAT GROUP CHAT IS NOT PENDING ANYMORE
      let userEmails = groupChat.convid.split(" ");
      await Promise.all(
        userEmails.map(async (email) => {
          const user = await User.findOneLight(email);
          if (user === false) {
            throw new Error("Error at finding a user");
          }
          const adminData = await User.findOneLight(group.admin);
          if (adminData === false) throw new Error("Admin not found");
          const ratingData = await insertAver(adminData);
          if (ratingData === false) throw new Error("Rating not found");

          const data = {
            conversationId: group.groupId + "," + groupChat.convid,
            socketId: adminData.socketId,
            username: group.groupName,
            photo: (await fun.checkImagePath(adminData.email))
              ? `images/${adminData.email}.jpeg`
              : null,
            email: adminData.email,
            average: ratingData.average,
            count: ratingData.count,
            isGroupInterest: false,
            members: [],
            isUserOnline: false,
            expiresIn: null,
            messages: [],
            isRead: true,
            lastMessage: null,
            lastMessageTime: null,
            isLastMessageMine: false,
            messagesLeft: false,
            pending: false,
          };

          const socketList = await io.fetchSockets();

          const socket = socketList.find((soc) => soc.id === user.socketId);
          if (socket != null) {
            console.log(
              `User invited ${user.email} joined the room of group ${group.groupId} with id ${data.conversationId}`
            );
            //join the room for conversation
            socket.join(group.groupId.toString());
          }

          let emails = groupChat.convid
            .split(" ")
            .filter((email) => email !== user.email);

          await Promise.all(
            emails.map(async (email) => {
              let userData = await User.findOneLight(email);
              if (
                socketList.find((soc) => soc.id == userData.socketId) &&
                !req.app.locals.bg[userData.email]
              ) {
                console.log(`User ${userData.email} is ONLINE`);
                data.isUserOnline = true;
              }
            })
          );
          //get all the members of the group
          data.members = await fun.returnAllMembers(group);
          console.log(
            "MEMBERS AFTER ALL DATA ARE INSERTED WITH ADMIN TOO!",
            group.groupId
          );
          if (user.email != group.admin) {
            console.log(
              `SENDING NEW GROUP CHAT TO USER ${user.email} OF GROUP ${group.groupId}`
            );
            if (socket != null) {
              socket.emit("action", {
                type: "onGroupConversationAdded",
                data: {
                  conversation: data,
                },
              });
            }
          } else {
            io.to(adminData.socketId).emit("action", {
              type: "onGroupConversationPendingUpdated",
              data: {
                conversationId: data.conversationId,
                pending: false,
              },
            });
          }
        })
      );
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
  const io = socket.io;
  try {
    let invitedEmail = req.body.extra;
    let msg = await fun.determineLang(req);
    let groupId = req.body.groupId;
    let groupChatData = await ConvGroup.findOneByGroupId(groupId);
    let groupData = await Group.findOne(groupId);
    // decline invitation
    let group = await Group.declineInvitation(groupId, invitedEmail);

    if (group === false) {
      throw new Error("Invitation Declination Failed");
    } else if (group === "Updated") {
      //update the group chat
      const responseRemoval = await ConvGroup.removeMembers(
        groupId,
        invitedEmail
      );
      if (responseRemoval instanceof Error) {
        throw responseRemoval;
      }

      let newGroupData = await Group.findOne(groupId);
      if (newGroupData === false) {
        throw new Error("Group Not Found");
      }

      let members = newGroupData.members;
      if (fun.isJsonString(members)) members = JSON.parse(members);
      let isChatStillPending = false;
      members.forEach((member) => {
        if (member.pending === true) {
          isChatStillPending = true;
        }
      });

      if (!isChatStillPending) {
        console.log("GROUP CHAT IS NOT PENDING ANYMORE");
        //EMIT EVENTS THAT GROUP CHAT IS NOT PENDING ANYMORE
        const groupChat = await ConvGroup.findOneByGroupId(groupId);
        const group = await Group.findOne(groupId);
        let userEmails = groupChat.convid.split(" ");
        await Promise.all(
          userEmails.map(async (email) => {
            const user = await User.findOneLight(email);
            if (user === false) {
              throw new Error("Error at finding a user");
            }
            const adminData = await User.findOneLight(group.admin);
            if (adminData === false) throw new Error("Admin not found");
            const ratingData = await insertAver(adminData);
            if (ratingData === false) throw new Error("Rating not found");

            const data = {
              conversationId: group.groupId + "," + groupChat.convid,
              socketId: adminData.socketId,
              username: group.groupName,
              photo: (await fun.checkImagePath(adminData.email))
                ? `images/${adminData.email}.jpeg`
                : null,
              email: adminData.email,
              average: ratingData.average,
              count: ratingData.count,
              isGroupInterest: false,
              members: [],
              isUserOnline: false,
              expiresIn: null,
              messages: [],
              isRead: true,
              lastMessage: null,
              lastMessageTime: null,
              isLastMessageMine: false,
              messagesLeft: false,
              pending: false,
            };
            const socketList = await io.fetchSockets();

            const socket = socketList.find((soc) => soc.id === user.socketId);
            if (socket != null) {
              socket.broadcast.to(group.groupId.toString()).emit("action", {
                type: "setIsConversationUserOnlineGroups",
                data: {
                  conversationId: data.conversationId,
                  isUserOnline: true,
                },
              });
            } else {
              console.log(
                `User ${user.email} is NOT ONLINE. Socket wasnt found`
              );
            }
            //join the room for conversation
            socket.join(group.groupId.toString());
            let emails = groupChat.convid
              .split(" ")
              .filter((email) => email !== user.email);
            await Promise.all(
              emails.map(async (email) => {
                let userData = await User.findOneLight(email);
                for (const soc of socketList) {
                  if (
                    soc.id == userData.socketId &&
                    req.app.locals.bg[userData.email] == null
                  ) {
                    console.log(`User ${userData.email} is ONLINE`);
                    data.isUserOnline = true;
                    break;
                  }
                }
              })
            );
            //get all the members of the group
            data.members = await fun.returnAllMembers(group);

            if (user.email != group.admin) {
              socket.emit("action", {
                type: "onGroupConversationAdded",
                data: {
                  conversation: data,
                },
              });
            } else {
              socket.emit("action", {
                type: "onGroupConversationPendingUpdated",
                data: {
                  conversationId: data.conversationId,
                  pending: false,
                },
              });
            }
          })
        );
      } else {
        //inform admin that the group chat is changed
        fun.sendUpdatedGroupChatData(
          groupId + "," + groupChatData.convid,
          true
        );
      }
    } else if (group === "Destroyed") {
      //Destroy chat of group
      let chatDeleted = await ConvGroup.deleteOneByGroupId(groupId);
      if (chatDeleted instanceof Error) {
        throw chatDeleted;
      }
      //Send events to group for removal
      console.log("DECLINE INVITATION DECIDED TO DELETE THE CHAT");
      fun.sendRemovedGroupChatData(groupId + "," + groupChatData.convid);
    }
    const userDeclined = await User.findOneLight(invitedEmail);
    if (userDeclined === false) {
      throw new Error("Error at finding initiatior of service " + invitedEmail);
    }
    onGroupRequestDeclined(groupData.admin, userDeclined);

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
