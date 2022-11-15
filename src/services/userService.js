// In src/services/Userservice.js

// *** ADD *** (methods for all the Users that access data in db)
const User = require("../database/User");
const Review = require("../database/Review");
const Request = require("../database/Request");
const Post = require("../database/Post");
const PostInt = require("../database/PostInterested");
const ToReview = require("../database/ToReview");
const bcrypt = require("bcrypt");
var otpGenerator = require("otp-generator");
const saltRounds = 10;
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { verification, checkPass } = require("../database/utils");
const moment = require("moment");
const _ = require("lodash");

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

const getAllUsers = () => {
  return;
};

const getOneUser = () => {
  return;
};
// create User service
const createNewUser = async (data) => {
  try {
    var data = data.body.data;
    data["verified"] = true;
    let salt = await bcrypt.genSalt(saltRounds);
    data.password = await bcrypt.hash(data.password, salt);

    let base64 = data.photo;
    const buffer = Buffer.from(base64, "base64");
    // console.log(buffer);
    fs.writeFileSync("uploads/" + data.email + ".jpeg", buffer);
    // fs.writeFileSync("test.jpeg", buffer);
    data.photo = "";
    console.log("Salt: ", salt);
    console.log("Password: ", data.password);
    const final = await User.register(data);
    return final;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const updateOneUser = async (req) => {
  try {
    let data = req.body.data;
    let email = req.body.extra;
    const res = await User.updateUser(req);
    if (data.photo != null && res.status == 200) {
      let base64 = data.photo;
      const buffer = Buffer.from(base64, "base64");
      // console.log(buffer);
      fs.writeFileSync("uploads/" + email + ".jpeg", buffer);
    }
    return res;
  } catch (err) {
    console.log(err);
    return { status: 200, message: "Κάτι πήγε στραβά!" };
  }
};

const createToken = async (data) => {
  try {
    let email = data.body.data.email;
    const user = await User.findOneUser(email);
    if (user == false) {
      // if error with the db
      throw 500;
    } else if (user == null) {
      //if user doesnt exist
      return { status: 404, data: "Ο χρήστης δεν βρέθηκε!" };
    } else if (user.verified == false) {
      //if user isnt verified
      var otp = otpGenerator.generate(4, {
        digits: true,
        upperCase: false,
        alphabets: false,
        specialChars: false,
      });

      let response = {
        message: "Πρέπει να επιβεβαιώσεις το email σου.",
        email: email,
        otp: otp,
      };

      verification(otp, response);
      return { status: 200, data: response };
    } else {
      payload = {
        email: email,
        data: new Date(),
      };
      const accessToken = jwt.sign(payload, TOKEN_KEY, { expiresIn: "60d" });
      // console.log(accessToken);
      const fdata = {
        message: "Επιτυχής δημιουργία του token",
        accessToken: accessToken,
      };
      return { status: 200, data: fdata };
    }
  } catch (error) {
    console.log(error);
    return { status: 500, data: "Κάτι πήγε στραβά!" };
  }
};

const updatePass = async (req) => {
  try {
    // GENERATE HASH FOR THE PASSWORD GIVEN
    var password = req.body.data.pass;
    const salt = await bcrypt.genSalt(saltRounds);
    let hash = await bcrypt.hash(password, salt);

    var newpass = hash;

    // UPDATE USER'S PASSWORD
    const user = await User.updatePassUser(req, newpass);

    if (user === null) {
      return { status: 404, message: "Ο χρήστης δεν βρέθηκε." };
    } else if (user == false) {
      throw new Error(
        "Κάτι πήγε στραβά μέσα στο Function updatePassUser στο αρχείο database/User.js"
      );
    } else {
      return { status: 200, message: "Ο κωδικός ανανεώθηκε." };
    }
  } catch (err) {
    console.error(err);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};
const deleteOneUser = async () => {
  return;
};

const userVerify = async (req) => {
  try {
    var email = req.body.data.email;
    const result = await User.userVerify(email);
    if (result == true) {
      return { status: 200, message: "Το email επιβεβαιώθηκε με επιτυχία!" };
    } else {
      throw new Error(
        "Error in function of database/User.js --- Possible that the user is already verified or it doesnt even exist"
      );
    }
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const login = async (req) => {
  try {
    var email = req.body.data.email;
    var pass = req.body.data.pass;
    // console.log(req.body);
    let fcmToken = req.body.data.fcmToken;

    // CHECK IF USER EXISTS
    const user = await User.findOneUser(email);

    if (user == null) {
      return { status: 404, message: "Ο χρήστης δεν βρέθηκε!" };
    } else if (user == false) {
      throw new Error("Σφάλμα στην findOneUser του User.js");
    } else {
      if (user.verified === false) {
        return {
          status: 405,
          message: "Πρέπει να επιβεβαιώσεις το email σου.",
        };
      } else {
        // CHECK IF THE PASS IS RIGHT
        const result = await bcrypt.compare(pass, user.password);
        const whatToReturn = await checkPass(result, user, fcmToken, email);
        return whatToReturn;
        // ============
      }
    }
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const sendOtp = async (req) => {
  try {
    var email = req.body.data.email;

    var otp = otpGenerator.generate(4, {
      digits: true,
      upperCase: false,
      alphabets: false,
      specialChars: false,
    });

    verification(otp, email);

    return {
      status: 200,
      message: "Έλεγξε το email σου για τον ειδικό κωδικό.",
      otp: otp,
    };
  } catch (error) {
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const searchUser = async (req) => {
  try {
    var data = req.body.data;
    var searcherEmail = req.body.extra;
    let hasRequests = false;
    let hasPosts = false;
    let hasFavourites = false;
    let hasInterested = false;
    let hasIntPosts = false;
    let reviewable = false;
    let isVisible = false;

    let findUserQuery = {
      attributes: {
        exclude: ["password"],
      },
      where: {
        email: data.email,
      },
    };
    let reviewsQuery = {
      attributes:
        // [sequelize.fn("count", sequelize.col("rating")), "counter"],
        [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
      where: {
        email: data.email,
      },
    };
    //get user with no password
    let found = await User.findOneUserQuery(findUserQuery);

    //get Reviews and Count
    let revfound = await Review.findAndCountAll(reviewsQuery);

    var rows = revfound.rows;
    var total = null;
    for await (r of rows) {
      total = r.toJSON().total;
    }
    //calculate average rating of the user
    var average = total / revfound.count;

    //GET THE DATE BEFORE 6 MONTHS
    let today = moment().subtract(6, "months").format("YYYY-MM-DD");

    // ================ MEGA case that the person that sees the profil is the same user as the profil
    if (data.email == searcherEmail) {
      //get the count number of the requests
      const requests = await Request.requestCount(data.email);
      if (requests == null) {
        throw new Error("something went wrong with counting requests");
      }
      requests > 0 ? (hasRequests = true) : null;

      //check if there are any posts of this user
      const postsCount = await Post.countAllPastHalfYear(data.email, today);
      //case of error in db
      if (postsCount == null)
        throw new Error(
          "Something went wrong with calculating posts of half past year"
        );
      //declare if the user has any posts the past half year
      postsCount > 0 ? (hasPosts = true) : (hasPosts = false);

      //Count his favourite posts
      const countFavourites = await Post.countFavourites(data.email);
      if (countFavourites == null) {
        throw new Error("Something went wrong with calc of favourites");
      }
      //declare if he has any favourite posts
      countFavourites > 0 ? (hasFavourites = true) : (hasFavourites = false);

      //check if he has any interested posts
      const interested = await PostInt.findAny(data.email);
      if (interested == false) {
        throw new Error("something went wrong with finding the interests");
      }

      // FIND IF INTERESTED POSTS ARE STILL AVAILABLE AND ONLY THEN DECLARE IT
      if (interested.length != 0) {
        for await (int of interested) {
          let dateForInt = moment();
          let postQuery = {
            where: {
              postid: int.postid,
              email: { [Op.ne]: data.email },
              enddate: {
                [Op.gte]: dateForInt,
              },
            },
          };
          let countP = await Post.countPostsQuery(postQuery);
          if (countP == null)
            throw new Error(
              "Something went wrong at counting posts of interested"
            );
          else if (countP > 0) {
            hasInterested = true;
            break;
          }
        }
      }

      //FING IF THERE IS ANY PEOPLE INTERESTED IN THE
      // today = await getCurDate(0);
      // const posts = await Posts.findAll({
      //   where: {
      //     email: data.email,
      //     enddate: { [Op.gte]: today },
      //   },
      // }).catch((err) => {
      //   console.error(err);
      // });
      // let isAny = 0;
      // console.log(posts.length);
      // if (posts.length != 0) {
      //   for await (one of posts) {
      //     const interested2 = await PostInterested.findOne({
      //       where: {
      //         postid: one.postid,
      //       },
      //     }).catch((err) => {
      //       console.error(err);
      //     });

      //     if (interested2 != null) {
      //       isAny++;
      //       break;
      //     }
      //   }
      // }

      // isAny > 0 ? (hasIntPosts = true) : (hasIntPosts = false);
    }
    // =============== End of section of user == searchuser

    // ==================== section if the one who searches can review the profil ======================
    //ONLY IF THE SEARCHER IS NOT THE PROFILE OWNER
    if (searcherEmail != data.email) {
      let dateToCheck = moment()
        .date(moment().get("date") - 1)
        .format("MM-DD-YYYY");

      // FIND THE ROWS THAT I AM A PASSENGER OR DRIVER AND THE POST IS ALREADY FINISHED BY A DAY
      let possibleReviews = await ToReview.findForProfile(
        searcherEmail,
        data.email,
        dateToCheck
      );
      if (possibleReviews == false)
        throw new Error(
          "Something went wrong with finding all the possible reviews"
        );

      // CHECK IF THE USER HAS ALREADY DONE HIS PART OF THE REVIEW
      possibleReviews = _.filter(possibleReviews, (obj) => {
        if (
          obj.passengerEmail == searcherEmail &&
          obj.driverEmail == data.email &&
          obj.passengerDone == true
        ) {
          return false;
        } else if (
          obj.driverEmail == searcherEmail &&
          obj.passengerEmail == data.email &&
          obj.driverDone == true
        ) {
          return false;
        } else return true;
      });

      //declare if the profil is reviewable
      if (possibleReviews.length > 0) {
        reviewable = true;
      }
    }

    const responseData = {
      user: found,
      average: average,
      count: revfound.count,
      hasFavourites: hasFavourites, // boolean if the user has any favourites
      hasRequests: hasRequests, //boolean if the user has any post requsts
      hasPosts: hasPosts, //boolean gia to an o xrhshs exei posts
      hasInterested: hasInterested, // boolean gia to an o xrhsths endiaferetai gia posts
      interestedForYourPosts: hasIntPosts, // boolean gia to an uparxoun endiaferomenoi twn post tou user
      reviewAble: reviewable, //boolean gia to an o xrhsths mporei na kanei review se afto to profil
      isVisible: isVisible, //Boolean for the phone to be visible or not.
      image: "images/" + data.email + ".jpeg",
      message: "Ο χρήστης βρέθηκε",
    };
    return { status: 200, data: responseData };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};
module.exports = {
  getAllUsers,
  getOneUser,
  createNewUser,
  updateOneUser,
  deleteOneUser,
  createToken,
  updatePass,
  userVerify,
  login,
  sendOtp,
  searchUser,
};