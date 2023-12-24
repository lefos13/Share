// inside src/database/PostInterested.js

//ENVIROMENTAL VAR

// END OF SECTION (ENV VAR)
const Locations = require("../modules/locations");
// ==== code for db
const { Op } = require("sequelize");


/**
 * This function creates a new group and returns true if successful, otherwise it returns false and
 * logs an error.
 * @param data - The `data` parameter is an object that contains the information needed to create a new
 * group. It likely includes properties such as the group name, description, and members. The `Groups`
 * object is likely a model or schema for a database that stores information about groups. The `create`
 * method is
 * @returns The `create` function is returning a boolean value. If the `Groups.create` operation is
 * successful, it returns `true`. If there is an error, it catches the error and logs it to the
 * console, then returns `false`.
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
