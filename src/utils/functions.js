const nodemailer = require("nodemailer");

const dotenv = require("dotenv");
dotenv.config();
// get the values from the .env file

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  // databaseURL: "https://<DATABASEE_NAME>.firebaseio.com",
});

var _ = require("lodash");

const Review = require("../database/Review");
const Notification = require("../database/Notifications");

const {
  EMAIL,
  PASSEMAIL,
  DATABASEE,
  USERR,
  PASS,
  HOST,
  TOKEN_KEY,
  IVHEX,
  KEYCRYPTO,
} = process.env;
const { Sequelize, DataTypes, fn } = require("sequelize");
const { nextTick } = require("process");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASEE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

const moment = require("moment");
const RFC_H = "DD/MM/YYYY HH:mm";
const RFC_ONLYM = "DD/MM/YYYY";

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const { response } = require("express");
const fs = require("fs");

const crypto = require("crypto");
const User = require("../database/User");
const { reject } = require("lodash");
const e = require("express");
const algorithm = "aes-256-cbc";
const key = KEYCRYPTO;
const iv = Buffer.from(IVHEX, "hex");

/**
 * The function extracts the conversation ID from a group object in JavaScript.
 * @param group - The `group` parameter is an object that contains information about a group
 * conversation. It has two properties: `admin`, which is a string representing the email address of
 * the group admin, and `members`, which is an array of objects representing the group members. Each
 * member object has an `email`
 * @returns The function `extractConvid` returns a promise that resolves to a string representing the
 * conversation ID. If an error occurs during the execution of the function, it returns a new Error
 * object with a message indicating that something went wrong.
 */
const extractConvid = async (group) => {
  try {
    let convId = group.admin;
    let members = group.members;
    if (await IsJsonString(members)) {
      members = JSON.parse(members);
    }
    console.log(
      "Members of group that was found to extract the conversation ID: ",
      members
    );
    //loop through members with for each
    members.forEach((member) => {
      convId += " " + member.email;
    });
    return convId;
  } catch (error) {
    console.error(error);
    return new Error("Something went wrong at extracting the conversation ID");
  }
};
/**
 * The function inserts data to a group's members, including their full name, average rating, count,
 * and image path.
 * @param group - an object containing information about a group, including an array of members.
 * @returns The function `insertDataToMembers` returns an object with the updated `group` data, where
 * the `members` array has been updated with additional properties such as `fullname`, `average`,
 * `count`, and `imagePath` for each member.
 */
const insertDataToMembers = async (group) => {
  const updatedMembers = await Promise.all(
    group.members.map(async (member) => {
      const memberFullname = await User.findOneLight(member.email);
      const ratingData = await insertAver(member);
      const hasImagePath = await checkImagePath(member.email);
      const imagePath = hasImagePath ? `images/${member.email}.jpeg` : null;

      return {
        ...member,
        fullname: memberFullname.fullname,
        average: ratingData.average,
        count: ratingData.count,
        imagePath: imagePath,
      };
    })
  );
  return {
    ...group,
    members: updatedMembers,
  };
};
/**
 * The function checks if an image file exists in a specific directory based on the email parameter.
 * @param email - The email parameter is a string that represents the email address of a user. It is
 * used to check if an image file with the name "{email}.jpeg" exists in the "./uploads/" directory.
 * @returns The function `checkImagePath` returns a boolean value. It returns `true` if a file with the
 * name `email + ".jpeg"` exists in the `./uploads/` directory, and `false` otherwise. If an error
 * occurs while checking for the file, the function also returns `false`.
 */
const checkImagePath = async (email) => {
  try {
    if (fs.existsSync("./uploads/" + email + ".jpeg")) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

/**
 * The function `backUpUser` asynchronously writes a JSON file containing user data to a "deleted"
 * folder.
 * @param data - The data parameter is an object that contains information about a user, including
 * their email address.
 */
const backUpUser = async (data) => {
  try {
    var json = JSON.stringify(data);

    fs.writeFileSync("deleted/" + data.user.email + ".json", json, "UTF-8");
  } catch (error) {
    console.log(error);
  }
};

/**
 * The function sends a message to a Firebase Cloud Messaging token and returns true if successful,
 * otherwise false.
 * @param fcmToken - The FCM token is a unique identifier generated by Firebase Cloud Messaging (FCM)
 * that is used to send push notifications to a specific device or user. It is obtained by registering
 * the device with FCM and is required to send push notifications to that device.
 * @returns The function `verifyFCMToken` is returning the result of calling `admin.messaging().send()`
 * with a message object containing data, a token, and a notification. If the send operation is
 * successful, the function will return the result of the send operation. If there is an error, the
 * function will catch the error and return `false`.
 */
const verifyFCMToken = async (fcmToken) => {
  try {
    return admin.messaging().send(
      {
        data: {
          title: "asdasd",
        },
        token: fcmToken,
        notification: {
          title: "",
          body: "",
        },
      },
      true
    );
  } catch (error) {
    // console.error(error);
    console.log("Inside Validation!");
    return false;
  }
};

/**
 * This function determines the expiration date of a post based on its start and end dates, and whether
 * or not it has a return date.
 * @param post - an object containing information about a post, including startdate, enddate,
 * withReturn, returnStartDate, and returnEndDate.
 * @returns The function `determineExpirationDate` is returning a Promise that resolves to a moment
 * object representing the expiration date of a post. If there is an error, it returns a Promise that
 * resolves to `false`.
 */
const determineExpirationDate = async (post) => {
  try {
    let expiresIn;
    if (!post.withReturn) {
      if (post.enddate == null) {
        //change for the return date also
        expiresIn = moment(post.startdate).add(1, "weeks");
      } else {
        expiresIn = moment(post.enddate).add(1, "weeks");
      }
    } else {
      if (post.returnEndDate == null) {
        //change for the return date also
        expiresIn = moment(post.returnStartDate).add(1, "weeks");
      } else {
        expiresIn = moment(post.returnEndDate).add(1, "weeks");
      }
    }

    return expiresIn;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function encrypts an array of messages using a specified algorithm, key, and initialization
 * vector.
 * @param messages - The `messages` parameter is an array of objects, where each object represents a
 * message to be encrypted. Each message object has a `text` property that contains the actual message
 * text to be encrypted.
 * @returns The function `encryptMessages` returns either the encrypted `messages` array or `false` if
 * an error occurs during the encryption process.
 */
const encryptMessages = async (messages) => {
  try {
    for await (let val of messages) {
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      val.text = cipher.update(val.text, "utf-8", "hex");
      val.text += cipher.final("hex");
    }

    return messages;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * This is an asynchronous function that decrypts messages using a specified algorithm, key, and
 * initialization vector.
 * @param messages - The `messages` parameter is an array of objects, where each object represents a
 * message and has a `text` property containing the encrypted message in hexadecimal format. The
 * function decrypts each message using the `crypto` module's `createDecipheriv` method with the
 * specified `algorithm`, `key
 * @returns The function `decryptMessages` returns either the decrypted `messages` array or `false` if
 * an error occurs during decryption.
 */
const decryptMessages = async (messages) => {
  try {
    for await (let val of messages) {
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      val.text = decipher.update(val.text, "hex", "utf-8");
      val.text += decipher.final("utf-8");
    }

    return messages;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function retrieves a JSON file containing language-specific messages based on the input language
 * code.
 * @param lang - The `lang` parameter is a string that represents the language code for which the
 * function should retrieve the corresponding language file. It can be either "EN" for English or "GR"
 * for Greek. If the `lang` parameter is not "EN" or "GR", the function will default to
 * @returns The function `getLang` is returning a Promise that resolves to the contents of a JSON file
 * based on the `lang` parameter passed to it. The contents of the file are parsed into a JavaScript
 * object using `JSON.parse()`.
 */
const getLang = async (lang) => {
  let msg;
  if (lang == "EN") msg = JSON.parse(fs.readFileSync("./lang/english.json"));
  else if (lang == "GR") msg = JSON.parse(fs.readFileSync("./lang/greek.json"));
  else msg = JSON.parse(fs.readFileSync("./lang/greek.json"));

  return msg;
};

/**
 * The function determines the language based on the accept-language header and returns the
 * corresponding JSON file.
 * @param req - The `req` parameter is likely an object representing an HTTP request, which contains
 * information about the request such as headers, query parameters, and request body. The function
 * `determineLang` uses the `req` object to extract the `accept-language` header, which indicates the
 * preferred language of the
 * @returns The function `determineLang` is returning a Promise that resolves to an object containing
 * the messages in the language specified in the `accept-language` header of the request. If there is
 * an error, it returns the string "GR".
 */
const determineLang = async (req) => {
  try {
    let lang = req.headers["accept-language"];
    let msg;

    if (lang == "EN") msg = JSON.parse(fs.readFileSync("./lang/english.json"));
    else if (lang == "GR")
      msg = JSON.parse(fs.readFileSync("./lang/greek.json"));
    else msg = JSON.parse(fs.readFileSync("./lang/greek.json"));

    return msg;
  } catch (error) {
    console.error(error);
    return "GR";
  }
};

/**
 * The function checks if a given string is a valid JSON string.
 * @param str - The parameter `str` is a string that is being checked to see if it is a valid JSON
 * string. The function `IsJsonString` uses the `JSON.parse()` method to attempt to parse the string as
 * JSON. If the parsing is successful, the function returns `true`, indicating that the
 * @returns The function `IsJsonString` is returning a boolean value. It returns `true` if the input
 * string can be parsed as a valid JSON object, and `false` otherwise.
 */
const IsJsonString = async (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * This function sends notifications to a list of users about a new ride posted by a specific user.
 * @param postid - The ID of a post for a new ride.
 * @param emailArray - An array of email addresses of users to notify about a new ride.
 * @param postOwner - The email of the user who created the ride post.
 */
const newRide = async (postid, emailArray, postOwner) => {
  try {
    let owner = await Users.findOne({
      where: {
        email: postOwner,
      },
    }).catch((err) => {
      throw err;
    });

    // ========= New functionality for the new ride notifications
    let allMessages = [];
    let postIdString = postid.toString();

    // Loop through the array of users
    for await (let email of emailArray) {
      //get the user to notify
      const userToNotify = await Users.findOne({
        where: { email: email },
      }).catch((err) => {
        throw err;
      });

      let msg = await getLang(userToNotify.lastLang);

      //get the fcm token if it exists
      let fcmToken = await FcmToken.findOne({ where: { email: email } }).catch(
        (err) => {
          throw err;
        }
      );
      //determine if the token exists
      let fcmTok = fcmToken != null ? fcmToken.fcmToken : null;
      let message = {
        data: {
          type: "newRide",
          postid: postIdString,
          email: owner.email, // owner email
          fullname: owner.fullname, // owner email
        },
        token: fcmTok,
        notification: {
          title: msg.firebase.req_title,
          body:
            msg.firebase.not_ver_body0 +
            owner.fullname +
            msg.firebase.request_part2,
        },
      };
      // Insert notification to history
      let curTime = moment();
      let imagePath = null;
      if (await checkImagePath(owner.email)) {
        imagePath = "images/" + owner.email + ".jpeg";
      }
      const notificationToInsert = {
        imagePath: imagePath,
        date: curTime,
        type: message.data.type,
        postid: message.data.postid,
        email: message.data.email,
        fullName: message.data.fullname,
        ownerEmail: userToNotify.email,
        title: message.notification.title,
        message: message.notification.body,
        isRead: false,
      };

      Notification.createOne(notificationToInsert).then((data) => {
        console.log("Notification inserted: ", data);
      });
      // add the notification to the array to send to the firebase
      if (fcmToken != null) {
        await verifyFCMToken(fcmToken.fcmToken).then(() => {
          allMessages.push(message);
        });
      }
    }
    console.log("All notifications to send count: ", allMessages.length);
    // end of functionality

    if (allMessages.length > 0) {
      admin
        .messaging()
        .sendAll(allMessages)
        .then((response) => {
          console.log("Success: " + response);
        })
        .catch((err) => {
          console.error("Error to send massive notifications: " + err);
        });
    }
  } catch (error) {
    console.error("Inside Newride  ============= " + error);
  }
};

/**
 * This function sends a message notification to a user using Firebase Cloud Messaging.
 * @param messageSent - The message object that is being sent to the receiver.
 * @param receiverObj - An object containing information about the receiver of the message, including
 * their email and last language used.
 * @param senderEmail - The email address of the user who is sending the message.
 * @param conversationId - The ID of the conversation between the sender and receiver of the message.
 */

const sendMessageGroup = async (
  messageSent,
  userEmails,
  senderEmail,
  conversationId
) => {
  userEmails = userEmails.filter((userEmail) => userEmail !== senderEmail);
  await Promise.all(
    userEmails.map(async (userEmail) => {
      const receiverObj = await User.findOneLight(userEmail);
      let msg = await getLang(receiverObj.lastLang);
      const sender = await User.findOneLight(senderEmail);
      if (sender === false) throw new Error("Didnt find user");

      const fcm = await FcmToken.findOne({
        where: {
          email: receiverObj.email,
        },
      }).catch((err) => {
        throw err;
      });

      let data = {
        type: "groupChatReceivedMessage",
        conversationId: conversationId,
        message: messageSent.toString(),
      };
      let fcmTok = fcm != null ? fcm.fcmToken : null;
      let message = {
        data: data,
        token: fcmTok,
        notification: {
          title: msg.firebase.new_message,
          body:
            msg.firebase.not_ver_body0 +
            sender.fullname +
            msg.firebase.sent +
            messageSent.text,
        },
      };
      //If there is other notification of this conv replace it with this one.
      //code to be written!
      //
      if (fcm != null) {
        await verifyFCMToken(fcm.fcmToken)
          .then(() => {
            toSend = true;
          })
          .catch(() => {
            toSend = false;
          });
      } else {
        throw "User hasnt the app anymore!";
      }

      if (toSend !== false) {
        admin
          .messaging()
          .send(message)
          .then((response) => {
            console.log("Success: ", response);
          })
          .catch((err) => {
            throw err;
          });
      } else {
        throw "User has uninstalled the app!";
        // fcm.destroy();
      }
    })
  );
};

const sendMessage = async (
  messageSent,
  receiverObj,
  senderEmail,
  conversationId
) => {
  try {
    let msg = await getLang(receiverObj.lastLang);

    const sender = await User.findOneLight(senderEmail);
    if (sender === false) throw new Error("Didnt find user");

    const fcm = await FcmToken.findOne({
      where: {
        email: receiverObj.email,
      },
    }).catch((err) => {
      throw err;
    });

    let data = {
      type: "chatReceivedMessage",
      conversationId: conversationId,
      message: messageSent.toString(),
    };
    let fcmTok = fcm != null ? fcm.fcmToken : null;
    let message = {
      data: data,
      token: fcmTok,
      notification: {
        title: msg.firebase.new_message,
        body:
          msg.firebase.not_ver_body0 +
          sender.fullname +
          msg.firebase.sent +
          messageSent.text,
      },
    };
    let curTime = moment();
    //If there is other notification of this conv replace it with this one.
    if (true) {
      let imagePath = null;
      if (await checkImagePath(sender.email))
        imagePath = "images/" + sender.email + ".jpeg";
      const myJsonMessage = JSON.stringify(messageSent);
      const notificationToInsert = {
        imagePath: imagePath,
        date: curTime,
        type: data.type,
        conversationId: data.conversationId,
        convMessage: myJsonMessage,
        postid: null,
        email: senderEmail,
        fullName: sender.fullname,
        ownerEmail: receiverObj.email,
        title: message.notification.title,
        message: message.notification.body,
        isRead: false,
      };
      //find if a similar notification exists
      let exists = await Notification.checkNotificationMessage(
        notificationToInsert
      );
      if (exists === false)
        throw new Error(
          "Something went wrong with finding existing notification (message)"
        );
      else if (exists === null) {
        Notification.createOne(notificationToInsert).then((data) => {
          console.log("Notification inserted: ", data);
        });
      } else {
        await exists.destroy();
        Notification.createOne(notificationToInsert).then((data) => {
          console.log("Notification inserted: ", data);
        });
      }
    }
    let toSend = false;

    if (fcm != null) {
      await verifyFCMToken(fcm.fcmToken)
        .then(() => {
          toSend = true;
        })
        .catch(() => {
          toSend = false;
        });
    } else {
      throw "User hasnt the app anymore!";
    }
    if (toSend !== false) {
      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Success: ", response);
        })
        .catch((err) => {
          throw err;
        });
    } else {
      throw "User has uninstalled the app!";
      // fcm.destroy();
    }
  } catch (error) {
    // console.error("aaaaaaaaaaaaaaaaaaaaaaa");
    console.error(error);
  }
};

/**
 * This function sends a notification to an unverified user about a post disapproval, using Firebase
 * Cloud Messaging.
 * @param unverifiedEmail - The email address of the user who has been unverified.
 * @param postid - The ID of a post that has been disapproved.
 * @param ownerEmail - The email of the owner of a post.
 */
const toNotifyTheUnverified = async (unverifiedEmail, postid, ownerEmail) => {
  try {
    let postIdString = postid.toString();
    const owner = await User.findOneLight(ownerEmail);
    let fcmToken = await FcmToken.findOne({
      where: {
        email: unverifiedEmail,
      },
    }).catch((err) => {
      throw err;
    });

    const toNotifyUser = await User.findOneLight(unverifiedEmail);

    const msg = await getLang(toNotifyUser.lastLang);
    let fcmTok = fcmToken != null ? fcmToken.fcmToken : null;
    let message = {
      data: {
        type: "user_disapproved",
        postid: postIdString,
        email: owner.email, // owner email
        fullname: owner.fullname, // owner email
      },
      token: fcmTok,
      notification: {
        title: msg.firebase.unver_title,
        body:
          msg.firebase.not_ver_body0 + owner.fullname + msg.firebase.unver_body,
      },
    };

    let curTime = moment();
    let imagePath = null;
    if (await checkImagePath(owner.email)) {
      imagePath = "images/" + owner.email + ".jpeg";
    }
    const notificationToInsert = {
      imagePath: imagePath,
      date: curTime,
      type: message.data.type,
      postid: message.data.postid,
      email: message.data.email,
      fullName: message.data.fullname,
      ownerEmail: toNotifyUser.email,
      title: message.notification.title,
      message: message.notification.body,
      isRead: false,
    };
    Notification.createOne(notificationToInsert).then((data) => {
      console.log("Notification inserted: ", data);
    });

    let toSend = false;
    if (fcmToken != null) {
      await verifyFCMToken(fcmToken.fcmToken)
        .then(() => {
          toSend = true;
        })
        .catch(() => {
          toSend = false;
        });
    } else {
      throw "User hasnt the app anymore!";
    }
    if (toSend !== false) {
      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Success: ", response);
        })
        .catch((err) => {
          throw err;
        });
    } else {
      throw "User has uninstalled the app!";
      // fcmToken.destroy();
    }
  } catch (error) {
    console.error(error);
  }
};

const insertAver = async (user) => {
  try {
    //define the query for the db call
    let query = {
      attributes:
        // [sequelize.fn("count", sequelize.col("rating")), "counter"],
        [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
      where: {
        email: user.email,
      },
    };
    let results = await Review.findAndCountAll(query);

    if (results.count != 0) {
      let rows = results.rows;
      let total = null;
      for await (r of rows) {
        total = r.toJSON().total;
      }
      let average = total / results.count;
      let rounded = average.toFixed(1);
      rounded = parseFloat(rounded);
      let count = results.count;
      return {
        average: rounded,
        count: count,
      };
    } else {
      let average = 0;
      let count = 0;
      return {
        average: average,
        count: count,
      };
    }
  } catch (err) {
    console.error("inside InsertAver()" + err);
    return false;
  }
};

const returnAllMembers = async (group) => {
  try {
    group.members = IsJsonString(group.members)
      ? JSON.parse(group.members)
      : group.members;
    const admin = await User.findOneLight(group.admin);

    let adminData = {
      email: admin.email,
      pending: false,
    };
    let allData = {
      members: [...group.members, adminData],
    };
    allData.members = (await insertDataToMembers(allData)).members;
    return allData.members;
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports = {
  toNotifyTheUnverified,
  returnAllMembers,
  sendMessage,
  encryptMessages,
  decryptMessages,
  IsJsonString,
  /* The above code is defining an asynchronous function called `sendReport` that takes in two
  parameters: `text` and `email`. The function uses the `nodemailer` library to create a reusable
  transporter object that uses the Gmail service and the provided email and password for
  authentication. The function then sends an email with the provided `text` and `email` parameters
  as the body of the email to the email address specified in the `to` field. If the email is sent
  successfully, the function returns `true`, otherwise it returns `false`. */
  sendReport: async (text, email) => {
    try {
      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: EMAIL,
          pass: PASSEMAIL,
        },
      });

      // send mail with defined transport object
      info = await transporter.sendMail({
        from: `Report`,
        to: EMAIL, // list of receivers
        subject: "Report from the App", // Subject line
        text: text + " by " + email, // plain text body
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  /* The above code is defining an asynchronous function called `webSendReport` that sends an email
  report with data provided as parameters. It uses the nodemailer library to create a reusable
  transporter object and sends an email with the provided data to a specified email address. The
  function returns a boolean value indicating whether the email was sent successfully or not. */
  webSendReport: async (text, email, name, number) => {
    try {
      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: EMAIL,
          pass: PASSEMAIL,
        },
      });

      // send mail with defined transport object
      info = await transporter.sendMail({
        from: `Report`,
        to: EMAIL, // list of receivers
        subject: "Report from the App", // Subject line
        text: "All data sent:",
        html:
          "<br>Comment: " +
          text +
          "<br>Email: " +
          email +
          "<br>Fullname: " +
          name +
          "<br>Phone number: " +
          number, // plain text body
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  /* The above code is a JavaScript function that sends a notification to a user's device using
  Firebase Cloud Messaging (FCM). The function takes in parameters such as the email of the user to
  notify, the email of the user who performed an action (like or dislike) on a post, the post ID,
  and whether the action was a like or dislike. The function retrieves the necessary data from the
  database, constructs a message to be sent through FCM, and inserts a notification into the
  database. The function also checks if the user has uninstalled the app before attempting to send
  the notification. */
  toNotifyOwner: async (emailToNotify, emailAction, postid, liked) => {
    try {
      const user = await Users.findOne({
        where: {
          email: emailAction,
        },
      }).catch((err) => {
        throw err;
      });

      const userToNotify = await User.findOneLight(emailToNotify);

      let msg = await getLang(userToNotify.lastLang);

      const fcmData = await FcmToken.findOne({
        where: {
          email: emailToNotify,
        },
      }).catch((err) => {
        throw err;
      });
      let postString = postid.toString();
      let data;
      let message;
      let fcmToken = fcmData != null ? fcmData.fcmToken : null;
      if (liked === true) {
        data = {
          type: "receiveInterest",
          postid: postString,
          email: emailAction,
          fullname: user.fullname,
        };

        message = {
          data: data,
          token: fcmToken,
          notification: {
            title: msg.firebase.not_owner_title,
            body:
              msg.firebase.not_ver_body0 +
              user.fullname +
              msg.firebase.liked_post,
          },
        };
      } else {
        data = {
          type: "user_disliked",
          postid: postString,
          email: emailAction,
          fullname: user.fullname,
        };

        message = {
          data: data,
          token: fcmToken,
          notification: {
            title: msg.firebase.dislike_title,
            body:
              msg.firebase.not_ver_body0 +
              user.fullname +
              msg.firebase.dislike_body,
          },
        };
      }
      // Insert notification to history
      let curTime = moment();
      let imagePath = null;
      if (await checkImagePath(user.email)) {
        imagePath = "images/" + user.email + ".jpeg";
      }
      const notificationToInsert = {
        imagePath: imagePath,
        date: curTime,
        type: data.type,
        postid: data.postid,
        email: data.email,
        fullName: data.fullname,
        ownerEmail: emailToNotify,
        title: message.notification.title,
        message: message.notification.body,
        isRead: false,
      };
      Notification.createOne(notificationToInsert).then((data) => {
        console.log("Notification inserted: ", data);
      });

      let toSend = false;

      if (fcmData != null) {
        await verifyFCMToken(fcmData.fcmToken)
          .then(() => {
            toSend = true;
          })
          .catch(() => {
            toSend = false;
          });
      } else {
        throw "User hasnt the app anymore!";
      }

      if (toSend !== false) {
        // Send notification through firebase
        admin
          .messaging()
          .send(message)
          .then((response) => {
            console.log("Success: ", response);
          })
          .catch((err) => {
            throw err;
          });
      } else {
        // fcmData.destroy();
        throw "User has uninstalled the app!";
      }
    } catch (error) {
      console.error(error);
    }
  },

  /* The above code is a JavaScript function that sends a notification to a user with a verified email
  address. The function takes in four parameters: email, postid, ownerEmail, and convId. It first
  retrieves the user and fcmToken from the database using the ownerEmail and email parameters
  respectively. It then constructs a message object with data and notification properties, and sends
  it to the user's device using Firebase Cloud Messaging (FCM). The function also inserts the
  notification into the database for future reference. If the user has uninstalled the app or the
  FCM token is invalid, an error is */
  toNotifyTheVerified: async (email, postid, ownerEmail, convId) => {
    try {
      let postIdString = postid.toString();
      const user = await Users.findOne({
        where: {
          email: ownerEmail,
        },
      }).catch((err) => {
        throw err;
      });

      let fcmToken = await FcmToken.findOne({
        where: {
          email: email,
        },
      }).catch((err) => {
        throw err;
      });
      const toNotifyUser = await Users.findOne({
        where: {
          email: email,
        },
      }).catch((err) => {
        throw err;
      });

      const msg = await getLang(toNotifyUser.lastLang);
      let fcmTok = fcmToken != null ? fcmToken.fcmToken : null;
      let message = {
        data: {
          type: "receiveApproval",
          postid: postIdString,
          email: user.email, // owner email
          fullname: user.fullname, // owner email
          conversationId: convId,
        },
        token: fcmTok,
        notification: {
          title: msg.firebase.not_ver_title,
          body:
            msg.firebase.not_ver_body0 +
            user.fullname +
            msg.firebase.not_ver_body,
        },
      };
      // Insert notification to history
      let curTime = moment();
      let imagePath = null;
      if (await checkImagePath(user.email)) {
        imagePath = "images/" + user.email + ".jpeg";
      }
      const notificationToInsert = {
        imagePath: imagePath,
        date: curTime,
        type: message.data.type,
        postid: message.data.postid,
        email: message.data.email,
        fullName: message.data.fullname,
        ownerEmail: toNotifyUser.email,
        title: message.notification.title,
        message: message.notification.body,
        isRead: false,
      };
      Notification.createOne(notificationToInsert).then((data) => {
        console.log("Notification inserted: ", data);
      });

      let toSend = false;
      if (fcmToken != null) {
        await verifyFCMToken(fcmToken.fcmToken)
          .then(() => {
            toSend = true;
          })
          .catch(() => {
            toSend = false;
          });
      } else {
        throw "User hasnt the app anymore!";
      }

      if (toSend !== false) {
        admin
          .messaging()
          .send(message)
          .then((response) => {
            console.log("Success: ", response);
          })
          .catch((err) => {
            throw err;
          });
      } else {
        // fcmToken.destroy();
        throw "User has uninstalled the app!";
      }
    } catch (error) {
      console.error(error);
    }
  },

  newRide,

  /* The above code is defining an asynchronous function called "insertAver" that takes a user object
  as a parameter. The function queries a database table called "Review" to find all records that
  match the email of the user object. It then calculates the average rating of all the matching
  records and returns an object with the average rating and the count of matching records. If there
  are no matching records, it returns an object with an average rating of 0 and a count of 0. */
  insertAver,

  /* The above code is a function called `applyFilters` that takes in two parameters: `data` and
 `array`. It applies various filters to the `array` based on the values of `data` and returns the
 filtered `array`. The filters include filtering for available seats, driver's rating, age range,
 car type, car date, gender, return date, and pet allowance. The function uses the lodash library
 for filtering and the moment library for date manipulation. */
  applyFilters: async (data, array) => {
    try {
      //filter for available seats
      if (data.seats != null) {
        array = _.filter(array, (obj) => {
          return obj.post.numseats >= parseInt(data.seats);
        });
      }

      //filter for driver's rating
      if (data.driverRating != null) {
        array = _.filter(array, (obj) => {
          return obj.user.average >= parseInt(data.driverRating);
        });
      }

      if (data.age != null) {
        // afairese ta post twn xrhstwn pou einai panw apo data.age_end

        array = _.filter(array, (obj) => {
          let calcAge;
          if (obj.user.age != null) {
            let splitted = obj.user.age.split("/");
            let ageDate = moment()
              .set("year", parseInt(splitted[2]))
              .set("month", parseInt(splitted[1]) - 1)
              .set("date", parseInt(splitted[0]));

            calcAge = moment().diff(ageDate, "years");
          }

          return calcAge <= data.age_end;
        });
        // afairese ta post twn xrhstwn pou einai katw apo data.age
        array = _.filter(array, (obj) => {
          let calcAge;
          if (obj.user.age != null) {
            let splitted = obj.user.age.split("/");
            let ageDate = moment()
              .set("year", parseInt(splitted[2]))
              .set("month", parseInt(splitted[1]) - 1)
              .set("date", parseInt(splitted[0]));

            calcAge = moment().diff(ageDate, "years");
          }
          return calcAge >= data.age;
        });
      }

      if (data.car != null) {
        //afairese ta post twn xrhstwn pou den exoun to dhlwmeno amaksi
        array = _.filter(array, (obj) => {
          return obj.user.car == data.car;
        });
      }

      if (data.cardate != null) {
        //afairese ta post twn xrhstwn pou den exoun thn katallhlh xronologia amaksiou
        array = _.filter(array, (obj) => {
          data.cardate = parseInt(data.cardate, 10);
          obj.user.cardate = parseInt(obj.user.cardate, 10);
          return parseInt(obj.user.cardate) >= data.cardate;
        });
      }

      if (data.gender != null) {
        //afairese ta post twn xrhstwn pou den exoun to katallhlo fulo
        array = _.filter(array, (obj) => {
          return obj.user.gender == data.gender;
        });
      }

      if (data.withReturn != null) {
        console.log("FILTERING FOR RETURN DATE!");
        //afairese ta post twn xrhstwn pou den exoun epistrofh
        array = _.filter(array, (obj) => {
          //check if post has return dates
          if (obj.post.withReturn == false) return false;

          let postStartDate = moment(obj.post.returnStartDate);
          let postEndDate =
            obj.post.returnEndDate != null
              ? moment(obj.post.returnEndDate)
              : null;
          let searchStartDate = moment(data.returnStartDate);
          let searchEndDate =
            data.returnEndDate != null
              ? moment(data.returnEndDate)
              : moment(data.returnStartDate).add(1, "months");

          // case that the post has only a startreturndate
          if (data.returnEndDate == null) {
            if (postEndDate == null) {
              if (postStartDate.isSame(searchStartDate)) return true;
            }

            if (postEndDate != null) {
              if (
                searchStartDate.isBetween(
                  postStartDate,
                  postEndDate,
                  null,
                  "[]"
                )
              ) {
                return true;
              }
            }
          } else {
            if (postEndDate == null) {
              if (
                postStartDate.isBetween(
                  searchStartDate,
                  searchEndDate,
                  null,
                  "[]"
                )
              )
                return true;
            }

            if (postEndDate != null) {
              if (
                postStartDate.isBetween(
                  searchStartDate,
                  searchEndDate,
                  null,
                  "[]"
                ) ||
                postEndDate.isBetween(
                  searchStartDate,
                  searchEndDate,
                  null,
                  "[]"
                )
              ) {
                return true;
              }
            }
          }

          return false;
        });
      }
      if (data.petAllowed != null) {
        array = _.filter(array, (obj) => {
          return obj.post.petAllowed == data.petAllowed;
        });
      }
      return array;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
  IsJsonString: (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  },
  /* The above code is a JavaScript function that handles push notifications for a ride-sharing
  application. It takes in a post object and a message as parameters. The function first searches
  for all requests that have the same start and end coordinates as the post and gathers the emails
  of the users who made those requests. If there are no requests with the same end coordinates, the
  function searches for requests with the same start coordinates and checks if their end coordinates
  are included in the post's "moreplaces" array. If there are any requests that match, the function
  gathers the emails of those users as well. Finally, if */
  pushNotifications: async (post, msg) => {
    try {
      let arrayToNotify = [];
      // GATHER ALL THE REQUESTS WITH THE SPECIFIC STARTCOORD AND THE ENDCOORD OF THE POST THAT HAS BEEN CREATED
      const allRequests = await SearchPost.findAll({
        where: {
          startcoord: post.startcoord,
          endcoord: post.endcoord,
          email: { [Op.ne]: post.email },
        },
      }).catch((err) => {
        console.error(
          "Inside function that pushes notifications, threw error!"
        );
        throw err;
      });

      // FLAG TO SEND OR NOT THE NOTIFICATION
      let toSendNotification = false;

      if (allRequests.length > 0) {
        // CASE THAT THE POST HAS THE RIGHT ENDPLACE OF A REQUEST
        // GATHER THE USERS TO BE INFORMED
        toSendNotification = true;
        for await (req of allRequests) {
          arrayToNotify.push(req.email);
        }
      }

      // IF THE POST HASN'T THE ENDPLACE OF THE REQUESTS, CHECK FOR MOREPLACES IF THEY INCLUDE THE ENDPLACE OF THE REQUEST ----
      const allRequests2 = await SearchPost.findAll({
        where: {
          startcoord: post.startcoord,
          email: { [Op.ne]: post.email },
        },
      }).catch((err) => {
        console.error(
          "Inside function that pushes notifications, threw error!"
        );
        throw err;
      });

      // IF THE ENDPLACE OF A REQUEST IS INSIDE THE MOREPLACES, GATHER THE USERS THAT I NEED TO NOTIFY
      if (allRequests2.length > 0) {
        for await (req of allRequests2) {
          let moreplaces = post.moreplaces;

          for await (place of moreplaces) {
            if (place.placecoords == req.endcoord) {
              toSendNotification = true;
              // array with the users that need to be informed that a post of their request has been created
              arrayToNotify.push(req.email);
            }
          }
        }
      }

      // HERE YOU SEND THE NOTIFICATIONS
      if (toSendNotification) {
        // Data for the notification, postid and the array of users
        newRide(post.postid, arrayToNotify, post.email, msg);
      }
    } catch (err) {
      console.error("Error inside try and catch!!!!!", err);
    }
  },
  /* The above code is a JavaScript function that takes an object called `fnd` as an argument and
  formats its date properties using the Moment.js library. It formats the `startdate`, `enddate`,
  `date`, `returnStartDate`, and `returnEndDate` properties of the `fnd` object into RFC 3339
  compliant date strings. The function then returns the modified `fnd` object. */
  fixAllDates: async (fnd) => {
    fnd.dataValues.startdate = moment(fnd.dataValues.startdate).format(
      RFC_ONLYM
    );
    if (fnd.enddate != null) {
      fnd.dataValues.enddate = moment(fnd.dataValues.enddate).format(RFC_ONLYM);
    }
    fnd.dataValues.date = moment(fnd.dataValues.date).format(RFC_H);
    if (fnd.returnStartDate != null) {
      fnd.dataValues.returnStartDate = moment(
        fnd.dataValues.returnStartDate
      ).format(RFC_ONLYM);
    }
    if (fnd.returnEndDate != null) {
      fnd.dataValues.returnEndDate = moment(
        fnd.dataValues.returnEndDate
      ).format(RFC_ONLYM);
    }

    return fnd;
  },
  determineLang,
  getLang,
  determineExpirationDate,
  backUpUser,
  checkImagePath,
  insertDataToMembers,
  extractConvid,
  sendMessageGroup,
};
