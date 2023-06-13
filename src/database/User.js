// inside src/database/User.js

//ENVIROMENTAL VAR

// END OF SECTION (ENV VAR)

// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const moment = require("moment-timezone");
// import "moment/locale/gr";
// moment.locale("gr");
// ==== code for db

// *** ADD ***
const register = async (data, msg) => {
  try {
    let user = await Users.create(data).catch((err) => {
      if (err.parent.errno == 1062) {
        let data = {
          message: msg.sameEmail,
        };
        throw { status: 405, data: data };
      }
    });

    let { password, ...rest } = data;

    results = {
      message: msg.regSuc,
      user: rest,
    };

    var data = {
      body: results,
    };

    return { status: 200, data: data };
  } catch (err) {
    if (err.status == 405) {
      return err;
    } else return { status: 500 };
  }
};

const updateUser = async (data, email) => {
  try {
    const user = await Users.findOne({
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });

    let photoData;
    data.photo == null ? (photoData = user.photo) : (photoData = 1);

    await user
      .update({
        fullname: data.fullname,
        age: data.age,
        facebook: data.facebook,
        instagram: data.instagram,
        car: data.car,
        cardate: data.cardate,
        gender: data.gender,
        photo: photoData,
      })
      .catch((err) => {
        throw err;
      });
    return user;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const updatePassUser = async (email, newpass) => {
  try {
    const user = await Users.update(
      { password: newpass },
      { where: { email: email } }
    ).catch((err) => {
      throw err;

      // res.status(500).json("Κάτι πήγε στραβά!");
    });
    return user;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findOneUser = async (email) => {
  try {
    const user = await Users.findOne({
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return user;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findOneUserQuery = async (query) => {
  try {
    const user = await Users.findOne(query).catch((err) => {
      throw err;
    });
    return user;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * This is an asynchronous function that finds a user by their email and returns their information
 * excluding sensitive data.
 * @param email - The email of the user that needs to be found in the database.
 * @returns The function `findOneLight` returns either the user object (with certain attributes
 * excluded) if it is found in the database, or `false` if there is an error or the user is not found.
 */
const findOneLight = async (email) => {
  try {
    const user = await Users.findOne({
      attributes: {
        exclude: ["password", "verified", "facebook", "instagram", "mobile"],
      },
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return user;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const userVerify = async (email) => {
  try {
    const updatedUser = await Users.update(
      { verified: true },
      {
        where: {
          email: email,
        },
      }
    ).catch((err) => {
      throw err;
    });
    if (updatedUser[0] == 0) {
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const saveViaGoogle = async (data) => {
  try {
    const userSaved = await Users.create(data).catch((err) => {
      throw err;
    });
    return userSaved;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const updateLoginState = async (email, state) => {
  try {
    const user = await Users.update(
      { isThirdPartyLogin: state },
      { where: { email: email } }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const updateLang = async (email, lang) => {
  try {
    const user = await Users.update(
      { lastLang: lang },
      { where: { email: email } }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const updateDeleted = async (email) => {
  try {
    const user = await Users.update(
      { deleted: true },
      { where: { email: email } }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const activateAccount = async (email) => {
  try {
    const user = await Users.update(
      { deleted: false },
      { where: { email: email } }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const addSocketId = async (socketId, email) => {
  try {
    const user = await Users.update(
      { socketId: socketId },
      { where: { email: email } }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const removeSocketId = async (email) => {
  try {
    const user = await Users.update(
      { socketId: null },
      { where: { email: email } }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findPerSocket = async (socketId) => {
  try {
    const user = await Users.findOne({
      where: {
        socketId: socketId,
      },
    }).catch((err) => {
      throw err;
    });

    return user;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const updateOS = async (email, OS) => {
  try {
    const user = await Users.update(
      { OS: OS },
      { where: { email: email } }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

//get all users by searching based on fullname
const findUsersByFullname = async (fullname, email) => {
  try {
    const users = await Users.findAll({
      where: {
        //email not equal to email
        email: { [Op.ne]: email },
        fullname: {
          [Op.like]: `%${fullname}%`,
        },
        deleted: false,
      },
      //exclude
      attributes: ["email", "fullname"],
    }).catch((err) => {
      throw err;
    });
    return users;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findUserMinimal = async (email) => {
  try {
    const user = await Users.findOne({
      attributes: ["email", "fullname"],
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return user;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = {
  findUserMinimal,
  findUsersByFullname,
  updateOS,
  removeSocketId,
  addSocketId,
  activateAccount,
  updateDeleted,
  register,
  updateUser,
  findOneUser,
  updatePassUser,
  userVerify,
  findOneUserQuery,
  findOneLight,
  saveViaGoogle,
  updateLoginState,
  updateLang,
  findPerSocket,
};
