// In src/services/Postservice.js

// *** ADD *** (methods for all the posts that access data in db)
const Post = require("../database/Post");
const PostInterested = require("../database/PostInterested");
const User = require("../database/User");
const Review = require("../database/Review");
const ToReview = require("../database/ToReview");
const LastSearch = require("../database/LastSearch");
const ConvUsers = require("../database/ConvUsers");
const Groups = require("../database/Group");
const fun = require("../utils/functions");
const fs = require("fs");
const {
  insertAver,
  applyFilters,
  isJsonString,
  determineLang,
  determineExpirationDate,
  checkImagePath,
} = require("../utils/functions");
const _ = require("lodash");
// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { HOST, USERR, PASS, DATABASEE } = process.env;
const { Op } = require("sequelize");
const { Sequelize, DataTypes, fn } = require("sequelize");
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
// moment.tz.setDefault("Europe/Athens");
// moment.locale("el");

const RFC_H = "DD/MM/YYYY HH:mm";
const RFC_ONLYM = "DD/MM/YYYY";

const socket = require("../index");

// create post service
const createNewPost = async (data, req) => {
  try {
    const msg = await determineLang(req);
    let { image, ...postToInsert } = data;

    let message = null;
    //Check if the user has done more than three posts current day.
    const counter = await Post.countPosts(postToInsert.email);

    if (counter < 3) {
      //do it
      if (!postToInsert.hasOwnProperty("image")) {
        console.log("DATA TO INSERT TO POST HAS NO IMAGE FIELD");
        const newPost = await Post.createNewPost(postToInsert, image, msg);
        if (newPost === false) {
          throw new Error("Post failed to be created");
        }

        message = {
          status: 200,
          data: msg.createRideSuc,
          postid: newPost.postid,
        };
      } else throw new Error("Post failed to be created");
    } else {
      message = {
        status: 405,
        data: msg.threeRides,
      };
    }

    return message;
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

/**
 * This is an async function that handles a user's interest in a post, including creating or deleting
 * an interest, sending notifications, and updating chat expiration dates.
 * @param req - The `req` parameter is an object that represents the HTTP request made to the server.
 * It contains information such as the request method, headers, body, and URL.
 * @returns The function `interested` returns a promise that resolves to an object with properties
 * `status`, `body`, and `message`. The `status` property indicates the status code of the response,
 * the `body` property contains the data returned by the function, and the `message` property contains
 * a message describing the result of the operation. If an error occurs, the function returns a promise
 * that resolves to
 */
const interested = async (req) => {
  try {
    //Import sockets
    const io = socket.io;

    //Get the caller email
    let extra = req.body.extra;

    //get data of request
    let data = req.body.data;

    console.log(`Request data of interested: ${JSON.stringify(data)}`);

    //Determine language based on locales
    let msg = await determineLang(req);
    if (data.email == null) {
      return { status: 401, message: msg.noEmail };
    }
    let curtime = moment().endOf("day").format("YYYY-MM-DD hh:mm:ss");
    let starttime = moment().startOf("day").format("YYYY-MM-DD hh:mm:ss");

    //timestamb
    let dateOfInterest = moment();

    //check if there is a property groupId in the data of body
    if (data.groupId != null) {
      //check if a member of the group is the owner of the post
      const isGroupMember = await Groups.isGroupMember(
        data.postid,
        data.groupId
      );
      if (isGroupMember instanceof Error) throw isGroupMember;
      else if (isGroupMember === true) {
        throw {
          status: 405,
          message: msg.ownerPartOfGroup,
        }; //abstract case
      }

      //check if the group has any pending users
      const pendingUsers = await Groups.getPendingUsers(data.groupId);
      if (pendingUsers === true) {
        return {
          status: 405,
          message: msg.groupHasPendingUsers,
        };
      } else if (pendingUsers === false) {
        throw new Error("Something went wrong with finding the pending users");
      }
      //CHECK HOW MANY POSITIONS THE RIDE HAS
      const post = await Post.findOne(data.postid);
      if (post === false) {
        throw new Error("Something went wrong with finding the post");
      }
      const numOfSeats = post.numseats;
      const group = await Groups.findOne(data.groupId);
      if (group instanceof Error)
        throw new Error("Something went wrong with finding the group");

      group.members = JSON.parse(group.members);
      console.log(
        `Number of seats: ${numOfSeats} and number of members: ${
          group.members.length + 1
        }`
      );
      if (numOfSeats < group.members.length + 1) {
        return {
          status: 405,
          message: msg.groupHasTooManyMembers,
        };
      }
    } else data.groupId = null;

    //prepare the data to be inserted into the database
    var row = {
      email: data.email,
      groupId: data.groupId,
      postid: data.postid,
      date: dateOfInterest,
      note: data.note,
      isVerified: false,
      isNotified: false,
      ownerNotified: false,
    };

    //CHECK IF THE CLIENT IS THE OWNER OF THE POST (Unrealistic case)
    const isPostOwner = await Post.isPostOwner(row);
    if (isPostOwner === false) throw new Error("Db error");
    else if (isPostOwner > 0) {
      throw {
        status: 405,
        message: msg.cantLikeOwnPost,
      }; //abstract case
    }

    /* The above code is using the `findOne` method of the `PostInterested` model to find a specific
    interest record based on the email and postid provided in the `row` object. It then checks if
    the returned value is `false`, and if so, throws an error indicating that something went wrong
    with finding the interest. */
    const interest = await PostInterested.findOne(row.email, row.postid);
    if (interest === false) {
      throw new Error("Something went wrong with finding the interested");
    }

    //Interest doesnt exist
    if (interest == null) {
      // get how many interests the user has during the last day
      const count = await PostInterested.getCountOfUser(
        row.email,
        starttime,
        curtime
      );
      if (count == null) {
        throw new Error(
          "Something went wrong at counting the interests of user"
        );
      } else if (count >= 9) {
        return {
          status: 405,
          message: msg.tenInterest,
        };
      } else {
        /* The above code is creating an interest for a post and sending a notification to the owner of
        the post using Firebase. It first creates the interest using the
        `PostInterested.createInterest()` function and throws an error if the creation fails. It
        then retrieves the post using the `Post.findOne()` function and sends a notification to the
        owner using the `fun.toNotifyOwner()` function. Finally, it returns a response object with a
        status code, body, and message to the controller. */
        //CASE THAT INTEREST IS TO BE CREATED
        const inter = await PostInterested.createInterest(row);

        if (inter === false)
          throw new Error("Something went wrong with creation of interest!");
        //Section for notificaiton through firebase
        const postForFunction = await Post.findOne(row.postid);
        if (postForFunction == null) {
          return {
            status: 406,
            message: msg.noRide,
          };
        }
        fun.toNotifyOwner(postForFunction.email, extra, row.postid, true);
        // return the right results to the controller

        return {
          status: 200,
          body: row,
          message: msg.validInterest,
        };
      }
    } else {
      //Interest already exists for the postid
      
      //Potential expirition date of a chat
      let post = await Post.findOne(row.postid);
      let expiresIn = await determineExpirationDate(post);

      //delete the interest of the user for the specific post
      const deleted = await PostInterested.destroyOne(row.email, row.postid);
      if (deleted === false) {
        throw new Error("Something went wrong with canceling the interest");
      }

      fun.toNotifyOwner(post.email, extra, post.postid, false);

      //handle potential review case
      handlePotentialReview(post, interest, null)

      //check if there are a chat between those user
      const chat = await ConvUsers.checkIfExists(post.email, row.email);
      if (chat === false) throw new Error("error at finding existing chat");
      else if (chat == null) {
        return { status: 200, message: msg.cancelInterest };
      } else {
        // ============== chat exists
        console.log(`Deleting the chat between driver and passenger`);
        //CHECK IF CHAT HAS A GROUPID
        let groupId = chat.groupId !== null ? chat.groupId : null;
        let makeGroupId =
          interest.groupId === groupId ? null : interest.groupId;
        //CHECK IF THERE IS ANY OLDER VERIFICATION OF THE USERS
        let curDate = moment();
        //find all active posts of passenger
        let allActivePassenger = await Post.findAllActive(row.email, curDate);
        //find all active posts of driver
        let allActiveDriver = await Post.findAllActive(post.email, curDate);
        let postListPassenger = [];
        let postListDriver = [];
        //get all the ids of passenger
        _.forEach(allActivePassenger, (val) => {
          postListPassenger.push(val.postid);
        });
        //get all the ids of driver
        _.forEach(allActiveDriver, (val) => {
          postListDriver.push(val.postid);
        });

        // find if the passenger is interested and verified to any of the posts of driver
        let allVerPassenger = [];
        if (postListDriver.length > 0)
          allVerPassenger = await PostInterested.findAllVerifedPerPost(
            row.email,
            postListDriver
          );

        // find if the driver is interested and verified to any of the posts of passenger
        let allVerDriver = [];
        if (postListPassenger.length > 0)
          allVerDriver = await PostInterested.findAllVerifedPerPost(
            post.email,
            postListPassenger
          );

        // let allDates = [];
        let expirationDates = [];
        if (allVerPassenger.length > 0) {
          console.log("Found verified interest for the passenger");
          // get the expiration dates
          for await (let val of allVerPassenger) {
            for await (let postv of allActiveDriver) {
              if (val.postid == postv.postid) {
                let expires = await determineExpirationDate(postv);
                expirationDates.push(expires);
                // allDates.push({
                //   date: expires,
                //   groupId: val.groupId != null ? val.groupId : null,
                // });
              }
            }
          }
        }

        if (allVerDriver.length > 0) {
          console.log("Found verified interest for the driver");
          // get the expiration dates
          for await (let val of allVerDriver) {
            for await (let postv of allActivePassenger) {
              if (val.postid == postv.postid) {
                let expires = await determineExpirationDate(postv);
                expirationDates.push(expires);
                // allDates.push({
                //   date: expires,
                //   groupId: val.groupId != null ? val.groupId : null,
                // });
              }
            }
          }
        }

        let toDelete = true;
        if (expirationDates.length > 0) {
          toDelete = false;
          console.log("FOUND expiration dates for this pair of users");
          //FIND THE LATEST EXPIRATION DATE IF THERE IS ANY
          expirationDates = expirationDates.map((d) => moment(d));
          let maxDate = moment.max(expirationDates);
          // let groupId = false;
          //loop through allDates and define isGroup if the date is equal to the maximum date
          // _.forEach(allDates, (d) => {
          //   if (moment(d.date).isSame(maxDate)) {
          //     groupId = d.groupId;
          //   }
          // });

          //CHANGE THE EXPIRATION DATE TO THE OLDER ONE AND DO NOT DELETE THE CHAT
          let updated = await ConvUsers.updateDate(
            chat.convid,
            maxDate,
            makeGroupId
          );
          if (updated === false)
            throw new Error("Didnt update the conv expiration date");

          //EMIT THE EXPIRATION DATE CHANGE
          let driver = await User.findOneLight(post.email);
          io.to(driver.socketId).emit("action", {
            type: "setExpirationDate",
            data: {
              conversationId: chat.convid,
              expiresIn: maxDate.format("YYYY-MM-DD"),
            },
          });

          let passenger = await User.findOneLight(row.email);
          io.to(passenger.socketId).emit("action", {
            type: "setExpirationDate",
            data: {
              conversationId: chat.convid,
              expiresIn: maxDate.format("YYYY-MM-DD"),
            },
          });

          //Update chats if chat becomes personal
          if (groupId !== null && makeGroupId === null) {
            console.log("CHAT BECOMES PERSONAL");
            //gather data for the conversation
            const [ratingDataPassenger, ratingDataDriver] = await Promise.all([
              insertAver(driver),
              insertAver(passenger),
            ]);
            const dataForPassenger = {
              conversationId: chat.convid,
              socketId: passenger.socketId,
              username: driver.fullname,
              photo: (await checkImagePath(driver.email))
                ? `images/${driver.email}.jpeg`
                : null,
              email: driver.email,
              average: ratingDataDriver.average,
              count: ratingDataDriver.count,
              isGroupInterest: false,
              members: null,
              isUserOnline: false,
              expiresIn: chat.expiresIn,
              messages: [],
              isRead: true,
              lastMessage: null,
              lastMessageTime: null,
              isLastMessageMine: false,
              messagesLeft: false,
            };

            const dataForDriver = {
              conversationId: chat.convid,
              socketId: driver.socketId,
              username: passenger.fullname,
              photo: (await checkImagePath(passenger.email))
                ? `images/${passenger.email}.jpeg`
                : null,
              email: passenger.email,
              average: ratingDataPassenger.average,
              count: ratingDataPassenger.count,
              isGroupInterest: false,
              members: null,
              isUserOnline: false,
              expiresIn: chat.expiresIn,
              messages: [],
              isRead: true,
              lastMessage: null,
              lastMessageTime: null,
              isLastMessageMine: false,
              messagesLeft: false,
            };

            let socketList = await io.fetchSockets();

            const passengerSocket = socketList.find(
              (val) => val.id === passenger.socketId
            );
            const driverSocket = socketList.find(
              (val) => val.id === driver.socketId
            );

            if (passengerSocket) {
              dataForDriver.isUserOnline = true;
            }

            if (driverSocket) {
              dataForPassenger.isUserOnline = true;
            }

            if (chat.messages !== null) {
              if (isJsonString(chat.messages)) {
                chat.messages = JSON.parse(chat.messages);
              }
              chat.messages.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
              });
              const messagesLeft = chat.messages.length > 20;
              //Paginate the messages and send the last 20 of them
              const finalMessages = _.take(
                _.drop(chat.messages, 0),
                messagesLeft ? 20 : chat.messages.length
              );
              const decryptedMessages = await fun.decryptMessages(
                finalMessages
              );

              dataForPassenger.messagesLeft = messagesLeft;
              dataForPassenger.messages = decryptedMessages;
              dataForPassenger.lastMessage = finalMessages[0].text;
              dataForPassenger.isLastMessageMine =
                finalMessages[0].user._id === passenger.email;
              dataForPassenger.isRead = dataForPassenger.isLastMessageMine
                ? true
                : finalMessages[0].isRead;
              dataForPassenger.lastMessageTime = moment(
                finalMessages[0].createdAt
              ).format("DD-MM-YYYY HH:mm");

              dataForDriver.messagesLeft = messagesLeft;
              dataForDriver.messages = decryptedMessages;
              dataForDriver.lastMessage = finalMessages[0].text;
              dataForDriver.isLastMessageMine =
                finalMessages[0].user._id === driver.mail;
              dataForDriver.isRead = dataForDriver.isLastMessageMine
                ? true
                : finalMessages[0].isRead;
              dataForDriver.lastMessageTime = moment(
                finalMessages[0].createdAt
              ).format("DD-MM-YYYY HH:mm");
            }

            //send the data to the user
            io.to(driver.socketId).emit("action", {
              type: "onConversationUpdated",
              conversation: dataForDriver,
            });
            //send the data to the user
            io.to(passenger.socketId).emit("action", {
              type: "onConversationUpdated",
              conversation: dataForPassenger,
            });
          }
        }

        if (toDelete) {
          const deletedChat = await ConvUsers.deleteIfExpiresEqual(
            chat,
            expiresIn
          );

          if (deletedChat === "0") throw new Error("error at deleting chat");
          else if (deletedChat === false) {
            return { status: 200, message: msg.cancelInterest };
          } else {
            const user1 = await User.findOneLight(post.email);
            const user2 = await User.findOneLight(row.email);

            io.to(user1.socketId).emit("action", {
              type: "onConversationRemoved",
              data: {
                conversation: chat.convid,
              },
            });
            io.to(user2.socketId).emit("action", {
              type: "onConversationRemoved",
              data: {
                conversation: chat.convid,
              },
            });
            return {
              //return the conversation id if the chat is deleted

              status: 200,
              message: msg.cancelInterest,
              convDeleted: deletedChat,
            };
          }
        } else {
          return { status: 200, message: msg.likerUnverified };
        }
      }
    }
  } catch (error) {
    if (error.status == 405) {
      return error;
    }
    console.error(error);
    return { status: 500 };
  }
};

const handlePotentialReview = async (post, results, dateToCompare) => {
  try {
    const toReviewExists = await ToReview.findIfExists(
      post.email,
      results.email
    );
    if (toReviewExists === false)
      throw new Error("Error at finding the toreview");

    // if driver is owner check all older posts and decide if you need to update the flags or deny review
    /* The code is checking if a review exists for a specific driver email and if there are any
    active posts for that driver. If there are active posts, it retrieves all the verified posts
    for a specific passenger email and checks the end dates of those posts to get the oldest
    one. It then creates a new review object with the oldest post's end date and the
    corresponding post interested ID. */
    if (toReviewExists.driverEmail === post.email) {
      const allActiveDriver = await Post.findAllActive(
        toReviewExists.driverEmail,
        moment()
      );

      if (allActiveDriver.length > 0) {
        const allPostIds = allActiveDriver.map((val) => val.postid);
        const allVerified = await PostInterested.findAllVerifedPerPost(
          toReviewExists.passengerEmail,
          allPostIds
        );
        if (allVerified.length > 0) {
          //Check the enddates of active verifed posts and get the oldest
          const dates = await Promise.all(
            allVerified.map(async (val) => {
              const tempPost = await Post.findOne(val.postid);
              const date =
                tempPost.enddate != null
                  ? tempPost.enddate
                  : tempPost.startdate;
              return { d: date, p: val.piid };
            })
          );

          let newdates = dates.map((d) => moment(d.d));
          let minDate = moment.min(newdates);
          const { piid } = dates.find((d) => moment(d.d).isSame(minDate));
          dateToCompare = minDate;

          const newToReview = await ToReview.newReview(
            toReviewExists,
            minDate,
            piid
          );
          if (!newToReview)
            throw new Error(
              "Error at updating the toreview object with older data"
            );
        }
      }
    }else{
      console.log(`No potential review found OR the driver isnt the owner of the post`);
    }

    const activePassengerPosts = await Post.findAllActive(
      results.email,
      moment()
    );

    /* The above code is checking if there are any active passenger posts and if there are, it
    retrieves all the verified interested passengers for those posts. It then checks if the
    minimum date of those verified interested passengers is greater than or equal to a given
    date to compare. If it is, it creates a new review object and updates the existing toReview
    object with the new review. If the minimum date is not greater than or equal to the given
    date to compare, it denies the review. If there are no active passenger posts, it also
    denies the review. */
    let passengerPostsIds = activePassengerPosts.map((val) => val.postid);
    if (activePassengerPosts.length > 0) {
      console.log(`Found active passenger posts ${activePassengerPosts.length}`);
      const allVerifiedOfDriver = await PostInterested.findAllVerifedPerPost(
        post.email,
        passengerPostsIds
      );

      if (allVerifiedOfDriver.length > 0) {
        console.log(`found verified passenger posts ${allVerifiedOfDriver.length}`);
        let dates = await Promise.all(
          allVerifiedOfDriver.map(async (val) => {
            let tempPost = await Post.findOne(val.postid);
            let date = tempPost.enddate ?? tempPost.startdate;
            return { d: date, p: val.piid };
          })
        );

        let newDates = dates.map((d) => moment(d.d));
        let minDate = moment.min(newDates);

        if (!dateToCompare || minDate.isBefore(dateToCompare)) {
          let piid;
          _.forEach(dates, (d) => {
            if (moment(d.d).isSame(minDate)) {
              piid = d.p;
            }
          });

          let passenger = await PostInterested.findOneById(piid);
          let driver =
            passenger.email == toReviewExists.passengerEmail
              ? toReviewExists.driverEmail
              : toReviewExists.passengerEmail;
          console.log(`Create new potential review`);
          const newToReview = await ToReview.newReviewAndReverse(
            toReviewExists,
            driver,
            passenger.email,
            minDate,
            piid
          );

          if (!newToReview) {
            throw new Error("Error at updating the toreview object");
          }
        }
      } else if (dateToCompare == null) {
        console.log(`No date to compare so denying potential review`);
        const destroyed = await ToReview.denyReview(toReviewExists);
        if (destroyed === false)
          throw new Error("Error at destroying the possible review");
      }
    } else if (dateToCompare == null) {
      console.log(`No active passenger posts and no dates to compare so denying potential review`);
      const destroyed = await ToReview.denyReview(toReviewExists);
      if (destroyed === false)
        throw new Error("Error at destroying the possible review");
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * This function searches for posts based on user input and applies filters to the results before
 * returning them.
 * @param req - The request object containing information about the HTTP request made to the server. It
 * includes properties such as the request method, headers, body, and query parameters.
 * @returns an object with properties "status", "body", and "message". The "status" property indicates
 * the status code of the response, the "body" property contains the data returned by the function, and
 * the "message" property contains a message related to the response.
 */
const searchPosts = async (req) => {
  try {
    let msg = await determineLang(req);
    var data = req.body.data;

    let email = req.body.extra;
    if (data.startdate == null) {
      data.startdate = moment().format("YYYY-MM-DD");
      data.enddate = moment().add(1, "months").format("YYYY-MM-DD");
    }
    if (data.enddate == null) {
      data.enddate = moment().add(1, "months").format("YYYY-MM-DD");
    }

    let query = {
      where: {
        // email different than one that do the search
        // email: { [Op.ne]: data.email },
        [Op.and]: [
          // arxikos proorismos h syntetagmenes
          {
            [Op.or]: [
              { startplace: data.startplace },
              { startcoord: data.startcoord },
            ],
          },
          // elegxos na peftei h arxikh hmeromhnia tou post anamesa sthn arxikh kai telikh toy xrhsth
          // ή na peftei h telikh hmeromhnia tou post anamesa sthn arxikh h telikh hmeromhnia tou xrhsth
          // ή na peftei h arxikh KAI h telikh hmeromhnia toy xrhsth na peftei anamesa sthn arxikh KAI telikh hmeromhnia tou post
          {
            [Op.or]: [
              { startdate: { [Op.between]: [data.startdate, data.enddate] } },
              { enddate: { [Op.between]: [data.startdate, data.enddate] } },
              {
                [Op.and]: [
                  { startdate: { [Op.gte]: data.startdate } },
                  { enddate: { [Op.lte]: data.enddate } },
                ],
              },
            ],
          },
          // elegxos an o telikos proorismos einai proorismos pou uparxei entos twn stasewn tou xrhsth
          // h an o telikos proorismos tou xrhsth einai telikos proorismos tou post antistoixa oi syntetagmenes
          {
            [Op.or]: [
              // sequelize.literal(
              //   `json_contains(moreplaces->'$[*].place', json_array("` +
              //     data.endplace +
              //     `")) OR json_contains(moreplaces->'$[*].placecoords', json_array("` +
              //     data.endcoord +
              //     `"))`
              // ),
              sequelize.literal(
                `JSON_CONTAINS(JSON_EXTRACT(moreplaces, "$[*].place"), '"` +
                  data.endplace +
                  `"') OR json_contains(JSON_EXTRACT(moreplaces, '$[*].placecoords'), '"` +
                  data.endcoord +
                  `"')`
              ),
              {
                [Op.or]: [
                  { endplace: data.endplace },
                  { endcoord: data.endcoord },
                ],
              },
            ],
          },
        ],
      },
      order: [["date", "DESC"]],
    };

    var results = null;
    var array = [];
    let curDate = moment();
    let lastSearch = {
      email: email,
      startPlace: data.startplace,
      startCoord: data.startcoord,
      endPlace: data.endplace,
      endCoord: data.endcoord,
      isCreated: curDate,
      isUpdated: curDate,
    };

    //Create or Update lastSearch for user
    const lastSearchRes = await LastSearch.createIfNotExist(lastSearch);
    if (lastSearchRes === false)
      throw new Error(
        "Something went wrong with creating/updating last search"
      );

    // ==========  if startdate is null, then search from the current date to a month after today.

    let found = await Post.findAndCountAll(query);

    if (found.count == 0) {
      return { status: 404, message: msg.noRidesFound };
    } else if (found == null) {
      throw new Error("Something went wrong in searching the posts");
    }

    for await (fnd of found.rows) {
      fnd.dataValues.isFavourite = false;

      if (isJsonString(fnd.moreplaces)) {
        fnd.moreplaces = JSON.parse(fnd.moreplaces);
      }

      let userQuery = {
        attributes: {
          exclude: ["password", "verified", "facebook", "instagram", "mobile"],
        },
        where: {
          email: fnd.email,
        },
      };

      const user = await User.findOneUserQuery(userQuery);
      if (user === false) {
        throw new Error(
          "Something went wrong with finding the user of each post"
        );
      }
      var flag;
      let isApproved = false;
      // insert the review average and count inside the object of the user
      let extraData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...extraData };

      // check if the user is interested in the specific post
      let interested = await PostInterested.findOne(data.email, fnd.postid);

      let isGroupInterested = false;
      if (interested == null) {
        flag = false;
      } else {
        flag = true;
        if (interested.isVerified == true) isApproved = true;
        interested.groupId != null
          ? (isGroupInterested = true)
          : (isGroupInterested = false);
      }
      let imagePath = null;
      if (await checkImagePath(fnd.email)) {
        imagePath = "images/" + fnd.email + ".jpeg";
      }
      results = {
        user: user.toJSON(),
        imagePath: imagePath,
        post: fnd,
        interested: flag,
        isGroupInterested: isGroupInterested,
        isApproved: isApproved,
      };
      array.push(results);
    }
    let filteredArray = await applyFilters(data, array);
    if (filteredArray === false) {
      throw new Error("Error at filters");
    } else if (filteredArray.length == 0) {
      return { status: 404, message: msg.noRidesFound };
    }

    //fix dates after filters
    for await (let arr of filteredArray) {
      arr.post = await fun.fixAllDates(arr.post);
    }

    //Pagination
    var mod = filteredArray.length % 10;
    var totallength = 1;
    mod == 0
      ? (totallength = filteredArray.length / 10)
      : (totallength = filteredArray.length / 10 - mod / 10 + 1);
    //CHECK IF ARRAY IS EMPTY AND SEND THE RESULTS
    if (data.page > totallength) {
      return {
        status: 404,
        message: msg.paginationLimit,
      };
    }

    var skipcount = 0;
    var takecount = 10;
    if (data.page > 1) skipcount = data.page * 10 - 10;
    var finalarr = _.take(_.drop(filteredArray, skipcount), takecount);

    results = {
      postUser: finalarr,
      totalPages: totallength,
      pageLength: finalarr.length,
      // test: array,
    };

    return { status: 200, body: results, message: msg.ridesFound };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

/**
 * This function retrieves posts of a user and returns them with pagination and additional information
 * such as user data and interested status.
 * @param req - The request object containing information about the HTTP request made to the server. It
 * includes data such as the request headers, body, and parameters.
 * @returns an object with a "status" property and a "data" property. The "status" property indicates
 * the status code of the response (200 for success, 404 for not found, 500 for server error), while
 * the "data" property contains the actual data returned by the function (an array of postUser objects,
 * the total number of pages, the total length of the
 */
const getPostsUser = async (req) => {
  try {
    let msg = await determineLang(req);
    var data = req.body.data;
    let array = [];

    let today = moment().subtract(6, "months");
    let found = await Post.findAllPastHalfYear(data.email, today);
    if (found === false) {
      throw new Error("Error with finding the posts of the user");
    }

    let rows = found.rows;
    let count = found.count;
    if (count == 0) return { status: 404, message: msg.noRidesFound };
    //PAGINATION
    let skipcount = 0;
    let takecount = 10;
    if (data.page > 1) skipcount = data.page * 10 - 10;
    let finalarr = _.take(_.drop(rows, skipcount), takecount);
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
    for await (post of finalarr) {
      if (isJsonString(post.moreplaces)) {
        post.moreplaces = JSON.parse(post.moreplaces);
      }

      //Mark posts that are expired
      let curDate = moment();
      let startdate = moment(post.startdate).set("hour", 23).set("minute", 59);
      let enddate;
      // if there is an enddate
      if (post.enddate != null) {
        enddate = moment(post.enddate).set("hour", 23).set("minute", 59);
        if (startdate.isSameOrAfter(curDate) || enddate.isSameOrAfter(curDate))
          post.dataValues.isExpired = false;
        else post.dataValues.isExpired = true;
      } else {
        // if there isnt any enddate

        if (startdate.isSameOrAfter(curDate)) post.dataValues.isExpired = false;
        else post.dataValues.isExpired = true;
      }
      //====

      post = await fun.fixAllDates(post);

      //get the data of user
      let user = await User.findOneLight(post.email);
      if (user === false) {
        throw new Error("Error at finding user");
      }

      let image = null;
      if (await checkImagePath(user.email)) {
        image = "images/" + user.email + ".jpeg";
      }

      let reviewData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...reviewData };

      let interested = await PostInterested.findOne(post.email, post.postid);
      if (interested === false) {
        throw new Error("Error at getting the interested of a post");
      }
      let flag;
      interested == null ? (flag = false) : (flag = true);
      const countInt = await PostInterested.countInterestedOfPost(
        post.postid,
        data.email
      );

      if (countInt == null) {
        throw new Error("Error at counting the interested of a single post");
      }

      let moreUsers = false;

      if (countInt > 0) moreUsers = true;

      let results = {
        user: user,
        imagePath: image,
        post: post,
        hasMoreUsers: moreUsers,
        countUsers: countInt,
        interested: flag,
      };
      array.push(results);
    }

    let response = {
      postUser: array,
      totalPages: totallength,
      totalLength: count,
      pageLength: finalarr.length,
    };

    return { status: 200, data: response };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

/**
 * This function retrieves a post and its associated user information, including reviews and images,
 * based on a given post ID and user email.
 * @param req - The "req" parameter is an object that contains information about the HTTP request being
 * made, including the request body and query parameters.
 * @returns an object with a `status` property and a `data` property. The `status` property indicates
 * the status of the response (200 for success, 404 for not found, 500 for error), and the `data`
 * property contains an object with properties `imagePath`, `interested`, `post`, and `user`.
 */
const getPostPerId = async (req) => {
  try {
    let msg = await determineLang(req);
    var postid = req.query.postid;
    let email = req.body.extra;

    let post = await Post.findOne(postid);
    if (post === false) {
      throw new Error("Error at finding one post");
    } else if (post == null) {
      return { status: 404 };
    }
    if (isJsonString(post.moreplaces)) {
      post.moreplaces = JSON.parse(post.moreplaces);
    }

    //FIX ALL DATES
    post = await fun.fixAllDates(post);

    // CHECK IF THE SEARCHER IS INTERESTED
    let interested = false;
    const postInt = await PostInterested.findOne(email, postid);
    if (postInt === false) {
      throw new Error("Error at findning if user is interested for the post");
    }
    // if the searcher is interested then true
    postInt == null ? (interested = false) : (interested = true);

    let isGroupInterested = false;
    //check if the insterest is by a group
    if (postInt != null) {
      postInt.groupId != null
        ? (isGroupInterested = true)
        : (isGroupInterested = false);
    }

    // find creator of post
    const user = await User.findOneLight(post.email);
    if (user === false) {
      throw new Error("Error at finding the user of the post");
    }

    // get average and count from reviews and insert them into the object
    let extraData = await insertAver(user);
    user.dataValues = { ...user.dataValues, ...extraData };

    // change cardate format
    user.cardate = parseInt(user.cardate, 10);

    let image = null;
    if (await checkImagePath(user.email)) {
      image = "images/" + user.email + ".jpeg";
    }

    //if user is not the the owner of the post
    if (user.email != email && post.isFavourite == true) {
      post.dataValues.isFavourite = false;
    }

    const response = {
      imagePath: image,
      interested: interested,
      isGroupInterested: isGroupInterested,
      post: post,
      user: user,
    };

    return { status: 200, data: response };
  } catch (error) {
    // console.error(error);
    return { status: 500 };
  }
};

const getInterestedPerUser = async (req) => {
  try {
    var data = req.body.data;
    let msg = await determineLang(req);
    //GET ALL INTERESTS OF A USER
    let found = await PostInterested.findAny(data.email);
    if (found === false) {
      throw new Error("Error at getting all the interests");
    }

    let array = [];
    // FOR EACH INTEREST
    for await (let postI of found) {
      let curDate = moment();

      //FIND THE POST ONLY IF THE POST IS ACTIVE
      let post = await Post.findOneNotOwnerGTEToday(
        postI.postid,
        data.email,
        curDate
      );
      //IF YOU FOUND SUCH A POST
      if (post != null) {
        // PARSE THE MOREPLACES IF THERE IS ANY
        if (isJsonString(post.moreplaces)) {
          post.moreplaces = JSON.parse(post.moreplaces);
        }
        //NULIFY THE ISFAVOURITE VALUE (WE DONT NEED IT HERE)
        post.dataValues.isFavourite = false;
        //MAKE THE DATE OF INTEREST THE RIGHT FORMAT
        postI.dataValues.date = moment(postI.dataValues.date).format(RFC_H);
        //MAKE ALL THE OTHER DATES THE RIGHT FORMAT
        post = await fun.fixAllDates(post);

        // CHECK IF THE USER IS NOTIFIED (OLD CASE)
        if (postI.isNotified === false) {
          let flag = await PostInterested.updateNotify(postI);
          if (flag == null) {
            throw new Error(
              "Error at updating the notify flag at postinterested"
            );
          }
          post.dataValues = {
            ...post.dataValues,
            ...{ withColor: true },
          };
        } else
          post.dataValues = {
            ...post.dataValues,
            ...{ withColor: false },
          };

        // ADD THE RIGHT DATA OF THE INTERESTED OBJECT
        let tempPost = {
          ...post.dataValues,
          ...{ piid: postI.piid, dateOfInterest: postI.date },
        };

        // GET THE DATA OF THE OWNER OF THE POST
        let user = await User.findOneLight(post.dataValues.email);
        if (user === false) {
          throw new Error("Error at finding the user of the post");
        }

        //INSERT THE AVERAGE RATING VALUES TO THE OBJECT OF THE USER
        let extraData = await insertAver(user);
        user.dataValues = { ...user.dataValues, ...extraData };

        // CHECK IF THERE IS AN IMAGE SO DEFINE IT
        let image = null;
        if (await checkImagePath(user.email)) {
          image = "images/" + user.email + ".jpeg";
        }

        let isGroupInterested = false;
        if (postI.groupId != null) {
          isGroupInterested = true;
        }
        // SUM UP THE RESULTS AND PUSH THEM INTO AN ARRAY
        let results = {
          user: user,
          imagePath: image,
          post: tempPost,
          isGroupInterested: isGroupInterested,
          interested: true,
          isApproved: postI.isVerified,
        };
        array.push(results);
      }
    }
    // IF YOU DIDNT FIND ANY RETURN 404
    if (array.length == 0) {
      return { status: 404, data: msg.noLikedRides };
    } else {
      return {
        status: 200,
        data: {
          postUser: array,
          message: msg.foundLikedRides,
        },
      };
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const getIntPost = async (req) => {
  try {
    var data = req.body.data;
    var extra = req.body.extra;
    let msg = await determineLang(req);
    let posts = await Post.findOne(data.postid);
    if (posts === false) {
      throw new Error("Error at finding the requested post");
    }
    if (isJsonString(posts.moreplaces)) {
      posts.moreplaces = JSON.parse(posts.moreplaces);
    }
    posts = await fun.fixAllDates(posts);
    let message = msg.foundLikers;
    let isAny = 0;
    let fullpost;
    let allUsers = [];

    const interested = await PostInterested.findAllPerId(posts.postid);
    if (interested === false) {
      throw new Error("Error at finding all the interested per ID");
    }
    // ean vrethikan endiaferomenoi
    if (interested.length != 0) {
      //gia kathe endiaferomeno
      for await (one of interested) {
        isAny++;
        const user = await User.findOneLight(one.email);
        if (user === false) throw new Error("Error at getting user");

        if (user != null) {
          let image = null;
          if (await checkImagePath(user.email)) {
            image = "images/" + user.email + ".jpeg";
          }
          user.dataValues.imagePath = image;
          let testdata = await insertAver(user);
          user.dataValues = { ...user.dataValues, ...testdata };
          user.dataValues.isVerified = one.isVerified;
          user.dataValues.piid = one.piid;
          user.dataValues.note = one.note;
          if (one.groupId != null) {
            user.dataValues.isGroupInterested = true;
            let groupData = await Groups.findOne(one.groupId);
            groupData = await fun.insertDataToMembers(groupData);
            user.dataValues.members = groupData.members;
          } else {
            user.dataValues.isGroupInterested = false;
          }

          allUsers.push(user);
        } else {
          allUsers.push({
            email: "Fake User",
            fullname: one.email,
            car: "BMW",
            cardate: "2016",
            gender: "male",
            age: "25",
            photo: "1",
            imagePath: null,
            average: 5,
            count: 100,
            isVerified: one.isVerified,
            piid: one.piid,
          });
        }
        fullpost = { ...posts.dataValues };
      }
    }
    let image = null;
    if (await checkImagePath(posts.email)) {
      image = "images/" + posts.email + ".jpeg";
    }

    if (isAny > 0) {
      message = msg.foundLikers;
      let skipcount = 0;
      let takecount = 10;
      if (data.page > 1) skipcount = data.page * 10 - 10;
      let finalarr = _.take(_.drop(allUsers, skipcount), takecount);
      let mod = isAny % 10;

      let totallength = 1;
      mod == 0
        ? (totallength = isAny / 10)
        : (totallength = isAny / 10 - mod / 10 + 1);
      if (data.page > totallength) {
        return {
          status: 404,
          message: msg.paginationLimit,
        };
      }
      let response = {
        users: finalarr,
        post: fullpost,
        postImage: image,
        totalPages: totallength,
        totalLength: isAny,
        pageLength: finalarr.length,
        curPage: data.page,
        message: message,
      };
      return { status: 200, data: response };
    } else {
      message = msg.notFoundLikers;
      return { status: 404, data: message };
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const deletePost = async (req) => {
  try {
    let data = req.body.data;

    let msg = await determineLang(req);

    // check if there are any verified users on this Ride
    const countVerified = await PostInterested.countVerified(data.postid);
    if (countVerified == null)
      throw new Error("Error at counting the verified!");
    else if (countVerified > 0) {
      return { status: 406, message: msg.hasVerified };
    }
    // delete the post
    let results = await Post.deleteOne(data.postid);
    if (results === null) {
      throw new Error("Error at deleting the post");
    } else if (results == 0) {
      return { status: 404, message: msg.noRide };
    }
    //delete the image of the post if exists
    if (fs.existsSync(`postImages/${data.postid}.jpeg`)) {
      fs.unlinkSync(`postImages/${data.postid}.jpeg`);
    }
    //delete the interested people of this post
    let intRes = await PostInterested.detroyAllPerPost(data.postid);
    if (intRes === null) {
      throw new Error("Error at deleteing the interests of the post");
    }

    return { status: 200, message: msg.rideDeleted };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const deleteInterested = async (req) => {
  try {
    var data = req.body.data;
    let msg = await determineLang(req);
    const results = await PostInterested.deleteOne(data.piid);
    if (results == null) {
      throw new Error("Error at deleting the interest");
    }

    if (results == 0) {
      return { status: 404, message: msg.likerNotFound };
    } else {
      return { status: 200, message: msg.likerDeleted };
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

/**
 * This function verifies or unverifies a user's interest in a post and performs various actions based
 * on the verification status.
 * @param req - The "req" parameter is an object that represents the HTTP request made to the server.
 * It contains information such as the request method, headers, and body.
 * @returns an object with various properties depending on the execution of the function. The
 * properties include status, message, chatCreated, conversationId, convDeleted.
 */
const verInterested = async (req) => {
  try {
    var data = req.body.data;
    let curDate = moment();
    let chatCreated = false;
    let io = socket.io;
    let msg = await determineLang(req);
    //GETING THE DATA OF THE ROW THAT IS TO BE VERIFIED
    const results = await PostInterested.findOneById(data.piid);
    if (results === false) {
      throw new Error("Error at getting the interested data");
    } else if (results == null)
      return { status: 404, message: msg.noUserThatliked };

    //GETTING THE SUM OF THE VERIFIED
    const allIntersted = await PostInterested.countVerifiedEnchanced(
      data.postid
    );
    if (allIntersted === null) {
      throw new Error("Error at getting the count of the verified");
    }

    //GETTING THE DATA OF THE CORRESPONDING POST
    const pst = await Post.findExpired(data.postid, curDate);
    if (pst == null)
      return {
        status: 406,
        message: msg.rideExpired,
      };
    const post = await Post.findOne(data.postid);
    if (post === false) throw new Error("Error at finding the post");

    //IF THE OCCUPIED POSITIONS ARE LESS THAN THE NUMBER OF Seats OR THE USER IS VERIFIED
    if (allIntersted < post.numseats || results.isVerified == true) {
      //IF THE USER IS NOT VERIFIED
      if (results.isVerified === false) {
        const updated = await PostInterested.updateVerify(results);
        if (!updated) throw new Error("Error at update verify flag");
        // Create possible review notification

        //Find if a possible review already exists
        const toReviewExists = await ToReview.findIfExists(
          post.email,
          results.email
        );
        if (toReviewExists === false)
          throw new Error("Error at finding possible review");

        //If there is no possible review, create a new one
        if (toReviewExists == null) {
          const enddate =
            post.enddate == null
              ? moment(post.startdate)
              : moment(post.enddate);
          const reviewMade = await ToReview.createOne(
            post.email,
            results.email,
            enddate,
            results.piid
          );
          if (reviewMade === false) {
            throw new Error("Error creating possible review");
          }
        } else {
          //if a review is done already check if the driver and the passenger have the right emails.

          //if the possibleReview has the post owner as the passenger, change the row so that the owner become the driver
          // and the interested user become the passenger.
          const enddate =
            post.enddate == null
              ? moment(post.startdate)
              : moment(post.enddate);
          const objEndDate = moment(toReviewExists.endDate);
          const crDate = moment();
          const forceChange = objEndDate.isBefore(crDate);
          /* The above code is checking if a review already exists for a driver's email address and if
          it does, it checks if the end date of the review is before or the same as a given end
          date. If it is, it either reverses the review and updates it with new information or
          creates a new review with the given end date and information. If a review does not exist
          for the driver's email address, it creates a new review with the given end date and
          information. */
          if (
            toReviewExists.driverEmail != post.email &&
            toReviewExists.driverEmail == results.email
          ) {
            if (enddate.isSameOrBefore(objEndDate) || forceChange) {
              const reversed = await ToReview.reverseUsers(
                toReviewExists,
                post.email,
                results.email,
                results.piid,
                enddate
              );
              if (reversed === false) {
                throw new Error("Error reversing and updating to review");
              }
            }
          } else {
            if (enddate.isSameOrBefore(objEndDate) || forceChange) {
              const reversed = await ToReview.newReview(
                toReviewExists,
                enddate,
                data.piid
              );
              if (reversed === false) {
                throw new Error("Error reversing and updating to review");
              }
            }
          }

          //if a review is done already by the owner of the post and the owner is marked as driver
          //update him as false so he can review again the same user and update the enddate of the toReview row
          if (toReviewExists.driverEmail == post.email) {
            const updated = await ToReview.resetFlags(
              toReviewExists,
              data.piid,
              post.enddate
            );
            if (!updated) {
              throw new Error("Error resetting the flags");
            }
          }
        }

        //CREATION OF NEW CHAT
        let expiresIn = await determineExpirationDate(post);
        // console.log("New Chat expiration Date:", expiresIn);
        const chatExists = await ConvUsers.checkIfExists(
          post.email,
          results.email
        );
        if (chatExists === false)
          //error at finding chat
          throw new Error("Error at finding if chat Exists");

        if (chatExists != null) {
          console.log("Updating the existing chat");
          let groupId = results.groupId != null ? results.groupId : null;
          //chat exists from older post so the expireDate is to be updated if it is older than current expire date
          console.log("Group Id:", groupId);
          const newDate = await ConvUsers.updateExpireDate(
            chatExists,
            expiresIn
          );
          console.log("Chat expiration date update response:", newDate);
          if (!newDate) {
            throw new Error("Error at updating the existing chat");
          } else if (moment(newDate).isSame(expiresIn, "day")) {
            console.log("Chat expiration date wasnt updated");
            chatCreated = null;
          }
          const [driver, passenger] = await Promise.all([
            User.findOneLight(post.email),
            User.findOneLight(results.email),
          ]);
          //update chat to group if the group id is not null
          if (groupId != null) {
            const groupUpdate = await ConvUsers.updateGroupId(
              chatExists,
              groupId
            );
            const newChatData = await ConvUsers.checkIfExists(
              post.email,
              results.email
            );
            sendEventsForBecomingGroup(
              groupId,
              newChatData,
              passenger,
              driver,
              io
            );
          }

          //CHANGE THE EXPIRATION DATE AND ISGROUP FLAG TO THE OLDER ONE AND DO NOT DELETE THE CHAT
          await updateExpirationDates(
            chatExists,
            moment(newDate),
            io,
            driver,
            passenger
          );
        } else {
          //chat doesn't exist at all so a new one is created
          const chatMade = await ConvUsers.saveOne({
            convid: post.email + " " + results.email,
            expiresIn: expiresIn,
            messages: null,
            groupId: results.groupId != null ? results.groupId : null,
          });
          if (chatMade === false)
            throw new Error("Error at creating new chat between the users");
          chatCreated = true;
        }
        //END OF CREATION OF NEW CHAT

        let convid =
          chatExists != null
            ? chatExists.convid
            : post.email + " " + results.email;
        fun.toNotifyTheVerified(results.email, post.postid, post.email, convid);
        return {
          status: 200,
          message: msg.likerVerified,
          chatCreated: chatCreated,
          conversationId: convid,
        };
      } else {
        let dateToCompare = null;
        //unverify the interested user
        const reseted = await PostInterested.resetFlags(results);
        if (!reseted) {
          throw new Error("Error at reseting the flag of interested");
        }

        // ====== check if the unverification should destroy the possible review =======
        await handleToReviews(post, results, dateToCompare);

        //=================== DELETE THE CHAT CASE  ....
        let expiresIn = await determineExpirationDate(post);
        console.log("Date to check for the destruction of chat:", expiresIn);
        const chat = await ConvUsers.checkIfExists(results.email, post.email);

        //CHECK IF CHAT HAS A GROUPID
        let groupId = chat.groupId !== null ? chat.groupId : null;
        let makeGroupId = results.groupId === groupId ? null : groupId;

        if (chat === false) throw new Error("error at finding existing chat");

        //CHECK IF THERE IS ANY OLDER VERIFICATION OF THE USERS
        let expirationDates = await getExpirationsDates(results, post);

        let toDelete = true;
        if (expirationDates.length > 0) {
          toDelete = false;

          //FIND THE LATEST EXPIRATION DATE IF THERE IS ANY
          const expirationDatesParsed = expirationDates.map((d) => moment(d));
          let maxDate = moment.max(expirationDates);
          // Update conversation expiration date and retrieve driver and passenger
          const [updated, driver, passenger] = await Promise.all([
            ConvUsers.updateDate(
              chat.convid,
              moment.max(expirationDatesParsed),
              makeGroupId
            ),
            User.findOneLight(post.email),
            User.findOneLight(results.email),
          ]);
          if (!updated) {
            throw new Error("Failed to update conversation expiration date");
          }

          //CHANGE THE EXPIRATION DATE AND ISGROUP FLAG TO THE OLDER ONE AND DO NOT DELETE THE CHAT
          updateExpirationDates(chat, maxDate, io, driver, passenger);

          //Update chats if chat becomes personal
          sendEventsForUpdates(
            groupId,
            makeGroupId,
            chat,
            passenger,
            driver,
            io
          );
        }
        console.log("TO DELETE", toDelete);

        if (toDelete) {
          const deletedChat = await ConvUsers.deleteIfExpiresEqual(
            chat,
            expiresIn
          );

          if (deletedChat === "0") throw new Error("error at deleting chat");
          else if (deletedChat === false) {
            return { status: 200, message: msg.likerUnverified };
          } else {
            const user1 = await User.findOneLight(post.email);
            const user2 = await User.findOneLight(results.email);

            io.to(user1.socketId).emit("action", {
              type: "onConversationRemoved",
              data: {
                conversation: chat.convid,
              },
            });
            io.to(user2.socketId).emit("action", {
              type: "onConversationRemoved",
              data: {
                conversation: chat.convid,
              },
            });
            return {
              //return the conversation id if the chat is deleted

              status: 200,
              message: msg.likerUnverified,
              convDeleted: deletedChat,
            };
          }
        } else {
          return { status: 200, message: msg.likerUnverified };
        }
      }
    } else {
      return {
        status: 405,
        message: msg.seatsFull,
      };
    }
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }

  async function getExpirationsDates(results, post) {
    const curDate = moment();
    const [allActivePassenger, allActiveDriver] = await Promise.all([
      Post.findAllActive(results.email, curDate),
      Post.findAllActive(post.email, curDate),
    ]);
    const postListPassenger = allActivePassenger.map((val) => val.postid);
    const postListDriver = allActiveDriver.map((val) => val.postid);

    const allVerPassenger =
      postListDriver.length > 0
        ? await PostInterested.findAllVerifedPerPost(
            results.email,
            postListDriver
          )
        : [];
    const allVerDriver =
      postListPassenger.length > 0
        ? await PostInterested.findAllVerifedPerPost(
            post.email,
            postListPassenger
          )
        : [];

    let expirationDates = [];
    // let allDates = [];
    if (allVerPassenger.length > 0) {
      // get the expiration dates
      for await (let val of allVerPassenger) {
        for await (let postv of allActiveDriver) {
          if (val.postid == postv.postid) {
            let expires = await determineExpirationDate(postv);
            expirationDates.push(expires);
            // allDates.push({
            //   date: expires,
            //   groupId: val.groupId != null ? val.groupId : null,
            // });
          }
        }
      }
    }
    if (allVerDriver.length > 0) {
      // get the expiration dates
      for await (let val of allVerDriver) {
        for await (let postv of allActivePassenger) {
          if (val.postid == postv.postid) {
            let expires = await determineExpirationDate(postv);
            expirationDates.push(expires);
            // allDates.push({
            //   date: expires,
            //   groupId: val.groupId != null ? val.groupId : null,
            // });
          }
        }
      }
    }
    return expirationDates;
  }

  async function updateExpirationDates(chat, maxDate, io, driver, passenger) {
    //EMIT THE EXPIRATION DATE CHANGE
    io.to(driver.socketId).emit("action", {
      type: "setExpirationDate",
      data: {
        conversationId: chat.convid,
        expiresIn: maxDate.format("YYYY-MM-DD"),
      },
    });

    io.to(passenger.socketId).emit("action", {
      type: "setExpirationDate",
      data: {
        conversationId: chat.convid,
        expiresIn: maxDate.format("YYYY-MM-DD"),
      },
    });
  }

  async function sendEventsForUpdates(
    groupId,
    makeGroupId,
    chat,
    passenger,
    driver,
    io
  ) {
    if (groupId !== null && makeGroupId === null) {
      console.log("CHAT BECOMES PERSONAL");
      //gather data for the conversation
      const [ratingDataForDriver, ratingDataForPassenger] = await Promise.all([
        insertAver(driver),
        insertAver(passenger),
      ]);
      const dataForPassenger = {
        conversationId: chat.convid,
        socketId: passenger.socketId,
        username: driver.fullname,
        photo: (await checkImagePath(driver.email))
          ? `images/${driver.email}.jpeg`
          : null,
        email: driver.email,
        average: ratingDataForDriver.average,
        count: ratingDataForDriver.count,
        isGroupInterest: false,
        members: null,
        isUserOnline: false,
        expiresIn: chat.expiresIn,
        messages: [],
        isRead: true,
        lastMessage: null,
        lastMessageTime: null,
        isLastMessageMine: false,
        messagesLeft: false,
      };

      const dataForDriver = {
        conversationId: chat.convid,
        socketId: driver.socketId,
        username: passenger.fullname,
        photo: (await checkImagePath(passenger.email))
          ? `images/${passenger.email}.jpeg`
          : null,
        email: passenger.email,
        average: ratingDataForPassenger.average,
        count: ratingDataForPassenger.count,
        isGroupInterest: false,
        members: null,
        isUserOnline: false,
        expiresIn: chat.expiresIn,
        messages: [],
        isRead: true,
        lastMessage: null,
        lastMessageTime: null,
        isLastMessageMine: false,
        messagesLeft: false,
      };

      let socketList = await io.fetchSockets();

      const passengerSocket = socketList.find(
        (val) => val.id === passenger.socketId
      );
      const driverSocket = socketList.find((val) => val.id === driver.socketId);

      if (passengerSocket) {
        dataForDriver.isUserOnline = true;
      }

      if (driverSocket) {
        dataForPassenger.isUserOnline = true;
      }

      if (chat.messages !== null) {
        if (isJsonString(chat.messages)) {
          chat.messages = JSON.parse(chat.messages);
        }
        chat.messages.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        const messagesLeft = chat.messages.length > 20;
        //Paginate the messages and send the last 20 of them
        const finalMessages = _.take(
          _.drop(chat.messages, 0),
          messagesLeft ? 20 : chat.messages.length
        );
        const decryptedMessages = await fun.decryptMessages(finalMessages);

        dataForPassenger.messagesLeft = messagesLeft;
        dataForPassenger.messages = decryptedMessages;
        dataForPassenger.lastMessage = finalMessages[0].text;
        dataForPassenger.isLastMessageMine =
          finalMessages[0].user._id === passenger.email;
        dataForPassenger.isRead = dataForPassenger.isLastMessageMine
          ? true
          : finalMessages[0].isRead;

        dataForDriver.messagesLeft = messagesLeft;
        dataForDriver.messages = decryptedMessages;
        dataForDriver.lastMessage = finalMessages[0].text;
        dataForDriver.isLastMessageMine =
          finalMessages[0].user._id === driver.mail;
        dataForDriver.isRead = dataForDriver.isLastMessageMine
          ? true
          : finalMessages[0].isRead;
      }

      //send the data to the user
      io.to(driver.socketId).emit("action", {
        type: "onConversationUpdated",
        conversation: dataForDriver,
      });
      //send the data to the user
      io.to(passenger.socketId).emit("action", {
        type: "onConversationUpdated",
        conversation: dataForPassenger,
      });
    }
  }

  async function sendEventsForBecomingGroup(
    groupId,
    chat,
    passenger,
    driver,
    io
  ) {
    console.log("CHAT BECOMES GROUP");
    //gather data for the conversation
    const [ratingDataForDriver, ratingDataForPassenger] = await Promise.all([
      insertAver(driver),
      insertAver(passenger),
    ]);
    const dataForPassenger = {
      conversationId: chat.convid,
      socketId: passenger.socketId,
      username: driver.fullname,
      photo: (await checkImagePath(driver.email))
        ? `images/${driver.email}.jpeg`
        : null,
      email: driver.email,
      average: ratingDataForDriver.average,
      count: ratingDataForDriver.count,
      isGroupInterest: true,
      members: null,
      isUserOnline: false,
      expiresIn: chat.expiresIn,
      messages: [],
      isRead: true,
      lastMessage: null,
      lastMessageTime: null,
      isLastMessageMine: false,
      messagesLeft: false,
    };

    const dataForDriver = {
      conversationId: chat.convid,
      socketId: driver.socketId,
      username: passenger.fullname,
      photo: (await checkImagePath(passenger.email))
        ? `images/${passenger.email}.jpeg`
        : null,
      email: passenger.email,
      average: ratingDataForPassenger.average,
      count: ratingDataForPassenger.count,
      isGroupInterest: true,
      members: null,
      isUserOnline: false,
      expiresIn: chat.expiresIn,
      messages: [],
      isRead: true,
      lastMessage: null,
      lastMessageTime: null,
      isLastMessageMine: false,
      messagesLeft: false,
    };

    let socketList = await io.fetchSockets();

    const passengerSocket = socketList.find(
      (val) => val.id === passenger.socketId
    );
    const driverSocket = socketList.find((val) => val.id === driver.socketId);

    if (passengerSocket) {
      dataForDriver.isUserOnline = true;
    }

    if (driverSocket) {
      dataForPassenger.isUserOnline = true;
    }

    if (chat.messages !== null) {
      if (isJsonString(chat.messages)) {
        chat.messages = JSON.parse(chat.messages);
      }
      chat.messages.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      const messagesLeft = chat.messages.length > 20;
      //Paginate the messages and send the last 20 of them
      const finalMessages = _.take(
        _.drop(chat.messages, 0),
        messagesLeft ? 20 : chat.messages.length
      );
      const decryptedMessages = await fun.decryptMessages(finalMessages);

      dataForPassenger.messagesLeft = messagesLeft;
      dataForPassenger.messages = decryptedMessages;
      dataForPassenger.lastMessage = finalMessages[0].text;
      dataForPassenger.isLastMessageMine =
        finalMessages[0].user._id === passenger.email;
      dataForPassenger.isRead = dataForPassenger.isLastMessageMine
        ? true
        : finalMessages[0].isRead;

      dataForDriver.messagesLeft = messagesLeft;
      dataForDriver.messages = decryptedMessages;
      dataForDriver.lastMessage = finalMessages[0].text;
      dataForDriver.isLastMessageMine =
        finalMessages[0].user._id === driver.mail;
      dataForDriver.isRead = dataForDriver.isLastMessageMine
        ? true
        : finalMessages[0].isRead;
    }

    const groupData = await Groups.findOne(groupId);
    dataForDriver.members = (await fun.insertDataToMembers(groupData)).members;

    //send the data to the user
    io.to(driver.socketId).emit("action", {
      type: "onConversationUpdated",
      conversation: dataForDriver,
    });
    //send the data to the user
    io.to(passenger.socketId).emit("action", {
      type: "onConversationUpdated",
      conversation: dataForPassenger,
    });
  }

  async function handleToReviews(post, results, dateToCompare) {
    const toReviewExists = await ToReview.findIfExists(
      post.email,
      results.email
    );
    if (toReviewExists === false)
      throw new Error("Error at finding the toreview");

    // if driver is owner check all older posts and decide if you need to update the flags or deny review
    /* The code is checking if a review exists for a specific driver email and if there are any
    active posts for that driver. If there are active posts, it retrieves all the verified posts
    for a specific passenger email and checks the end dates of those posts to get the oldest
    one. It then creates a new review object with the oldest post's end date and the
    corresponding post interested ID. */
    if (toReviewExists.driverEmail === post.email) {
      const allActiveDriver = await Post.findAllActive(
        toReviewExists.driverEmail,
        moment()
      );

      if (allActiveDriver.length > 0) {
        const allPostIds = allActiveDriver.map((val) => val.postid);
        const allVerified = await PostInterested.findAllVerifedPerPost(
          toReviewExists.passengerEmail,
          allPostIds
        );
        if (allVerified.length > 0) {
          //Check the enddates of active verifed posts and get the oldest
          const dates = await Promise.all(
            allVerified.map(async (val) => {
              const tempPost = await Post.findOne(val.postid);
              const date =
                tempPost.enddate != null
                  ? tempPost.enddate
                  : tempPost.startdate;
              return { d: date, p: val.piid };
            })
          );

          let newdates = dates.map((d) => moment(d.d));
          let minDate = moment.min(newdates);
          const { piid } = dates.find((d) => moment(d.d).isSame(minDate));
          dateToCompare = minDate;

          const newToReview = await ToReview.newReview(
            toReviewExists,
            minDate,
            piid
          );
          if (!newToReview)
            throw new Error(
              "Error at updating the toreview object with older data"
            );
        }
      }
    }

    const activePassengerPosts = await Post.findAllActive(
      results.email,
      moment()
    );

    /* The above code is checking if there are any active passenger posts and if there are, it
    retrieves all the verified interested passengers for those posts. It then checks if the
    minimum date of those verified interested passengers is greater than or equal to a given
    date to compare. If it is, it creates a new review object and updates the existing toReview
    object with the new review. If the minimum date is not greater than or equal to the given
    date to compare, it denies the review. If there are no active passenger posts, it also
    denies the review. */
    let passengerPostsIds = activePassengerPosts.map((val) => val.postid);
    if (activePassengerPosts.length > 0) {
      const allVerifiedOfDriver = await PostInterested.findAllVerifedPerPost(
        post.email,
        passengerPostsIds
      );

      if (allVerifiedOfDriver.length > 0) {
        let dates = await Promise.all(
          allVerifiedOfDriver.map(async (val) => {
            let tempPost = await Post.findOne(val.postid);
            let date = tempPost.enddate ?? tempPost.startdate;
            return { d: date, p: val.piid };
          })
        );

        let newDates = dates.map((d) => moment(d.d));
        let minDate = moment.min(newDates);

        if (!dateToCompare || minDate.isBefore(dateToCompare)) {
          let piid;
          _.forEach(dates, (d) => {
            if (moment(d.d).isSame(minDate)) {
              piid = d.p;
            }
          });

          let passenger = await PostInterested.findOneById(piid);
          let driver =
            passenger.email == toReviewExists.passengerEmail
              ? toReviewExists.driverEmail
              : toReviewExists.passengerEmail;

          const newToReview = await ToReview.newReviewAndReverse(
            toReviewExists,
            driver,
            passenger.email,
            minDate,
            piid
          );

          if (!newToReview) {
            throw new Error("Error at updating the toreview object");
          }
        }
      } else if (dateToCompare == null) {
        const destroyed = await ToReview.denyReview(toReviewExists);
        if (destroyed === false)
          throw new Error("Error at destroying the possible review");
      }
    } else if (dateToCompare == null) {
      const destroyed = await ToReview.denyReview(toReviewExists);
      if (destroyed === false)
        throw new Error("Error at destroying the possible review");
    }

    fun.toNotifyTheUnverified(results.email, post.postid, post.email);
  }
};

const handleFavourite = async (req) => {
  try {
    let msg = await determineLang(req);
    let email = req.body.extra;
    let postid = req.body.data.postid;

    const countAll = await Post.countFavourites(email);
    if (countAll === null)
      throw new Error("Error at counting the favourites of user");

    const post = await Post.findOne(postid);
    if (post === false) throw new Error("Error at finding the post of user");

    if (post.isFavourite == true) {
      const deletedFav = await Post.deleteFavourite(postid);
      if (deletedFav === false)
        throw new Error("Error at deleting the favourite");
      return {
        status: 200,
        message: msg.favRideDeleted,
      };
    }
    if (countAll < 10) {
      const newFav = await Post.makeFavourite(postid);
      if (newFav === false) throw new Error("Error at declaring new favourite");
      return { status: 200, message: msg.favRideRegistered };
    } else {
      return { status: 405, message: msg.tenFavourites };
    }
  } catch (error) {
    // console.error(error);
    return { status: 500 };
  }
};

const getFavourites = async (req) => {
  try {
    let email = req.body.extra;
    let msg = await determineLang(req);
    const user = await User.findOneLight(email);
    if (user === false) throw new Error("Error at finding the user data");

    let extraData = await insertAver(user);
    user.dataValues = { ...user.dataValues, ...extraData };

    const allFavourites = await Post.findAllFavourites(email);
    if (allFavourites === false)
      throw new Error("Error at getting all the favourites");
    else if (allFavourites.length == 0) {
      return { status: 404, message: msg.noFavourites };
    }

    let allResults = [];
    for await (post of allFavourites) {
      if (fun.isJsonString(post.moreplaces)) {
        post.moreplaces = JSON.parse(post.moreplaces);
      }
      post = await fun.fixAllDates(post);
      let image = null;
      if (await checkImagePath(user.email)) {
        image = "images/" + user.email + ".jpeg";
      }
      allResults.push({
        user: user,
        post: post,
        imagePath: image,
        interested: false,
      });
    }
    return { status: 200, data: allResults };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

/**
 * The function fetches and paginates a list of posts based on certain criteria and returns them along
 * with user information and other details.
 * @param req - The request object containing information about the HTTP request made to the server. It
 * includes data such as the request headers, request body, and request method.
 * @returns an object with properties `status`, `body`, and `message`. The `status` property indicates
 * the status code of the response, the `body` property contains the data returned by the function, and
 * the `message` property contains a message related to the response.
 */
const feedScreen = async (req) => {
  try {
    let msg = await determineLang(req);
    var data = req.body.data;
    let email = req.body.extra;
    let array = [];
    let curDate = moment();
    /* The above code is defining a query object with a where clause that filters records based on
    certain conditions. The conditions include checking if the startplace or startcoord properties
    of the record match certain values, and if the startdate or enddate properties are greater than
    or equal to the current date. The query also includes an order clause that sorts the results in
    descending order based on the date property. The code uses the Sequelize library's Op object to
    define the operators used in the query. */
    let query = {
      where: {
        // email: { [Op.ne]: email },
        [Op.and]: [
          {
            [Op.or]: [
              { startplace: data.startplace },
              { startcoord: data.startcoord },
            ],
          },
          // check startdate if greater than curdate
          // check if enddate greater than curdate
          {
            [Op.or]: [
              { startdate: { [Op.gte]: curDate } },
              { enddate: { [Op.gte]: curDate } },
            ],
          },
        ],
      },
      order: [["date", "DESC"]],
    };

    // get all the rides based on the query above
    let found = await Post.findAndCountAll(query);
    if (found.count == 0) {
      return { status: 404, message: msg.noRidesFound };
    } else if (found === null) {
      throw new Error("Something went wrong in searching the posts");
    }

    for await (fnd of found.rows) {
      fnd.dataValues.isFavourite = false;
      if (isJsonString(fnd.moreplaces)) {
        fnd.moreplaces = JSON.parse(fnd.moreplaces);
      }
      fnd = await fun.fixAllDates(fnd);
      let userQuery = {
        attributes: {
          exclude: ["password", "verified", "facebook", "instagram", "mobile"],
        },
        where: {
          email: fnd.email,
        },
      };

      const user = await User.findOneUserQuery(userQuery);
      if (user === false) {
        throw new Error(
          "Something went wrong with finding the user of each post"
        );
      }
      var flag;
      let isApproved = false;
      // insert the review average and count inside the object of the user
      let extraData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...extraData };

      // check if the user is interested in the specific post
      let interested = await PostInterested.findOne(email, fnd.postid);

      let isGroupInterested = false;
      if (interested == null) {
        flag = false;
      } else {
        flag = true;
        if (interested.isVerified == true) isApproved = true;
        interested.groupId != null
          ? (isGroupInterested = true)
          : (isGroupInterested = false);
      }
      let image = null;
      if (await checkImagePath(user.email)) {
        image = "images/" + user.email + ".jpeg";
      }
      let results = {
        user: user.toJSON(),
        imagePath: image,
        post: fnd,
        interested: flag,
        isGroupInterested: isGroupInterested,
        isApproved: isApproved,
      };
      array.push(results);
    }

    //PAGINATION
    /* The above code is implementing pagination logic for an array of data. It calculates the number
    of items to skip and take based on the requested page number and the number of items per page.
    It then uses the Lodash library to extract the desired subset of data from the array. It also
    calculates the total number of pages based on the length of the array and the number of items
    per page. If the requested page number is greater than the total number of pages, it returns an
    error message indicating that the pagination limit has been exceeded. */
    var skipcount = 0;
    var takecount = 10;
    if (data.page > 1) skipcount = data.page * 10 - 10;
    var finalarr = _.take(_.drop(array, skipcount), takecount);

    var mod = array.length % 10;

    var totallength = 1;
    mod == 0
      ? (totallength = array.length / 10)
      : (totallength = array.length / 10 - mod / 10 + 1);

    // if the request asks for page that is over the limit
    if (data.page > totallength) {
      return {
        status: 404,
        message: msg.paginationLimit,
      };
    }
    let results = {
      postUser: finalarr,
      totalPages: totallength,
      pageLength: finalarr.length,
    };
    return { status: 200, body: results, message: msg.ridesFound };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

/**
 * The function "feedAll" retrieves and paginates a list of posts from the database, along with
 * associated user and interested status information.
 * @param req - The request object containing information about the HTTP request made to the server.
 * @returns an object with properties `status`, `body`, and `message`. The `status` property indicates
 * the status code of the response, the `body` property contains the data returned by the function, and
 * the `message` property contains a message related to the response.
 */
const feedAll = async (req) => {
  try {
    let msg = await determineLang(req);
    var data = req.body.data;
    let email = req.body.extra;
    let array = [];
    let curDate = moment();
    let query = {
      where: {
        // email: { [Op.ne]: email },
        [Op.or]: [
          { startdate: { [Op.gte]: curDate } },
          { enddate: { [Op.gte]: curDate } },
        ],
      },
      order: [["date", "DESC"]],
    };

    // get all the rides based on the query above
    let found = await Post.findAndCountAll(query);
    if (found.count == 0) {
      return { status: 404, message: msg.noRidesFound };
    } else if (found === null) {
      throw new Error("Something went wrong in searching the posts");
    }

    for await (fnd of found.rows) {
      fnd.dataValues.isFavourite = false;
      if (isJsonString(fnd.moreplaces)) {
        fnd.moreplaces = JSON.parse(fnd.moreplaces);
      }
      fnd = await fun.fixAllDates(fnd);
      let userQuery = {
        attributes: {
          exclude: ["password", "verified", "facebook", "instagram", "mobile"],
        },
        where: {
          email: fnd.email,
        },
      };

      const user = await User.findOneUserQuery(userQuery);
      if (user === false) {
        throw new Error(
          "Something went wrong with finding the user of each post"
        );
      }
      var flag;
      let isApproved = false;
      // insert the review average and count inside the object of the user
      let extraData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...extraData };

      // check if the user is interested in the specific post
      let interested = await PostInterested.findOne(email, fnd.postid);

      let isGroupInterested = false;
      if (interested == null) {
        flag = false;
      } else {
        flag = true;
        if (interested.isVerified == true) isApproved = true;
        interested.groupId != null
          ? (isGroupInterested = true)
          : (isGroupInterested = false);
      }
      let image = null;
      if (await checkImagePath(user.email)) {
        image = "images/" + user.email + ".jpeg";
      }
      let results = {
        user: user.toJSON(),
        imagePath: image,
        post: fnd,
        interested: flag,
        isGroupInterested: isGroupInterested,
        isApproved: isApproved,
      };
      array.push(results);
    }

    //PAGINATION
    var skipcount = 0;
    var takecount = 10;
    if (data.page > 1) skipcount = data.page * 10 - 10;
    var finalarr = _.take(_.drop(array, skipcount), takecount);

    var mod = array.length % 10;

    var totallength = 1;
    mod == 0
      ? (totallength = array.length / 10)
      : (totallength = array.length / 10 - mod / 10 + 1);

    // if the request asks for page that is over the limit
    if (data.page > totallength) {
      return {
        status: 404,
        message: msg.paginationLimit,
      };
    }
    let results = {
      postUser: finalarr,
      totalPages: totallength,
      pageLength: finalarr.length,
    };
    return { status: 200, body: results, message: msg.ridesFound };
  } catch (error) {
    console.error(error);
    return { status: 500 };
  }
};

const updateOnePost = async (req, res) => {
  try {
    const msg = await determineLang(req);
    console.log("UPDATING POST...");
    let postId = req.body.data.postId;
    let { image, date, ...newPostData } = req.body.data.newData;
    let postData = await Post.findOne(postId);
    if (postData === false) {
      throw new Error("Error at database level");
    } else if (postData === null) {
      throw new Error("Post not found");
    }
    if (!newPostData.hasOwnProperty("image")) {
      // newPostData.date = moment();
      await postData.update(newPostData).catch((err) => {
        throw err;
      });
      if (image === null) {
        //delete the image of the post if exists
        if (fs.existsSync(`postImages/${postData.postid}.jpeg`)) {
          fs.unlinkSync(`postImages/${postData.postid}.jpeg`);
        }
        await postData.update({ image: null });
      } else if (image.includes("postimages")) {
        console.log("Existing image is kept");
      } else {
        console.log("UPDATING IMAGE OF POST...");
        const base64 = image;
        const buffer = Buffer.from(base64, "base64");
        fs.writeFileSync("postImages/" + postData.postid + ".jpeg", buffer);
        await postData.update({
          image: "postimages/" + postData.postid + ".jpeg",
        });
      }
      return { status: 200, message: msg.postMessages.updated, data: postData };
    }
  } catch (error) {
    console.error(error);
    return { status: 500, errorStack: error.message };
  }
};

module.exports = {
  updateOnePost,
  createNewPost,
  interested,
  searchPosts,
  getPostsUser,
  getPostPerId,
  getInterestedPerUser,
  getIntPost,
  deletePost,
  deleteInterested,
  verInterested,
  handleFavourite,
  getFavourites,
  feedScreen,
  feedAll,
};
