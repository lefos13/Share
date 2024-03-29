// inside src/database/ConvUsers.js

//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
const ConvUsers = require("../modules/convusers");
const { Op } = require("sequelize");
const moment = require("moment");


const findOneByGroupId = async (groupId) => {
  try {
    const results = await ConvUsers.findOne({
      where: {
        groupId: groupId,
      },
    }).catch((err) => {
      throw err;
    });

    return results;
  } catch (error) {
    console.error(error);
    return new Error("Something went wrong inside findOneByGroupId");
  }
};
/**
 * This function deletes multiple records from a database table based on a given group ID.
 * @param groupId - The `groupId` parameter is a unique identifier for a group of users in a chat
 * application. It is used to identify and delete all conversations associated with that group.
 * @returns a boolean value of `true` if the deletion of ConvUsers records with the specified `groupId`
 * is successful. If there is an error, it returns a new `Error` object with the message "couldnt
 * delete chats by group id".
 */
const deleteManyByGroupId = async (groupId) => {
  try {
    let results = await ConvUsers.destroy({
      where: {
        groupId: groupId,
      },
    }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return new Error("couldnt delete chats by group id");
  }
};

const saveOne = async (data) => {
  try {
    let results = await ConvUsers.create(data).catch((err) => {
      throw err;
    });

    return results;
  } catch (error) {
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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

    await results
      .update({ messages: JSON.stringify(messages) })
      .catch((err) => {
        throw err;
      });
  } catch (error) {
    console.error(error);
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
        } else {
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
    console.error(error);
    return false;
  }
};

const checkIfExists = async (email1, email2) => {
  try {
    //Find all user's active chats and part2: extract the other user
    const conv = await ConvUsers.findOne({
      where: {
        convid: { [Op.or]: [email1 + " " + email2, email2 + " " + email1] },
      },
    }).catch((err) => {
      throw err;
    });

    return conv;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const updateExpireDate = async (convObj, expiresIn) => {
  try {
    let tesDate = moment(convObj.expiresIn);
    if (tesDate > expiresIn) {
      return tesDate;
    } else {
      await convObj.update({ expiresIn: expiresIn }).catch((err) => {
        throw err;
      });
      return expiresIn;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
};

const updateGroupId = async (convObj, newGroupId) => {
  try {
    await convObj.update({ groupId: newGroupId }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const deleteIfExpiresEqual = async (convObj, expiresIn) => {
  try {
    let convid = false;
    if (convObj != null)
      if (moment(convObj.expiresIn).isSame(expiresIn, "day")) {
        console.log(
          "Dates for chat destruction are same! Deletetion is moving on..."
        );
        convid = convObj.convid;
        await convObj.destroy().catch((err) => {
          throw err;
        });
      }
    return convid;
  } catch (error) {
    console.error(error);
    return "0";
  }
};

const updateDate = async (convid, date, newGroupId) => {
  try {
    const updated = await ConvUsers.update(
      {
        expiresIn: date,
        groupId: newGroupId,
      },
      {
        where: {
          convid: convid,
        },
      }
    ).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.error(error, "IN UPDATEDATE OF CONVUSERS");
  }
};

const getAllExpired = async (date) => {
  try {
    const all = ConvUsers.findAll({
      where: {
        expiresIn: { [Op.lte]: date },
      },
    }).catch((err) => {
      throw err;
    });

    return all;
  } catch (error) {
    console.error(error);
  }
};

const deleteAll = async (email) => {
  try {
    let deleted = await ConvUsers.destroy({
      where: {
        convid: { [Op.substring]: email },
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

module.exports = {
  deleteAll,
  getAllExpired,
  updateDate,
  findAll,
  deleteIfExpiresEqual,
  updateExpireDate,
  checkIfExists,
  addMessage,
  saveOne,
  findOne,
  updateLastMessage,
  updateGroupId,
  deleteManyByGroupId,
  findOneByGroupId,
};
