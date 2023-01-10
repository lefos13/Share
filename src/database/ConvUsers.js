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

module.exports = {
  saveOne,
};
