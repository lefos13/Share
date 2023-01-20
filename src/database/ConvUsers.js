// inside src/database/ConvUsers.js

//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
const ConvUsers = require("../modules/convusers");
const { Op } = require("sequelize");
const moment = require("moment");

const saveOne = async (data) => {
  try {
    let results = await ConvUsers.create(data).catch((err) => {
      throw err;
    });

    return results;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const findOne = async (convid) => {
  try {
    let results = await ConvUsers.findOne({
      where: {
        convid: convid,
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

const findAll = async (email) => {
  try {
    const dbConvs = await ConvUsers.findAll({
      where: {
        convid: { [Op.substring]: email },
      },
    }).catch((err) => {
      throw err;
    });

    return dbConvs;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const addMessage = async (convid, message) => {
  try {
    let results = await ConvUsers.findOne({
      where: {
        convid: convid,
      },
    }).catch((err) => {
      throw err;
    });
    let messages = [];

    if (results.messages != null) {
      messages = JSON.parse(results.messages);
    }

    messages.push(message);
    // console.log(messages);

    await results
      .update({ messages: JSON.stringify(messages) })
      .catch((err) => {
        throw err;
      });
  } catch (error) {
    console.log(error);
    return false;
  }
};

const updateLastMessage = async (convid, email, seen) => {
  try {
    let results = await ConvUsers.findOne({
      where: {
        convid: convid,
      },
    }).catch((err) => {
      throw err;
    });
    let messages = [];
    if (results != null)
      if (results.messages != null) {
        messages = JSON.parse(results.messages);
        messages.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        // check if the last message is of the user that openned the chat
        if (messages[0].user._id == email) {
          console.log("The last message is Mine!!!");
        } else {
          console.log("The last message is not Mine!!");
          messages[0].isRead = true;
          messages[0].seen = true;
          await results
            .update({ messages: JSON.stringify(messages) })
            .catch((err) => {
              throw err;
            });
        }
      }

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const checkIfExists = async (email1, email2) => {
  try {
    //Find all user's active chats and part2: extract the other user
    const conv = await ConvUsers.findOne({
      where: {
        convid: { [Op.substring]: email1 },
        convid: { [Op.substring]: email2 },
      },
    }).catch((err) => {
      throw err;
    });

    return conv;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const updateExpireDate = async (convObj, expiresIn) => {
  try {
    let tesDate = moment(convObj.expiresIn);
    console.log(tesDate);
    if (tesDate > expiresIn) {
      return "0";
    } else {
      await convObj.update({ expiresIn: expiresIn }).catch((err) => {
        throw err;
      });
    }

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const deleteIfExpiresEqual = async (convObj, expiresIn) => {
  try {
    let convid = false;
    // console.log(convObj.expiresIn, expiresIn);
    if (convObj != null)
      if (convObj.expiresIn == expiresIn) {
        convid = convObj.convid;
        await convObj.destroy().catch((err) => {
          throw err;
        });
      }

    return convid;
  } catch (error) {
    console.log(error);
    return "0";
  }
};
module.exports = {
  findAll,
  deleteIfExpiresEqual,
  updateExpireDate,
  checkIfExists,
  addMessage,
  saveOne,
  findOne,
  updateLastMessage,
};
