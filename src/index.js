const express = require("express");
const app = express();
var http = require("http").Server(app);
const { createProxyMiddleware } = require("http-proxy-middleware");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");

let allowCrypto = true;

//limit the size of request
var bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "5mb", type: "application/json" }));

//helmet for security
const helmet = require("helmet");
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const path = require('path');

const { readFile, readFileSync } = require("fs");

var _ = require("lodash");
app.use("/images", express.static("uploads"));
app.use("/termsPolicies", express.static("termsPolicies"));
app.use("/web", express.static("static-page"));
app.get("/", (req, res)=> {
  try {
    const webPage = readFileSync(__dirname + "/static-page/index.html");
    // res.redirect("/web/index.html")
    // res.setHeader("Content-Type", "text/html");
    res.sendFile(path.join(__dirname, '/static-page/index.html'));
  } catch (error) {
    console.error(error);
  }
})

//cors of course
const cors = require("cors");

//jwt
const jwt = require("jsonwebtoken");

app.use(express.json());

//middleware for handling multipart
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { HOST, USERR, PASS, DATABASEE, TOKEN_KEY, GOOGLE_KEY } = process.env;

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

//sequelize schema
const { Sequelize, DataTypes, fn } = require("sequelize");
const { nextTick } = require("process");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASEE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  dialectOptions: {
    typeCast: function (field, next) {
      if (field.type == "DATETIME" || field.type == "TIMESTAMP") {
        return new Date(field.string() + "Z");
      }
      return next();
    },
  },
  logging: true,
  timezone: "+02:00",
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

const ConvUsers = require("./modules/convusers");
const Conv = require("./database/ConvUsers");
const User = require("./database/User");
const Post = require("./database/Post");

const { authenticateToken } = require("./middleware/auth");
//ROUTES IMPORT

// *** ADD ***
const v1PostRouter = require("./v1/routes/postRoutes");
const v1UserRouter = require("./v1/routes/userRoutes");
const v1RequestRouter = require("./v1/routes/requestRoutes");
const v1ReviewRouter = require("./v1/routes/reviewsRoutes");
const v1NeutralRouter = require("./v1/routes/neutralRoutes");
const v1LastSearchesRouter = require("./v1/routes/lastSearchRoutes");

app.use("/reviews", v1ReviewRouter);
app.use("/requests", v1RequestRouter);
app.use("/posts", v1PostRouter);
app.use("/users", v1UserRouter);
app.use("/neutral", v1NeutralRouter);
app.use("/searches", v1LastSearchesRouter);
// === END OF ROUTES IMPORT
checkconnection();

const schedule = require("node-schedule");

//run once a time to delete old posts from the database 45 0 * * *
const deleteOldPosts = schedule.scheduleJob("45 0 * * *", async function () {
  // const deleteOldPosts = schedule.scheduleJob("*/1 * * * * *", async function () {
  try {
    //find all posts that are expired
    let posts = await Post.globalAllExpired();

    //check if any post is expired more than 3 months and delete it along with all those that was interested to them
    let curDate = moment();
    for await (let post of posts) {
      let endDate =
        post.enddate != null ? moment(post.enddate) : moment(post.startdate);

      let months = curDate.diff(endDate, "months");
      let postIds = [];
      if (months >= 3) {
        postIds.push(post.postid);
        post.destroy();
      }

      if (postIds.length > 0) {
        let intDestroyed = await destroyPerArrayIds(postIds);
      }
    }
  } catch (err) {
    console.error(err);
  }
});

// */1 * * * * Every minute
// */5 * * * * * Every 5 seconds
// 30 0 * * * Every 12:30 after midnight
const deleteConversations = schedule.scheduleJob(
  "30 0 * * *", //every 12:30 after midnight
  async function () {
    try {
      let curTime = moment().format("hh:mm:ss");

      let dateToCheck = moment().format("YYYY-MM-DD");
      const expired = await Conv.getAllExpired(dateToCheck);
      if (expired.length > 0) {
        _.forEach(expired, (val) => {
          val.destroy().catch((err) => {
            throw err;
          });
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
);

//cors configuration
const whitelist = ["*"];
const corsOptions = {
  credentials: true,
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "device-remember-token",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Headers",
    "Origin",
    "Accept",
  ],
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
      //callback(new Error('Not allowed by CORS'))
    }
  },
};

//check connection with the database
async function checkconnection() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
  // sequelize.close()
}

const API_SERVICE_URL = `https://maps.googleapis.com/maps/api/place/`;
const API_SERVICE_URL2 = `https://maps.googleapis.com/maps/api/`;

//google proxy for autocomplete
app.use(
  "/autocomplete/json",
  [authenticateToken],
  cors(corsOptions),
  createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: async function (path, req) {
      // const should_add_something = await httpRequestToDecideSomething(path);
      let lang = req.headers["accept-language"];
      // if(lang == "GR")

      // path = "input=volos&key=" + GOOGLE_KEY;

      // path = "input=volos&key=AIzaSyA4hRBFRUrIE-XtMMb1Wp_CjiVWxue6nwY";
      path += "&components=country:gr&types=(cities)&key=" + GOOGLE_KEY;
      return path;
    },
  })
);

//google proxy for place details
app.use(
  "/details/json",
  [authenticateToken],
  cors(corsOptions),
  createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: async function (path, req) {
      // const should_add_something = await httpRequestToDecideSomething(path);

      // path = "input=volos&key=" + GOOGLE_KEY;

      // path = "input=volos&key=AIzaSyA4hRBFRUrIE-XtMMb1Wp_CjiVWxue6nwY";
      path += "&fields=geometry&key=" + GOOGLE_KEY;
      return path;
    },
  })
);

//google proxy for place details
app.use(
  "/geocode/json",
  [authenticateToken],
  cors(corsOptions),
  createProxyMiddleware({
    target: API_SERVICE_URL2,
    changeOrigin: true,
    pathRewrite: async function (path, req) {
      path += "&language=el&result_type=locality&key=" + GOOGLE_KEY;

      return path;
    },
  })
);

const port = 3001;

let server = http.listen(port, () =>
  console.error("listening on http://0.0.0.0:3000/")
);

//socket functionality for chat
let io = require("socket.io")(server);

const Users = require("./modules/user");
const {
  IsJsonString,
  encryptMessages,
  decryptMessages,
  sendMessage,
  getLang,
} = require("./utils/functions");
const { destroyPerArrayIds } = require("./database/PostInterested");


app.locals["bg"] = {};

io.on("connection", (socket) => {
  socket.emit("action", {
    type: "getUserEmail",
    data: {},
  });

  socket.on("disconnect", async (data) => {
    try {
      console.log("Disconnect reason: ", data);
      console.log("Socket disconnecting: ", socket.id);
      const user = await User.findPerSocket(socket.id);
      if (user === false)
        throw new Error("Cant find user that just disconnected");
      else if (user == null) {
        throw "User not found on disconnect!";
      }

      console.log("User disconnecting: ", user.email);
      const dbConvs = await ConvUsers.findAll({
        where: {
          convid: { [Op.substring]: user.email },
        },
      }).catch((err) => {
        throw err;
      });

      for await (let conv of dbConvs) {
        let emails = conv.convid.split(" ");
        let other;
        if (user.email != emails[0]) {
          other = await User.findOneLight(emails[0]);
        } else {
          other = await User.findOneLight(emails[1]);
        }

        console.log(
          "Emiting to",
          other.email,
          " that",
          user.email,
          " is offline!"
        );
        io.to(other.socketId).emit("action", {
          type: "setIsConversationUserOnline",
          data: {
            conversationId: conv.convid,
            isUserOnline: false,
          },
        });

        //delete states of user conversations
      }
      if (app.locals[user.email] != null) {
        delete app.locals[user.email];
      }

      if (app.locals.bg[user.email] != null) {
        delete app.locals.bg[user.email];
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("action", async (action) => {
    try {
      switch (action.type) {
        //once user logs in this case is triggered, here we want to send to this user a list
        //of all the conversations(user got approval from others or gave aprroval)
        //also when i initialize a chat conversation i need a unique id so i emit
        //the self_user to the client so i can initialize the chat with this id
        case "server/join":
          //log all data of the user
          console.log("call server Join!!!");

          const initiator = await User.findOneLight(action.data.email);
          if (initiator == null) {
            break;
          }

          let msg = await getLang(initiator.lastLang);

          const addedSocketId = await User.addSocketId(
            socket.id,
            action.data.email
          );
          if (addedSocketId === false)
            throw new Error("Error at updating the socket id");

          let conversations = [];
          const otherUsers = [];

          //Find all user's active chats and part2: extract the other user
          const dbConvs = await ConvUsers.findAll({
            where: {
              convid: { [Op.substring]: action.data.email },
            },
          }).catch((err) => {
            throw err;
          });

          // part2
          for await (value of dbConvs) {
            let convid = value.convid;
            const mails = value.convid.split(" ");
            if (mails[0] != action.data.email) {
              otherUsers.push({
                mail: mails[0],
                expiresIn: value.expiresIn,
                messages: value.messages,
                convid: convid,
              });
            } else if (mails[1] != action.data.email) {
              otherUsers.push({
                mail: mails[1],
                expiresIn: value.expiresIn,
                messages: value.messages,
                convid: convid,
              });
            }
          }

          //import into convs list all the data that are required for the emition
          for await (u of otherUsers) {
            let data = {};
            const us = await Users.findOne({ where: { email: u.mail } }).catch(
              (err) => {
                throw err;
              }
            );
            //inform the current user of that conversation, that the user that just logged in is online
            io.to(us.socketId).emit("action", {
              type: "setIsConversationUserOnline",
              data: {
                conversationId: u.convid,
                isUserOnline: true,
              },
            });

            data.conversationId = u.convid;
            data.socketId = socket.id;
            data.username = us.fullname;
            if (us.photo != null) data.photo = "images/" + u.mail + ".jpeg";
            else data.photo = null;
            data.email = u.mail;

            data.isUserOnline = false;
            let socketList = await io.fetchSockets();

            _.forEach(socketList, (val) => {
              if (val.id == us.socketId) data.isUserOnline = true;
            });

            if (app.locals.bg[us.email] != null) data.isUserOnline = false;

            data.expiresIn = u.expiresIn;
            if (u.messages !== null) {
              // order
              let toJson = IsJsonString(u.messages);

              if (toJson) u.messages = JSON.parse(u.messages);
              u.messages.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
              });
              data.messagesLeft = u.messages.length > 20 ? true : false; //if those messages are the last 20 return false
              //Paginate the messages and send the last 20 of them
              var skipcount = 0;
              var takecount = u.messages.length > 20 ? 20 : u.messages.length;
              var finalMessages = _.take(
                _.drop(u.messages, skipcount),
                takecount
              );

              if (allowCrypto)
                finalMessages = await decryptMessages(finalMessages);

              data.messages = finalMessages;
              data.lastMessage = finalMessages[0].text;
              data.isLastMessageMine =
                finalMessages[0].user._id == action.data.email ? true : false;
              data.lastMessageTime = moment(finalMessages[0].createdAt).format(
                "DD-MM-YYYY HH:mm"
              ); //need to change

              // if last message is mine then make isRead ==true
              if (data.isLastMessageMine) {
                data.isRead = true;
              } else {
                // check if the user has read it in the past
                data.isRead = finalMessages[0].isRead;
              }
            } else {
              data.messages = [];
              data.isRead = true;
              // console.log("LAST MESSAGE:", msg.noMessages);
              data.lastMessage = null;
              data.lastMessageTime = null;
              data.isLastMessageMine = false;
            }

            conversations.push(data);
          }

          //i use io emit to emit in all sockets connected
          //io.emit("action", { type: "users_online", data: createUsersOnline(action.data.email) })
          socket.emit("action", { type: "conversations", data: conversations });
          socket.emit("action", {
            type: "self_user",
            data: { userId: action.data.email },
          });
          break;

        case "server/private_message": {
          const conversationId = action.data.conversationId; // this is the receipient id
          const fromEmail = action.data.senderEmail; //this is my id
          let dataForNotificaiton = action.data.message;

          // const userValues = Object.values(users);
          const conversation = await Conv.findOne(conversationId);
          if (conversation === false) {
            return new Error("Conversation finding error");
          }

          const mails = conversation.convid.split(" ");
          let receiver;
          mails[0] == fromEmail ? (receiver = mails[1]) : (receiver = mails[0]);

          //get data of reciever from the db
          const recUser = await User.findOneLight(receiver);
          const recSocketId = recUser.socketId;

          //if receiver is online and has openned the certain conversation, mark the message as Seen and Read. Otherwise mark it as not Read.
          if (app.locals[receiver] == conversationId) {
            action.data.message.isRead = true;
            action.data.message.seen = true;
            socket.emit("action", {
              type: "setConversationSeen",
              data: {
                conversationId: conversationId,
                seen: true,
              },
            });
          } else {
            action.data.message.isRead = false;
            action.data.message.seen = false;
          }

          let online = false;
          let socketList = await io.fetchSockets(); //get all sockets
          _.forEach(socketList, (val) => {
            if (val.id == recUser.socketId) online = true;
          });

          let inBackground = false;
          if (app.locals.bg[recUser.email] != null) inBackground = true;

          // emit the message if the user is online
          if (online)
            console.log(
              "User",
              fromEmail,
              " emiting message to online user:",
              recUser.email
            );
          io.to(recSocketId).emit("action", {
            type: "private_message",
            data: {
              ...action.data,
              conversationId: conversationId,
              senderEmail: fromEmail,
            },
          });

          //send notification for offline or background user
          if (!online || inBackground) {
            console.log(
              "User",
              fromEmail,
              " emiting notification to online user:",
              recUser.email
            );
            await sendMessage(
              dataForNotificaiton,
              recUser,
              fromEmail,
              conversationId
            );
          }

          let messages = [];
          if (allowCrypto)
            messages = await encryptMessages([action.data.message]);
          else messages.push(action.data.message);
          // let blabla = await decryptMessages(messages);
          const addedMessage = await Conv.addMessage(
            conversationId,
            messages[0]
          );
          break;
        }

        case "server/personalChatOpened": {
          console.log("personalChatOpened data: ", action.data.senderId);
          let conversationId = action.data.conversationId;
          let senderId = action.data.senderId;

          app.locals[action.data.senderId] = conversationId;
          let mails = conversationId.split(" ");
          let user;
          let other;
          if (mails[0] == senderId) {
            user = await User.findOneLight(mails[0]);
            other = await User.findOneLight(mails[1]);
          } else {
            user = await User.findOneLight(mails[1]);
            other = await User.findOneLight(mails[0]);
          }

          let seen = false;
          //inform the other user (if he is online) that i saw the message. (Even if the last message isnt his/hers)
          let socketList = await io.fetchSockets();
          let online = false;
          _.forEach(socketList, (val) => {
            if (val.id == other.socketId) online = true;
          });

          if (online) {
            seen = true;

            io.to(other.socketId).emit("action", {
              type: "setConversationSeen",
              data: {
                conversationId: conversationId,
                seen: true,
              },
            });
          }

          //inform the user that opeed the chat that he read the last message.
          socket.emit("action", {
            type: "setIsConversationRead",
            data: {
              conversationId: conversationId,
              isRead: true,
            },
          });

          //get conversation and mark the last message as read
          const conv = Conv.updateLastMessage(conversationId, senderId, seen);
          if (conv === false) {
            throw new Error(
              "something went wrong with updating the last message"
            );
          }

          break;
        }

        case "server/personalChatClosed": {
          console.log("personalChatClosed data: ", action.data.senderId);
          delete app.locals[action.data.senderId];
          break;
        }

        case "server/AppInBackground": {
          console.log("AppInBackground data: ", action.data.senderEmail);
          let sender = action.data.senderEmail;
          app.locals.bg[sender] = true;
          //user should be offline right now.
          //notifications should be send if the user is in the background
          const dbConvs = await Conv.findAll(sender);
          for await (let conv of dbConvs) {
            let emails = conv.convid.split(" ");
            let other = emails[0] == sender ? emails[1] : emails[0];
            const otherUser = await User.findOneLight(other);
            io.to(otherUser.socketId).emit("action", {
              type: "setIsConversationUserOnline",
              data: {
                conversationId: conv.convid,
                isUserOnline: false,
              },
            });
          }

          break;
        }

        case "server/AppInForeground": {
          console.log("AppInForeground data: ", action.data.senderEmail);
          let sender = action.data.senderEmail;
          //user should be again online
          delete app.locals.bg[action.data.senderEmail];

          const dbConvs = await Conv.findAll(sender);
          for await (let conv of dbConvs) {
            let emails = conv.convid.split(" ");
            let other = emails[0] == sender ? emails[1] : emails[0];
            const otherUser = await User.findOneLight(other);
            io.to(otherUser.socketId).emit("action", {
              type: "setIsConversationUserOnline",
              data: {
                conversationId: conv.convid,
                isUserOnline: true,
              },
            });
          }
          break;
        }

        case "server/ActiveConversationInBackground": {
          console.log("ActiveConversationInBackground data: ", action.data);
          const user = await User.findPerSocket(socket.id);
          delete app.locals[user.email];
          break;
        }

        case "server/ActiveConversationInForeground": {
          console.log("ActiveConversationInForeground data: ", action.data);
          const conversationId = action.data.conversationId;
          const user = await User.findPerSocket(socket.id);
          app.locals[user.email] = action.data.conversationId;
          // I NEED TO MARK THE LAST MESSAGE AS READ AND SEEN
          //get conversation and mark the last message as read
          let mails = conversationId.split(" ");
          // const con = await Conv.checkIfExists(mails[0],mails[1]);
          let other = mails[0] == user.email ? mails[1] : mails[0];
          const otherUser = await User.findOneLight(other);
          let socketList = await io.fetchSockets();
          let online = false;
          _.forEach(socketList, (val) => {
            if (val.id == otherUser.socketId) online = true;
          });
          if (online)
            io.to(otherUser.socketId).emit("action", {
              type: "setConversationSeen",
              data: {
                conversationId: conversationId,
                seen: true,
              },
            });

          socket.emit("action", {
            type: "setIsConversationRead",
            data: {
              conversationId: conversationId,
              isRead: true,
            },
          });

          const conv = Conv.updateLastMessage(conversationId, user.email);
          if (conv === false) {
            throw new Error(
              "something went wrong with updating the last message"
            );
          }

          break;
        }

        case "server/updateExpirationDate": {
          let userApproving = await User.findOneLight(
            action.data.userApproving
          );
          let userApproved = await User.findOneLight(action.data.userApproved);
          const conv = await Conv.checkIfExists(
            userApproved.email,
            userApproving.email
          );

          // send the new expiration date for the right conversation id
          io.to(userApproved.socketId).emit("action", {
            type: "setExpirationDate",
            data: {
              conversationId: conv.convid,
              expiresIn: conv.expiresIn,
            },
          });

          io.to(userApproving.socketId).emit("action", {
            type: "setExpirationDate",
            data: {
              conversationId: conv.convid,
              expiresIn: conv.expiresIn,
            },
          });
          break;
        }

        case "server/replace_socket_id": {
          let email = action.data.senderEmail;
          let user = await User.findOneLight(email);
          user.update({ socketId: socket.id }).catch((err) => {
            throw err;
          });
          break;
        }

        case "server/handShakeEstablished": {
          let userOnline = false;
          let userApproving = await User.findOneLight(
            action.data.userApproving
          );
          let msgUserApproving = await getLang(userApproving.lastLang);
          let userApproved = await User.findOneLight(action.data.userApproved);
          const conv = await Conv.checkIfExists(
            userApproved.email,
            userApproving.email
          );
          let msgUserApproved = await getLang(userApproved.lastLang);

          // send new conversation to both users.
          // send the new expiration date for the right conversation id
          // PREPARE DATA TO SEND TO BOTH USERS
          let socketList = await io.fetchSockets();

          _.forEach(socketList, (val) => {
            if (val.id == userApproving.socketId) userOnline = true;
          });

          let photoApproving =
            userApproving.photo != null
              ? "images/" + userApproving.email + ".jpeg"
              : null;
          const dataForApprooved = {
            conversationId: conv.convid,
            socketId: userApproving.socketId,
            username: userApproving.fullname,
            photo: photoApproving,
            email: userApproving.email,
            isUserOnline: userOnline,
            expiresIn: conv.expiresIn,
            messages: [],
            isRead: true,
            lastMessage: null,
            lastMessageTime: null,
            isLastMessageMine: false,
          };

          let user2Online = false;

          _.forEach(socketList, (val) => {
            if (val.id == userApproved.socketId) user2Online = true;
          });

          let photoApproved =
            userApproved.photo != null
              ? "images/" + userApproved.email + ".jpeg"
              : null;
          const dataForApprooving = {
            conversationId: conv.convid,
            socketId: userApproved.socketId,
            username: userApproved.fullname,
            photo: photoApproved,
            email: userApproved.email,
            isUserOnline: user2Online,
            expiresIn: conv.expiresIn,
            messages: [],
            isRead: true,
            lastMessage: null,
            lastMessageTime: null,
            isLastMessageMine: false,
          };

          io.to(userApproved.socketId).emit("action", {
            type: "onConversationAdded",
            data: {
              conversation: dataForApprooved,
            },
          });

          io.to(userApproving.socketId).emit("action", {
            type: "onConversationAdded",
            data: {
              conversation: dataForApprooving,
            },
          });
          break;
        }
      }
    } catch (error) {
      console.error(error);
    }
  });
});

const ioObject = io;
module.exports.io = ioObject;
