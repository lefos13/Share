// inside src/database/PostInterested.js

//ENVIROMENTAL VAR

// END OF SECTION (ENV VAR)
const Locations = require("../modules/locations");
// ==== code for db
const { Op } = require("sequelize");



/**
 * The function `saveLocationGroup` saves a location group in a database and returns the saved group,
 * or false if there was an error.
 * @param data - The `data` parameter is an object that contains the information needed to create a new
 * location group.
 * @returns The function `saveLocationGroup` returns the `group` object if the creation is successful.
 * If there is an error, it returns `false`.
 */
const saveLocationGroup = async (data) => {
  try {
    const group = await Locations.create(data).catch((err) => {
      throw err;
    });
    return group;
  } catch (error) {
    console.error("Inside saveLocationGroup:", error);
    return false;
  }
};

module.exports = {
    saveLocationGroup
};
