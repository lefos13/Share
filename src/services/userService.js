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
const { verification, checkPass, saveFcm } = require("../database/utils");
const { insertAver } = require("../utils/functions");
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

    const final = await User.register(data);
    if (final.status == 200) {
      let base64 = data.photo;
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync("uploads/" + data.email + ".jpeg", buffer);
    }

    return final;
  } catch (error) {
    console.log(error);
    return { status: 500 };
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
    let lang = data.headers["accept-language"];
    if (lang == "en") {
      lang = fs.readFileSync("lang/english.json");
      lang = JSON.parse(lang);
    } else if (lang == "gr") {
      lang = fs.readFileSync("lang/greek.json");
      lang = JSON.parse(lang);
    }
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
    let data = req.body.data;
    let email = req.body.data.email;
    let password = req.body.data.pass;
    const userExist = await User.findOneUser(email);
    if (userExist === false) throw new Error("Error at finding the user");
    // CHECK IF THE UPDATE IS FOR A NEW GOOGLE USER
    const campareGooglePass = await bcrypt.compare(
      "google_sign_in_pass",
      userExist.password
    );
    if (campareGooglePass === true) {
      // update the pass with no current password mandatory

      // GENERATE HASH FOR THE PASSWORD GIVEN
      const salt = await bcrypt.genSalt(saltRounds);
      let hash = await bcrypt.hash(password, salt);
      const user = await User.updatePassUser(email, hash);
      if (user === false) {
        throw new Error("Error at updating the password");
      } else {
        return { status: 200, message: "Ο κωδικός ανανεώθηκε!" };
      }
    } else if (data.currentPassword == null) {
      console.log("Changing password from forgot procedure...");
      // GENERATE HASH FOR THE PASSWORD GIVEN
      const salt = await bcrypt.genSalt(saltRounds);
      let hash = await bcrypt.hash(password, salt);

      // UPDATE USER'S PASSWORD
      const user = await User.updatePassUser(email, hash);

      if (user === null) {
        return { status: 404, message: "Ο χρήστης δεν βρέθηκε." };
      } else if (user == false) {
        throw new Error(
          "Κάτι πήγε στραβά μέσα στο Function updatePassUser στο αρχείο database/User.js"
        );
      } else {
        return { status: 200, message: "Ο κωδικός ανανεώθηκε." };
      }
    } else {
      console.log("Changing password normally...");
      let curPass = data.currentPassword;
      const salt = await bcrypt.genSalt(saltRounds);
      let hash = await bcrypt.hash(password, salt);

      const compareNew = await bcrypt.compare(curPass, userExist.password);
      if (!compareNew) {
        return {
          status: 406,
          message: "Λανθασμένος τρέχων κωδικός!",
        };
      }
      const compareOld = await bcrypt.compare(password, userExist.password);
      if (compareOld) {
        return {
          status: 406,
          message: "Ο νέος κωδικός είναι ο ίδιος με τον παλιό!",
        };
      }

      const updatedPass = await User.updatePassUser(email, hash);
      if (updatedPass === false) {
        throw new Error("Error at updating the password");
      }
      return { status: 200, message: "Ο κωδικός ανανεώθηκε!" };
    }
    // USER
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
    } else if (user === false) {
      throw new Error("Σφάλμα στην findOneUser του User.js");
    } else {
      //USER EXISTS
      if (user.verified === false) {
        return {
          status: 405,
          message: "Πρέπει να επιβεβαιώσεις το email σου.",
        };
      } else {
        // CHECK IF THE PASS IS GOOGLE FIXED ONE
        const campareGooglePass = await bcrypt.compare(
          "google_sign_in_pass",
          user.password
        );
        if (campareGooglePass === true) {
          return {
            status: 406,
            message:
              "Πρέπει να κάνεις forgot password για να ορίσεις νέο κωδικό πρόσβασης!",
          };
        } else {
          // CHECK IF THE PASS IS RIGHT
          const result = await bcrypt.compare(pass, user.password);
          const whatToReturn = await checkPass(result, user, fcmToken, email);
          //update the login state
          const updatedState = await User.updateLoginState(user.email, false);
          if (updatedState === false) {
            throw new Error("Error at updating the state of the user");
          }
          return whatToReturn;
          // ============
        }
      }
    }
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const loginThirdParty = async (req) => {
  try {
    let data = req.body.data;
    let userRegistered = false;
    let forceUpdate = false;
    data["isThirdPartyLogin"] = true;
    const user = await User.findOneUser(data.email);
    if (user === false) {
      throw new Error("Something went wrong with finding the user");
    } else if (user === null) {
      //Register and login

      //encrypt the password
      let salt = await bcrypt.genSalt(saltRounds);
      data.password = await bcrypt.hash(data.password, salt);

      // save the user to the db
      let userRegistered = await User.saveViaGoogle(data);
      if (userRegistered === false) {
        throw new Error("Error at saving the user via Google sign in");
      }

      let newUser = await User.findOneUser(data.email);
      if (newUser === false) throw new Error("Error at getting the new user");

      // ignore some properties
      let { password, mobile, photo, ...rest } = newUser.dataValues;

      // flag that the user is new
      userRegistered = true;

      //MISING FCM TOKEN CODE
      let fcmDone = await saveFcm(data.fcmToken, data.email);
      if (fcmDone === false) {
        throw new Error("Error at creating/updating the fcmToken");
      }
      //
      return {
        status: 200,
        response: {
          user: rest,
          message: "Επιτυχής είσοδος!",
          forceUpdate: forceUpdate,
          userRegistered: userRegistered,
        },
      };
    } else {
      //Login
      let userData = user.toJSON();
      let { password, mobile, photo, ...rest } = userData;
      //TEMP CODE FOR PHOTO
      const photoPath = "./uploads/" + data.email + ".jpeg";
      //check if the photo exists and insert the property
      if (fs.existsSync(photoPath)) {
        rest.photo = "images/" + data.email + ".jpeg";
      }
      //MISING FCM TOKEN CODE
      let fcmDone = await saveFcm(data.fcmToken, data.email);
      if (fcmDone === false) {
        throw new Error("Error at creating/updating the fcmToken");
      }
      //

      rest.isThirdPartyLogin = true;
      const response = {
        user: rest,
        message: "Επιτυχής είσοδος!",
        forceUpdate: forceUpdate,
        userRegistered: userRegistered,
      };

      const updatedState = User.updateLoginState(rest.email, true);
      if (updatedState === false)
        throw new Error("Error at updating the login state!");

      return { status: 200, response: response };
    }
  } catch (error) {
    console.log(error);
    return { status: 500 };
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
      if (possibleReviews === false)
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

const notifyMe = async (req) => {
  try {
    let extra = req.body.extra;
    let arrayOfUsers = [];

    let dateToCheck = moment().subtract(1, "days");

    // FIND THE ROWS THAT I AM A PASSENGER OR DRIVER AND THE POST IS ALREADY FINISHED BY A DAY
    let possibleReviews = await ToReview.findAllMyFinished(
      extra,
      extra,
      dateToCheck
    );
    if (possibleReviews == false)
      throw new Error("Error at finding all the finished possible reviews");

    // CHECK IF THE USER HAS ALREADY DONE HIS PART OF THE REVIEW
    possibleReviews = _.filter(possibleReviews, (obj) => {
      if (obj.passengerEmail == extra && obj.passengerDone == true) {
        return false;
      } else if (obj.driverEmail == extra && obj.driverDone == true) {
        return false;
      } else return true;
    });
    //SCAN THE LIST AND GATHER THE USERS THAT THE CLIENT NEED TO REVIEW
    for await (val of possibleReviews) {
      if (val.passengerEmail == extra) {
        // IF YOU ARE WERE A PASSENGER
        const user = await User.findOneLight(val.driverEmail);
        if (user == false) throw new Error("Error at finding the user");

        const reviewExist = await Review.findOne(val.driverEmail, extra);
        if (reviewExist == false) throw new Error("Error at finding review");

        let toEdit = false;
        if (reviewExist != null) {
          toEdit = true;
        }

        user.dataValues.toEdit = toEdit;
        user.dataValues.imagePath = "images/" + user.email + ".jpeg";
        let res = await insertAver(user);
        user.dataValues.average = res.average;
        user.dataValues.count = res.count;
        arrayOfUsers.push(user);
      } else {
        //IF THE USER WAS THE DRIVER
        const user = await User.findOneLight(val.passengerEmail);
        if (user == false) throw new Error("Error at finding the user");
        if (user == null) {
          throw new Error("User doesnt exist");
        }

        // console.log(user);
        const reviewExist = await Review.findOne(val.passengerEmail, extra);
        if (reviewExist == false) throw new Error("Error at finding review");

        let toEdit = false;
        if (reviewExist != null) {
          toEdit = true;
        }

        user.dataValues.toEdit = toEdit;
        user.dataValues.imagePath = "images/" + user.email + ".jpeg";
        let res = await insertAver(user);
        user.dataValues.average = res.average;
        user.dataValues.count = res.count;

        arrayOfUsers.push(user);
      }
    }
    if (arrayOfUsers.length > 0)
      return { status: 200, data: { usersToReview: arrayOfUsers } };
    else
      return {
        status: 404,
        message: "Δεν βρέθηκαν χρήστες ως προς αξιολόγηση!",
      };
  } catch (error) {
    console.log(error);
    return { status: 500 };
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
  notifyMe,
  loginThirdParty,
};
