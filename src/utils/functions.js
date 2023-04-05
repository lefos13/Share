const nodemailer = require("nodemailer");

const dotenv = require("dotenv");
dotenv.config();
// get the values from the .env file

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  // databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
});

var _ = require("lodash");

const Review = require("../database/Review");
const Notification = require("../database/Notifications");

const {
  EMAIL,
  PASSEMAIL,
  DATABASE,
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
const sequelize = new Sequelize(DATABASE, USERR, PASS, {
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

const backUpUser = async (data) => {
  try {
    var json = JSON.stringify(data);

    fs.writeFileSync("deleted/" + data.user.email + ".json", json, "UTF-8");
  } catch (error) {
    console.log(error);
  }
};
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
const getLang = async (lang) => {
  let msg;
  if (lang == "EN") msg = JSON.parse(fs.readFileSync("./lang/english.json"));
  else if (lang == "GR") msg = JSON.parse(fs.readFileSync("./lang/greek.json"));
  else msg = JSON.parse(fs.readFileSync("./lang/greek.json"));

  return msg;
};
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
const IsJsonString = async (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

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
        await verifyFCMToken(f.fcmToken).then(() => {
          allMessages.push(message);
        });
      }
    }

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

module.exports = {
  toNotifyTheUnverified,
  sendMessage,
  encryptMessages,
  decryptMessages,
  IsJsonString,
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

  insertAver: async (user) => {
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
  },

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
};
