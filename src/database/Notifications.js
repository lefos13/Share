// inside src/database/ToReview.js

// END OF SECTION (ENV VAR)

// code for db
const { Op } = require("sequelize");

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const Notifications = require("../modules/notifications");
const moment = require("moment");
// import "moment/locale/gr";
// moment.locale("gr");
// ==== code for db

// *** ADD ***
const {} = require("./utils");

const getAll = async (email) => {
  try {
    const all = await Notifications.findAll({
      where: {
        ownerEmail: email,
      },
      order: [["date", "DESC"]],
      limit: 15,
    }).catch((err) => {
      throw err;
    });

    return all;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const createOne = async (data) => {
  try {
    await Notifications.create(data).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
const checkNotificationMessage = async (not) => {
  try {
    let exists = await Notifications.findOne({
      where: {
        ownerEmail: not.ownerEmail,
        conversationId: not.conversationId,
        isRead: false,
      },
    }).catch((err) => {
      throw err;
    });

    if (exists != null) {
      console.log("Found existing non-read notification of this conversation");
      return exists;
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
};
const deleteOne = async (id) => {
  try {
    await Notifications.destroy({
      where: {
        notificationId: id,
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

const readOne = async (id) => {
  try {
    // console.log("Database reading:", id);
    await Notifications.update(
      {
        isRead: true,
      },
      {
        where: {
          notificationId: id,
        },
      }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
const destroyAll = async () => {
  try {
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = {
  getAll,
  checkNotificationMessage,
  createOne,
  deleteOne,
  readOne,
  destroyAll,
};
