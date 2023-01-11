// inside src/database/ConvUsers.js

//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
const ConvUsers = require("../modules/convusers");

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

module.exports = {
  addMessage,
  saveOne,
  findOne,
};
