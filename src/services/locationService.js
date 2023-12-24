// In src/services/Userservice.js
// *** ADD *** (methods for all the Users that access data in db)
const User = require("../database/User");
const Location = require("../database/Locations");
const moment = require("moment");
const _ = require("lodash");
const fun = require("../utils/functions");
const socket = require("../index");
const CreateLocRequest = require("../classes/locations/createLocRequest")

//Creation of a location group
const createLocationGroup = async (req) => {
  const io = socket.io;
  try {
    const msg = await fun.determineLang(req);
    const { extra, ...requestData } = req.body;

    //create the location group
    const locObj = new CreateLocRequest(requestData.groupName, requestData.initiator, requestData.receivers)
    locObj.print()
    if(locObj.errorRequest) throw new Error("Request constructor failed with bad request data");

    const dbLocationGroup = {
      groupName: locObj.groupName,
      initiator: locObj.initiator.email,
      receivers: locObj.receivers,
      createdAt: moment(),
    };

    const dbResponse = await Location.saveLocationGroup(dbLocationGroup);
    if(!dbResponse){
      throw new Error(`Creating location group failed at database layer`);
    }

    //check if there are any active posts for the initiator

    //send notifications to receivers
    const results = "sending the notifications";

    //create response object
    const response = {
      asInitiator: {}, // people who I send my location to them
      asReceiver: {}, // people who send their locations to me
    };

    return {status: 200, dbResponse: dbResponse.JSON()}
  } catch (error) {
    console.error(error);
    return {status: 500}
  }
};

const getLocationGroupsPerUser = async (user) => {
  try {
    // Get all groups of the user that is initiator
    const allGroupsAsInitiator = {};

    // Get all groups of the user that is receiver
    const allGroupsAsReceiver = {};

    // Update data of each group that the user is an admin of
    const updatedGroupsAsInitiator = await Promise.all(
      allGroupsAsInitiator.map(updateDataOfGroup)
    );

    // Update data of each group that the user is a guest of
    const updatedGroupsAsGuest = await Promise.all(
      allGroupsAsReceiver.map(updateDataOfGroup)
    );

    return {
      asInitiator: updatedGroupsAsInitiator,
      asReceiver: updatedGroupsAsGuest,
    };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const updateDataOfGroup = async (group) => {
  let initiatorUser = await User.findOneLight(group.initiator);
  if (initiatorUser === false) {
    throw new Error("initiator not found");
  }
  let ratingDataInitiator = await fun.insertAver(initiatorUser);
  if (await fun.checkImagePath(initiatorUser.email)) {
    initiatorUser.imagePath = "images/" + initiatorUser.email + ".jpeg";
  } else {
    initiatorUser.imagePath = null;
  }
  let initiatorObject = {
    email: initiatorUser.email,
    fullname: initiatorUser.fullname,
    average: ratingDataInitiator.average,
    count: ratingDataInitiator.count,
    imagePath: initiatorUser.imagePath,
  };
  group.initiator = initiatorObject;
  try {
    group.receivers = JSON.parse(group.receivers);
  } catch (error) {
    console.error("Already a JSON object");
  }

  for await (let member of group.receivers) {
    let memberFullname = await User.findOneLight(member.email);
    member.fullname = memberFullname.fullname;
    //get average rating for each member
    let ratingData = await fun.insertAver(member);
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

const getLocationGroups = async (req) => {
  try {
    let userEmail = req.body.extra;
    let msg = await fun.determineLang(req);

    let locationDataOfUser = await getLocationGroupsPerUser(userEmail);

    let getGroupsData = {
      asInitiatorGroups: locationDataOfUser.asInitiator,
      asReceiverGroups: locationDataOfUser.asReceiver,
    };
    return { status: 200, message: msg.groupsFound, data: getGroupsData };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const getLocationDataOfGroup = async (req) => {
  return {};
};

module.exports = {
  createLocationGroup,
  getLocationGroups,
  getLocationDataOfGroup,
};
