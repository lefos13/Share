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
/**
 * This is an asynchronous function that finds a conversation from a MySQL database using the
 * conversation ID.
 * @param id - The parameter "id" is the identifier of the conversation that needs to be retrieved from
 * the database.
 * @returns The `findOne` function is returning the results of a database query to find a conversation
 * with a specific `id`. If the query is successful, the function returns the results. If there is an
 * error, the function returns a new `Error` object with a message indicating that there was an error
 * in the function.
 */
const findOneByGroupId = async (id) => {
  try {
    //find a conversation from database (mysql)
    let results = await ConvGroups.findOne({
      where: {
        groupId: id,
      },
    }).catch((err) => {
      throw err;
    });
    return results;
  } catch (error) {
    console.error(error);
    return new Error(
      "Error inside findOne function of ConvGroups database layer!"
    );
  }
};

module.exports = {
  saveOne,
  findOneByGroupId,
};
