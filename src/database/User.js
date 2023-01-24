// inside src/database/User.js

//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { HOST, USER, PASS, DATABASE } = process.env;
// END OF SECTION (ENV VAR)

// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

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
    // console.log(data);
    let user = await Users.create(data).catch((err) => {
      // console.log("sameuser");
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
    // console.log(data);
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
    console.log(err);
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
    console.log(error);
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
      console.log("Error:" + err);
    });
    return user;
  } catch (error) {
    console.log(error);
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
    console.log(error);
    return false;
  }
};

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
    console.log(error);
    return false;
  }
};

const userVerify = async (email) => {
  try {
    // console.log(email);
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
    // console.log(updatedUser[0]);
    if (updatedUser[0] == 0) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
    return false;
  }
};

module.exports = {
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
