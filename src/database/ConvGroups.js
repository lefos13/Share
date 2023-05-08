// inside src/database/ConvUsers.js

//ENVIROMENTAL VAR
const { Op } = require("sequelize");
const moment = require("moment");
const ConvGroups = require("../modules/convgroups");

/**
 * The saveOne function creates a new conversation in a MySQL database and returns the created object.
 * @param data - The `data` parameter is an object that contains the information to be saved to the
 * database. It is passed as an argument to the `saveOne` function.
 * @returns The `saveOne` function is returning either the object that was created in the database or
 * an error message if there was an error during the creation process.
 */
const saveOne = async (data) => {
  try {
    //create a new conversation to database (mysql)
    let results = await ConvGroups.create(data).catch((err) => {
      throw err;
    });

    //return the object that was created
    return results;
  } catch (error) {
    console.error(error);
    return new Error(
      "Error inside saveOne function of ConvGroups database layer!"
    );
  }
};

module.exports = {
  saveOne,
};
