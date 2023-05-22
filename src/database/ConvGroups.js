// inside src/database/ConvUsers.js

//ENVIROMENTAL VAR
const { Op } = require("sequelize");
const moment = require("moment");
const ConvGroups = require("../modules/convgroups");

const updateLastMessage = async (convid, email, seen) => {
  try {
    console.log("UPDATING LAST MESSAGE AS SEEN AND READ");
    let results = await ConvGroups.findOne({
      where: {
        convid: convid,
      },
    }).catch((err) => {
      throw err;
    });

    let messages = [];
    if (results != null) {
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
    } else {
      console.log("GROUP CHAT NO LONGER EXISTS");
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
/**
 * This function adds a message to a conversation group and updates the database.
 * @param convid - The ID of the conversation group where the message will be added.
 * @param message - The message that needs to be added to the conversation with the given convid.
 * @returns The function does not have an explicit return statement, but it may return `false` if an
 * error is caught in the try-catch block.
 */
const addMessage = async (convid, message) => {
  try {
    let results = await ConvGroups.findOne({
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

/**
 * This function deletes a conversation from a MySQL database based on its group ID.
 * @param id - The parameter `id` is the unique identifier of the conversation group that needs to be
 * deleted from the database.
 * @returns The function `deleteOneByGroupId` returns the results of the deletion operation on the
 * `ConvGroups` table in the database. If the operation is successful, it returns the number of rows
 * deleted. If there is an error, it returns an error message.
 */
const deleteOneByGroupId = async (id) => {
  try {
    //delete a conversation from database (mysql)
    let results = await ConvGroups.destroy({
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
      "Error inside deleteOneByGroupId function of ConvGroups database layer!"
    );
  }
};

//find all by user email
/**
 * This function finds all conversations in a database that match a given email address.
 * @param email - The email parameter is a string that is used to search for conversations in the
 * ConvGroups table of a MySQL database. The function uses the Sequelize ORM to perform the search and
 * returns the results as an array of objects.
 * @returns The function `findAllByEmail` returns the results of a database query to find all
 * conversation groups where the `convid` column contains the specified email address. If the query is
 * successful, the function returns the results. If there is an error, the function returns an error
 * message.
 */
const findAllByEmail = async (email) => {
  try {
    //find all conversations from database (mysql)
    let results = await ConvGroups.findAll({
      where: {
        convid: {
          [Op.like]: `%${email}%`,
        },
      },
    }).catch((err) => {
      throw err;
    });
    return results;
  } catch (error) {
    console.error(error);
    return new Error(
      "Error inside findAllByEmail function of ConvGroups database layer!"
    );
  }
};

/**
 * The function removes a member's email from a conversation in a database.
 * @param groupId - The ID of the conversation group from which the member needs to be removed.
 * @param email - The email of the member that needs to be removed from the conversation group.
 * @returns a boolean value of `true` if the operation is successful, and an `Error` object if there is
 * an error inside the function.
 */
const removeMembers = async (groupId, email) => {
  try {
    let results = await ConvGroups.findOne({
      where: {
        groupId: groupId,
      },
    }).catch((err) => {
      throw err;
    });
    let conversationId = results.convid;
    let emails = conversationId.split(" ");
    emails = emails.filter((e) => e !== email);
    const newConversationId = emails.join(" ");

    const responseOnUpdate = await ConvGroups.update(
      { convid: newConversationId },
      {
        where: {
          groupId: groupId,
        },
      }
    ).catch((err) => {
      throw err;
    });
    // console.log("UPDATED QUERY", responseOnUpdate);
    return true;
  } catch (error) {
    console.log(error);
    return new Error(
      "Error inside removeMembers function of ConvGroups database layer!"
    );
  }
};
module.exports = {
  saveOne,
  findOneByGroupId,
  deleteOneByGroupId,
  findAllByEmail,
  addMessage,
  updateLastMessage,
  removeMembers,
};
