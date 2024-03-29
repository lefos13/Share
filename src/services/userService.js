// In src/services/Userservice.js

// *** ADD *** (methods for all the Users that access data in db)
const User = require("../database/User");
const Review = require("../database/Review");
const Request = require("../database/Request");
const Post = require("../database/Post");
const PostInt = require("../database/PostInterested");
const ToReview = require("../database/ToReview");
const PostInterested = require("../database/PostInterested");
const ConvUsers = require("../database/ConvUsers");
const LastSearch = require("../database/LastSearch");
const Notification = require("../database/Notifications");
const SearchPost = require("../database/Request");
const Group = require("../database/Group");
const GroupServices = require("../services/groupService");
const bcrypt = require("bcrypt");
var otpGenerator = require("otp-generator");
const saltRounds = 10;
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { verification, checkPass, saveFcm } = require("../database/utils");
const {
  insertAver,
  determineLang,
  backUpUser,
  checkImagePath,
  getVersion,
} = require("../utils/functions");
const moment = require("moment");
const _ = require("lodash");

//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const {
  EMAIL,
  TOKEN_CRYPTO_KEY,
  HOST,
  USERR,
  PASS,
  DATABASE,
  TOKEN_KEY,
  GOOGLE_KEY,
} = process.env;
// END OF SECTION (ENV VAR)
// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");
const Users = require("../modules/user");
const FcmToken = require("../modules/fcmtoken");
const sequelize = new Sequelize(DATABASE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

//REACT NATIVE DECRYPT
var AES = require("react-native-crypto-js").AES;
var CryptoJS = require("react-native-crypto-js");

// create User service
const createNewUser = async (req) => {
  try {
    console.log("Service createNewUser --- Headers of request: " + req.headers);
    console.log("Email of new User: " + req.body.data.email);
    const msg = await determineLang(req);
    const data = req.body.data;
    data["lastLang"] = msg.lang;

    // Extract photo from data and remove it from the object
    const { photo, ...userData } = data;

    // Hash the user's password
    const salt = await bcrypt.genSalt(saltRounds);
    userData.password = await bcrypt.hash(userData.password, salt);

    // Register the user
    const final = await User.register(userData, msg);

    if (final.status === 200) {
      // Save the user's photo
      const base64 = photo;
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync("uploads/" + userData.email + ".jpeg", buffer);
    }

    return final;
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const updateOneUser = async (req) => {
  try {
    const msg = await determineLang(req);
    const { photo, ...userData } = req.body.data;
    const email = req.body.extra;

    const res = await User.updateUser(userData, email);
    if (!res) {
      throw new Error("Failed to update profile");
    }

    if (photo) {
      const base64 = photo;
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync(`uploads/${email}.jpeg`, buffer);
    }

    return { status: 200, message: msg.updateProfile };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const createToken = async (data) => {
  try {
    let email = data.body.data.email;
    if (data.body.data.hasEncryption === true) {
      const decryptedData = AES.decrypt(email, TOKEN_CRYPTO_KEY);
      email = decryptedData.toString(CryptoJS.enc.Utf8);
    }
    let msg = await determineLang(data);
    const user = await User.findOneUser(email);
    if (user === false) {
      // if error with the db
      throw msg;
    } else if (user == null) {
      //if user doesnt exist
      return { status: 404, data: msg.userNull };
    } else if (user.verified === false) {
      //if user isnt verified
      var otp = otpGenerator.generate(4, {
        digits: true,
        upperCase: false,
        alphabets: false,
        specialChars: false,
      });

      let response = {
        message: msg.confirmEmail,
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

      const fdata = {
        message: msg.tokenSuc,
        accessToken: accessToken,
      };
      return { status: 200, data: fdata };
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const updatePass = async (req) => {
  try {
    let data = req.body.data;
    let email = req.body.data.email;
    let password = req.body.data.pass;
    let msg = await determineLang(req);
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
        return { status: 200, message: msg.upPassSuc };
      }
    } else if (data.currentPassword == null) {
      // GENERATE HASH FOR THE PASSWORD GIVEN
      const salt = await bcrypt.genSalt(saltRounds);
      let hash = await bcrypt.hash(password, salt);

      // UPDATE USER'S PASSWORD
      const user = await User.updatePassUser(email, hash);

      if (user === null) {
        return { status: 404, message: msg.userNull };
      } else if (user === false) {
        throw new Error(
          "Κάτι πήγε στραβά μέσα στο Function updatePassUser στο αρχείο database/User.js"
        );
      } else {
        return { status: 200, message: msg.upPassSuc };
      }
    } else {
      let curPass = data.currentPassword;
      const salt = await bcrypt.genSalt(saltRounds);
      let hash = await bcrypt.hash(password, salt);

      const compareNew = await bcrypt.compare(curPass, userExist.password);
      if (!compareNew) {
        return {
          status: 406,
          message: msg.wrongPass,
        };
      }
      const compareOld = await bcrypt.compare(password, userExist.password);
      if (compareOld) {
        return {
          status: 406,
          message: msg.curEqualOld,
        };
      }

      const updatedPass = await User.updatePassUser(email, hash);
      if (updatedPass === false) {
        throw new Error("Error at updating the password");
      }
      return { status: 200, message: msg.upPassSuc };
    }
    // USER
  } catch (err) {
    console.error(err);
    return { status: 500 };
  }
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
    console.error(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const login = async (req) => {
  try {
    let data = req.body.data;
    console.log("Data for login user:", data);
    var email = req.body.data.email;
    var pass = req.body.data.pass;
    let autoLogin = req.body.data.autoLogin;

    //get current os of user
    let OS = data.OS;
    //update os of the user
    await User.updateOS(email, OS).catch((err) => {
      throw err;
    });

    let fcmToken = req.body.data.fcmToken;

    let msg = await determineLang(req);

    // CHECK IF USER EXISTS
    const user = await User.findOneUser(email);

    if (user == null) {
      return { status: 404, message: msg.userNull };
    } else if (user === false) {
      throw new Error("Σφάλμα στην findOneUser του User.js");
    } else {
      //USER EXISTS
      if (user.verified === false) {
        return {
          status: 405,
          message: msg.confirmEmail,
        };
      } else {
        // CHECK IF THE PASS IS GOOGLE FIXED ONE
        const campareGooglePass = await bcrypt.compare(
          "google_sign_in_pass",
          user.password
        );
        if (campareGooglePass === true && autoLogin === false) {
          return {
            status: 406,
            message: msg.norLoginAfterGoogle,
          };
        } else if (user.isThirdPartyLogin === true && autoLogin === true) {
          //case that is google signed in and go for autologin

          let userData = user.toJSON();
          let { password, mobile, photo, ...rest } = userData;
          //check if the photo exists and insert the property
          if (await checkImagePath(data.email)) {
            rest.photo = "images/" + data.email + ".jpeg";
          } else {
            rest.photo = null;
          }
          //FCM TOKEN CODE
          let fcmDone = await saveFcm(data.fcmToken, data.email);
          if (fcmDone === false) {
            throw new Error("Error at creating/updating the fcmToken");
          }
          //update lang for user
          const updateLang = await User.updateLang(user.email, msg.lang);
          if (updateLang === false) {
            throw new Error("Error at updating lastLang");
          }

          //activate account if user was deleted
          if (user.deleted == true) {
            User.activateAccount(user.email);
          }

          //get Versions of clients
          const versions = await getVersion();
          console.log("Response from login api", {
            status: 200,
            message: msg.loginSuc,
            user: rest,
            forceUpdate: false,
            ...versions,
          });
          return {
            status: 200,
            message: msg.loginSuc,
            user: rest,
            forceUpdate: false,
            ...versions,
          };
        } else {
          // CHECK IF THE PASS IS RIGHT
          const result = await bcrypt.compare(pass, user.password);

          let whatToReturn = await checkPass(
            result,
            user,
            fcmToken,
            email,
            msg
          );
          //update the login state
          if (autoLogin === false && whatToReturn.status == 200) {
            whatToReturn.user.isThirdPartyLogin = false;
            const updatedState = await User.updateLoginState(user.email, false);
            if (updatedState === false) {
              throw new Error("Error at updating the state of the user");
            }
          }
          const updateLang = await User.updateLang(user.email, msg.lang);
          if (updateLang === false) {
            throw new Error("Error at updating lastLang");
          }

          //activate account if user was deleted
          if (user.deleted == true) {
            User.activateAccount(user.email);
          }

          return whatToReturn;
          // ============
        }
      }
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const loginThirdParty = async (req) => {
  try {
    let msg = await determineLang(req);
    let data = req.body.data;
    console.log("Headers for thrid party login:", req.headers);
    console.log("Data for third party log in:", data);
    let userRegistered = false;
    let forceUpdate = false;

    data["isThirdPartyLogin"] = true;
    data["photo"] = null;
    data["lastLang"] = msg.lang;
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

      //get OS of the user
      let OS = data.OS;
      //update os of the user
      await User.updateOS(data.email, OS).catch((err) => {
        throw err;
      });
      //
      const versions = await getVersion();
      console.log("Respnse from second case of login third party api", {
        status: 200,
        response: {
          user: rest,
          message: msg.loginSuc,
          forceUpdate: forceUpdate,
          userRegistered: userRegistered,
          ...versions,
        },
      });
      return {
        status: 200,
        response: {
          user: rest,
          message: msg.loginSuc,
          forceUpdate: forceUpdate,
          userRegistered: userRegistered,
          ...versions,
        },
      };
    } else {
      //Login
      let userData = user.toJSON();
      let { password, mobile, photo, ...rest } = userData;
      //TEMP CODE FOR PHOTO
      //check if the photo exists and insert the property
      if (await checkImagePath(data.email)) {
        rest.photo = "images/" + data.email + ".jpeg";
      } else {
        rest.photo = null;
      }
      //MISING FCM TOKEN CODE
      let fcmDone = await saveFcm(data.fcmToken, data.email);
      if (fcmDone === false) {
        throw new Error("Error at creating/updating the fcmToken");
      }
      //
      const versions = await getVersion();
      rest.isThirdPartyLogin = true;
      const response = {
        user: rest,
        message: msg.loginSuc,
        forceUpdate: forceUpdate,
        userRegistered: userRegistered,
        ...versions,
      };

      console.log("Response from loginThirdParty:", response);

      const updatedState = User.updateLoginState(rest.email, true);
      if (updatedState === false)
        throw new Error("Error at updating the login state!");

      const updatedLang = User.updateLang(rest.email, msg.lang);
      if (updatedLang === false) {
        throw new Error("Error at updating the last lang");
      }
      //get OS of the user
      let OS = data.OS;
      //update os of the user
      await User.updateOS(data.email, OS).catch((err) => {
        throw err;
      });
      //activate account if user was deleted
      if (user.deleted == true) {
        User.activateAccount(user.email);
      }
      return { status: 200, response: response };
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const sendOtp = async (req) => {
  try {
    let msg = await determineLang(req);
    var email = req.body.data.email;

    var otp = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false, //test
      lowerCaseAlphabets: false, //test
      alphabets: false, //production
      upperCase: false, //production
      specialChars: false,
    });

    console.log("OTP GENERATED", otp);

    verification(otp, email);

    return {
      status: 200,
      message: msg.otpSent,
      otp: otp,
    };
  } catch (error) {
    return { status: 500 };
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
    const msg = await determineLang(req);

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

    if (found.deleted === true) {
      return { status: 404, message: msg.userDeleted };
    }

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
      if (interested === false) {
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

    let imagePath = null;
    if (await checkImagePath(found.email)) {
      imagePath = "images/" + found.email + ".jpeg";
    }

    let peopleDriven = 0;
    let ridesTaken = 0;

    //========= ridesTaken functionality ===========
    let curDate = moment();
    //Get all the interests that i am verified
    const allInt = await PostInterested.findAllVerifed(data.email);
    if (allInt === false) {
      throw new Error(
        "Something went wrong with findind all the verified interests"
      );
    }
    //Count the posts that are expired
    for await (int of allInt) {
      let postExp = await Post.findExpired(int.postid, curDate);
      if (postExp === false) {
        throw new Error("Something went wrong with db function");
      }

      if (postExp == null) {
        ridesTaken++;
      }
    }

    //ridesTaken --- END

    //==========================
    //peopleDriven functionality

    //Get all my expired posts
    const allExpired = await Post.findAllExpired(data.email, curDate);
    if (allExpired === false) {
      throw new Error("Something went wrong with db function");
    }

    //count all the interested users that are verifed
    for await (post of allExpired) {
      let count = await PostInterested.countVerified(post.postid);
      if (count === false) {
        throw new Error("Something went wrong with db function");
      }
      peopleDriven = peopleDriven + count;
    }
    //peopleDriven --- END

    const responseData = {
      user: found,
      average: average,
      count: revfound.count,
      ridesTaken: ridesTaken,
      peopleDriven: peopleDriven,
      hasFavourites: hasFavourites, // boolean if the user has any favourites
      hasRequests: hasRequests, //boolean if the user has any post requsts
      hasPosts: hasPosts, //boolean gia to an o xrhshs exei posts
      hasInterested: hasInterested, // boolean gia to an o xrhsths endiaferetai gia posts
      interestedForYourPosts: hasIntPosts, // boolean gia to an uparxoun endiaferomenoi twn post tou user
      reviewAble: reviewable, //boolean gia to an o xrhsths mporei na kanei review se afto to profil
      image: imagePath,
      message: msg.userFound,
    };
    return { status: 200, data: responseData };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const notifyMe = async (req) => {
  try {
    let extra = req.body.extra;
    let arrayOfUsers = [];
    const msg = await determineLang(req);

    let dateToCheck = moment().subtract(1, "days");

    // FIND THE ROWS THAT I AM A PASSENGER OR DRIVER AND THE POST IS ALREADY FINISHED BY A DAY
    let possibleReviews = await ToReview.findAllMyFinished(
      extra,
      extra,
      dateToCheck
    );
    if (possibleReviews === false)
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
        let user = await User.findOneLight(val.driverEmail);
        if (user === false) throw new Error("Error at finding the user");

        const reviewExist = await Review.findOne(val.driverEmail, extra);
        if (reviewExist === false) throw new Error("Error at finding review");

        let toEdit = false;
        if (reviewExist != null) {
          toEdit = true;
        }

        user.dataValues.toEdit = toEdit;
        if (await checkImagePath(user.email))
          user.dataValues.imagePath = "images/" + user.email + ".jpeg";
        else user.dataValues.imagePath = null;
        let res = await insertAver(user);
        user.dataValues.average = res.average;
        user.dataValues.count = res.count;
        arrayOfUsers.push(user);
      } else {
        //IF THE USER WAS THE DRIVER
        let user = await User.findOneLight(val.passengerEmail);
        if (user === false) throw new Error("Error at finding the user");
        if (user == null) {
          throw new Error("User doesnt exist");
        }

        const reviewExist = await Review.findOne(val.passengerEmail, extra);
        if (reviewExist === false) throw new Error("Error at finding review");

        let toEdit = false;
        if (reviewExist != null) {
          toEdit = true;
        }

        user.dataValues.toEdit = toEdit;
        if (await checkImagePath(user.email))
          user.dataValues.imagePath = "images/" + user.email + ".jpeg";
        else user.dataValues.imagePath = null;
        let res = await insertAver(user);
        user.dataValues.average = res.average;
        user.dataValues.count = res.count;

        arrayOfUsers.push(user);
      }
    }
    if (arrayOfUsers.length > 0) {
      console.log(
        "User:",
        extra,
        " has:",
        arrayOfUsers.length,
        " other users for review!"
      );
      return { status: 200, data: { usersToReview: arrayOfUsers } };
    } else
      return {
        status: 404,
        message: msg.usersToReview,
      };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const deleteUser = async (req) => {
  try {
    let msg = await determineLang(req);
    let email = req.body.extra;
    let curDate = moment();

    //get all posts that user is interested, Find all that are active
    const allInt = await PostInterested.findAllperUser(email);
    if (allInt === false) {
      throw new Error("error at finding all the interests of user");
    }

    //delete all interests of user from posts that are active
    for await (int of allInt) {
      // for each interest
      // check if the post is expired.
      let expired = await Post.findExpired(int.postid, curDate);
      if (expired === false) throw new Error("Error at finding certain post");
      else if (expired != null) {
        //delete interest
        int.destroy();
      }
    }

    //delete all chats of user
    const deletedChat = await ConvUsers.deleteAll(email);
    if (!deletedChat) throw new Error("Error at deleting the chats!");

    //leave from all the groups that the user is in
    const allGroups = await Group.getAll(email);
    if (allGroups === false) throw new Error("Error at finding all the groups");
    await Promise.all(
      allGroups.map(async (group) => {
        const request = {
          body: {
            extra: email,
            groupId: group.groupId,
          },
          headers: {
            "accept-language": "GR",
          },
        };
        if (group.admin !== email) {
          const response = await GroupServices.leaveGroup(request);
          if (response.status === 500) {
            throw new Error("Error at leaving a group");
          } else {
            console.log(
              `User: ${email} has left the group: ${group.groupId} due to deactivation of account!`
            );
          }
        } else {
          const response = await GroupServices.deleteGroup(request);
          if (response.status === 500) {
            throw new Error("Error at leaving a group");
          } else {
            console.log(
              `User: ${email} has deleted the group: ${group.groupId} due to deactivation of account!`
            );
          }
        }
      })
    );

    //get all active posts of user
    const allPosts = await Post.findAllActive(email, curDate);
    if (allPosts === false) {
      throw new Error("error at finding acrive posts");
    }

    //delete all user's active posts and interests
    let postIds = [];
    _.forEach(allPosts, (val) => {
      postIds.push(val.postid);
    });

    const deletedInts = await PostInterested.destroyPerArrayIds(postIds);
    if (deletedInts === false) {
      throw new Error("error at deleting the interests");
    }

    const deletedPosts = await Post.destroyAllPerIds(postIds);
    if (deletedPosts === false) {
      throw new Error("error at deleting active User's posts");
    }

    //delete all active potential reviews
    const deletedToReviews = await ToReview.deleteAllPerUser(email);
    if (deletedToReviews === false) {
      throw new Error("error at deleting potential reviews");
    }

    //delete all requests of the user
    const deletedReq = await Request.deletePerUser(email);
    if (deletedReq === false) {
      throw new Error("Error at deleting requests");
    }

    //update profile
    const deleted = await User.updateDeleted(email);
    if (deleted === false) {
      throw new Error("Error at updating 'deleted' of user");
    }

    return { status: 200, response: { message: msg.deleteUser } };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const permDeleteUser = async (req) => {
  try {
    
    let msg = await determineLang(req);
    let email = req.body.extra;
    let curDate = moment();
    let dataToBackUp = {};

    console.log(`DELETING USER: ${email} FROM DATABASE AND ALL HIS DATA`);

    const user = await User.findOneUser(email);
    dataToBackUp.user = user;
    user.destroy();

    // get all posts that user is interested, Find all that are active
    const allInt = await PostInterested.findAllperUser(email);
    if (allInt === false) {
      throw new Error("error at finding all the interests of user");
    }
    dataToBackUp.allInterestsOfUser = allInt;
    _.invokeMap(allInt, "destroy");

    //get all posts of user
    const posts = await Post.findAllOfUser(email);
    dataToBackUp.postsOfUser = posts;
    _.invokeMap(posts, "destroy");

    //get all chats of user
    const chats = await ConvUsers.findAll(email);
    dataToBackUp.chatsofUser = chats;
    _.invokeMap(chats, "destroy");

    const allGroups = await Group.getAll(email);
    if (allGroups === false) throw new Error("Error at finding all the groups");
    await Promise.all(
      allGroups.map(async (group) => {
        const request = {
          body: {
            extra: email,
            groupId: group.groupId,
          },
          headers: {
            "accept-language": "GR",
          },
        };
        if (group.admin !== email) {
          const response = await GroupServices.leaveGroup(request);
          if (response.status !== 200) {
            console.error("Error at leaving a group");
          } else {
            console.log(
              `User: ${email} has left the group: ${group.groupId} due to deactivation of account!`
            );
          }
        } else {
          const response = await GroupServices.deleteGroup(request);
          if (response.status !== 200) {
            console.error("Error at DELETING a group OF USER");
          } else {
            console.log(
              `User: ${email} has deleted the group: ${group.groupId} due to deactivation of account!`
            );
          }
        }
      })
    );

    //get fcmToken
    const fcmToken = await FcmToken.findOne({
      where: {
        email: email,
      },
    });
    dataToBackUp.fcmTokenOfUser = fcmToken;
    if (fcmToken != null) {
      fcmToken.destroy();
    }

    //get all searches of user
    const lastSearches = await LastSearch.getAll(email);
    dataToBackUp.lastSearchesOfUser = lastSearches;
    _.invokeMap(lastSearches, "destroy");

    //get all notifications of user
    const notifications = await Notification.getAllofUser(email);
    dataToBackUp.notificationsOfUser = notifications;
    _.invokeMap(notifications, "destroy");

    //get all reviews for this user
    const allReviews = await Review.findAll(email);
    dataToBackUp.reviewsOfUser = allReviews;
    _.invokeMap(allReviews, "destroy");

    //get all search posts request
    const searchPosts = await SearchPost.getAll(email);
    dataToBackUp.postsRequestOfUser = searchPosts;
    _.invokeMap(searchPosts, "destroy");

    //get all potential reviews of user
    const potentialReviews = await ToReview.findAllPerUser(email);
    dataToBackUp.toReviewsOfUser = potentialReviews;
    _.invokeMap(potentialReviews, "destroy");

    //delete photo
    const filePath = "uploads/" + dataToBackUp.user.email + ".jpeg";
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    //backup all data of deleted user
    backUpUser(dataToBackUp);
    console.log(`USER ${email} deleted Successfully!`);
    return { status: 200, response: { message: msg.permDeleteAccount } };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

//Service that do integration of the controller searchUsers
const searchUsers = async (req) => {
  try {
    let msg = await determineLang(req);
    let email = req.body.extra;
    let curDate = moment();
    let data = req.body;
    // console.log(data);
    // console.log(data.data);
    // console.log(req.body);
    // console.log(req);

    //get all users based on the fullname that client sent inside data
    const allUsers = await User.findUsersByFullname(data.fullName, email);
    if (allUsers === false) {
      throw new Error("error at finding all the users");
    }

    //for each user insert average rating data
    for await (let user of allUsers) {
      let res = await insertAver(user);
      user.dataValues.average = res.average;
      user.dataValues.count = res.count;
      // check if image of user exists
      if (await checkImagePath(user.email)) {
        user.dataValues.imagePath = "images/" + user.email + ".jpeg";
      } else {
        user.dataValues.imagePath = null;
      }
    }

    //return the list of the users
    //if allUsers is empty return 404
    let count = allUsers.length;
    if (allUsers.length === 0) {
      return { status: 404, message: msg.noUsers };
    } else {
      //paginate the list of users
      let skipcount = 0;
      let takecount = 10;
      if (data.page > 1) skipcount = data.page * 10 - 10;
      let finalarr = _.take(_.drop(allUsers, skipcount), takecount);
      let mod = count % 10;
      let totallength = 1;
      mod == 0
        ? (totallength = count / 10)
        : (totallength = count / 10 - mod / 10 + 1);

      if (data.page > totallength) {
        return {
          status: 404,
          message: msg.paginationLimit,
        };
      }
      return {
        status: 200,
        data: {
          users: finalarr,
          totalPages: totallength,
          totalLength: count,
          pageLength: finalarr.length,
        },
      };
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

module.exports = {
  searchUsers,
  permDeleteUser,
  deleteUser,
  createNewUser,
  updateOneUser,
  createToken,
  updatePass,
  userVerify,
  login,
  sendOtp,
  searchUser,
  notifyMe,
  loginThirdParty,
};
