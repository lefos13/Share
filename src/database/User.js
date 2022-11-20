// inside src/database/User.js

//ENVIROMENTAL VAR
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
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
const register = async (data) => {
  try {
    let user = await Users.create(data).catch((err) => {
      throw err;
    });
    let { password, mobile, ...rest } = data;

    results = {
      message: "Εγγραφήκατε επιτυχώς!",
      user: rest,
    };

    var data = {
      body: results,
    };

    return { status: 200, data: data };
  } catch (err) {
    if (err.parent.errno == 1062) {
      let data = {
        message: "Βρέθηκε λογαριασμός με το ίδιο email.",
      };
      return { status: 405, data: data };
    } else {
      console.log(err);
      let data = {
        message: "Κάτι πήγε στραβά. Προσπάθησε ξανά αργότερα.",
      };
      return { status: 500, data: data };
    }
  }
};

const updateUser = async (req) => {
  try {
    let data = req.body.data;
    let email = req.body.extra;
    const user = await Users.update(
      {
        mobile: data.mobile,
        fullname: data.fullname,
        age: data.age,
        facebook: data.facebook,
        instagram: data.instagram,
        car: data.car,
        cardate: data.cardate,
      },
      {
        where: {
          email: email,
        },
      }
    ).catch((err) => {
      // console.log("Update profil: ", err);
      throw err;
    });
    return { status: 200, message: "Η ενημέρωση έγινε επιτυχώς!" };
  } catch (err) {
    console.log(err);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const updatePassUser = async (req, newpass) => {
  try {
    var email = req.body.data.email;

    const user = await Users.update(
      { password: newpass },
      { where: { email: email } }
    ).catch((err) => {
      console.log(err);

      // res.status(500).json("Κάτι πήγε στραβά!");
    });
    return user;
  } catch (error) {
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

module.exports = {
  register,
  updateUser,
  findOneUser,
  updatePassUser,
  userVerify,
  findOneUserQuery,
  findOneLight,
};
