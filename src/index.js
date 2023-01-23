const express = require("express");
const app = express();
var http = require("http").Server(app);
const { createProxyMiddleware } = require("http-proxy-middleware");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");

let allowCrypto = false;

//limit the size of request
var bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "5mb", type: "application/json" }));

//helmet for security
const helmet = require("helmet");
app.use(helmet());

var _ = require("lodash");
app.use("/images", express.static("uploads"));

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
    console.log(file, req.body);
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } = process.env;

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

//sequelize schema
const { Sequelize, DataTypes, fn } = require("sequelize");
const { nextTick } = require("process");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
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

const Posts = require("./modules/post");
const PostInterested = require("./modules/postinterested");
const ConvUsers = require("./modules/convusers");
const Conv = require("./database/ConvUsers");
const User = require("./database/User");

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    // console.log(token);
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, TOKEN_KEY, (err, email) => {
      if (err)
        return res.json({
          body: null,
          message: "Token expired or didnt even exist",
        });
      else {
        // console.log("inside auth: " + JSON.stringify(req.body.data));
        // console.log("Athenticated: " + email.email + "lol");
        console.log("Authenticated:", email.email);
        req.body["extra"] = email.email;
      }
      next();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong!" });
  }
}
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

//run once a time to delete old posts from the database
const deleteOldPosts = schedule.scheduleJob("0 0 1 */1 *", async function () {
  // const deleteOldPosts = schedule.scheduleJob("*/1 * * * * *", async function () {
  try {
    // console.log("Posts are being deleted");
    var today = new Date("2022-12-01");
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(
      today.getMonth() + 1 > 3
        ? today.getMonth() + 1 - 3
        : 12 - 3 + today.getMonth() + 1
    ).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();

    today.getMonth() + 1 <= 3 ? yyyy-- : yyyy;

    today = yyyy + "-" + mm + "-" + dd;
    console.log(today);
    //find all posts that their enddate is older than curdate
    await Posts.findAll({
      where: { enddate: { [Op.lt]: today } },
    }).then(async (res) => {
      if (res.length != 0) {
        for await (r of res) {
          //find interested of post
          const postInt = await PostInterested.findAll({
            where: {
              postid: r.postid,
            },
          });
          if (postInt.length != 0) {
            for await (p of postInt) {
              //destroy interested
              p.destroy();
            }
          }

          //destroy post
          r.destroy();
        }
      }
    });
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
      console.log("Conversations deleting", curTime);

      let dateToCheck = moment().format("YYYY-MM-DD");
      const expired = await Conv.getAllExpired(dateToCheck);
      if (expired.length > 0) {
        _.forEach(expired, (val) => {
          console.log("Conversation deleted: ", val.convid);
          val.destroy().catch((err) => {
            throw err;
          });
        });
      } else {
        console.log("No Conversations found to delete!");
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
      console.log(path);
      let lang = req.headers["accept-language"];
      // if(lang == "GR")

      // path = "input=volos&key=" + GOOGLE_KEY;
      // console.log(path);
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
      console.log(path);
      // path = "input=volos&key=" + GOOGLE_KEY;
      // console.log(path);
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
      console.log(path);
      return path;
    },
  })
);

const port = 3000;

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
} = require("./utils/functions");

app.locals["bg"] = {};

io.on("connection", (socket) => {
  console.log("Someone connected:", socket.id);

  socket.emit("action", {
    type: "getUserEmail",
    data: {},
  });

  socket.on("disconnect", async (data) => {
    try {
      console.log("Disconnected!!!!!", data, socket.id);
      const user = await User.findPerSocket(socket.id);
      if (user === false)
        throw new Error("Cant find user that just disconnected");

      const dbConvs = await ConvUsers.findAll({
        where: {
          convid: { [Op.substring]: user.email },
        },
      }).catch((err) => {
        throw err;
      });

      for await (conv of dbConvs) {
        let emails = conv.convid.split(" ");
        let other;
        if (user.email != emails[0]) {
          other = await User.findOneLight(emails[0]);
          // console.log(other);
        } else {
          other = await User.findOneLight(emails[1]);
          // console.log(other);
        }

        io.to(other.socketId).emit("action", {
          type: "setIsConversationUserOnline",
          data: {
            conversationId: conv.convid,
            isUserOnline: false,
          },
        });
        console.log("Emitted to:", other.email, " that i am offline now!");
        //delete states of user conversations
      }
      if (app.locals[user.email] != null) {
        // console.log(app.locals[user.email]);
        delete app.locals[user.email];
        // console.log(app.locals[user.email]);
      }
    } catch (error) {
      console.log(error);
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
          console.log(
            "This user just logged in and connected with sockets: ",
            action.data.email,
            " with socket.id:",
            socket.id
          );
          // console.log(socket);
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
            // console.log(value.toJSON());
            let convid = value.convid;
            const mails = value.convid.split(" ");
            if (mails[0] != action.data.email) {
              console.log("Users that i have a chat with", mails[0]);
              otherUsers.push({
                mail: mails[0],
                expiresIn: value.expiresIn,
                messages: value.messages,
                convid: convid,
              });
            } else if (mails[1] != action.data.email) {
              console.log("Users that i have a chat with", mails[1]);
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
            // console.log("CONVERSATION ID SEND:", u.convid);
            data.conversationId = u.convid;
            data.socketId = socket.id; //need to change
            data.username = us.fullname;
            if (us.photo != null) data.photo = "images/" + u.mail + ".jpeg";
            else data.photo = null;
            data.email = u.mail;

            data.isUserOnline = false;
            let socketList = await io.fetchSockets();
            // console.log(socketList);
            _.forEach(socketList, (val) => {
              // console.log(val.id);
              if (val.id == us.socketId) data.isUserOnline = true;
            });

            data.expiresIn = u.expiresIn;
            if (u.messages !== null) {
              // order
              u.messages = JSON.parse(u.messages);
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

              // console.log(u.messages);
            } else {
              console.log("NO MESSAGES FOUND!");
              data.messages = [];
              data.isRead = true;
              data.lastMessage = "No messages sent yet!";
              data.lastMessageTime = null;
              data.isLastMessageMine = false;
            }

            // console.log(data);
            conversations.push(data);
          }
          console.log(conversations);
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

          // const userValues = Object.values(users);
          const conversation = await Conv.findOne(conversationId);
          if (conversation === false) {
            return new Error("Conversation finding error");
          }
          // console.log(conversation.toJSON());
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

          io.to(recSocketId).emit("action", {
            type: "private_message",
            data: {
              ...action.data,
              conversationId: conversationId,
              senderEmail: fromEmail,
            },
          });

          // console.log({
          //   ...action.data,
          //   conversationId: conversationId,
          //   senderEmail: fromEmail,
          // });
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
          console.log("Chat opened", action.data);
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
          // console.log(
          //   "User to inform that his message is read: ",
          //   other.email,
          //   "NOT YET READY!"
          // );
          let seen = false;
          //inform the other user (if he is online) that i saw the message. (Even if the last message isnt his/hers)
          let socketList = await io.fetchSockets();
          let online = false;
          _.forEach(socketList, (val) => {
            if (val.id == other.socketId) online = true;
          });
          console.log("Other User Online: ", online);
          if (online) {
            seen = true;
            console.log("Send to, ", other.email, "That his message is read!");
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
          console.log("Chat closed", action.data);
          console.log("App local:", app.locals[action.data.senderId]);
          delete app.locals[action.data.senderId];
          break;
        }

        case "server/AppInBackground": {
          console.log("App in background:", action.data);
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
          console.log("App in Foreground:");
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
          console.log("App in background with active Conversation");
          console.log(action.data);
          const user = await User.findPerSocket(socket.id);
          delete app.locals[user.email];
          break;
        }

        case "server/ActiveConversationInForeground": {
          console.log("App in Foreground with active Conversation");
          // console.log(action.data);
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

          const conv = Conv.updateLastMessage(conversationId, user.email);
          if (conv === false) {
            throw new Error(
              "something went wrong with updating the last message"
            );
          }
          break;
        }

        case "server/updateExpirationDate": {
          console.log(action.data);
          let userApproving = await User.findOneLight(
            action.data.userApproving
          );
          let userApproved = await User.findOneLight(action.data.userApproved);
          const conv = await Conv.checkIfExists(
            userApproved.email,
            userApproving.email
          );
          console.log(
            "Emitting to: ",
            userApproving.email,
            " and",
            userApproved.email,
            " the new expiration date: ",
            conv.expiresIn
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
          console.log("replACE SOCKET:", action.data, socket.id);
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
          let userApproved = await User.findOneLight(action.data.userApproved);
          const conv = await Conv.checkIfExists(
            userApproved.email,
            userApproving.email
          );

          // send new conversation to both users.
          // send the new expiration date for the right conversation id
          // PREPARE DATA TO SEND TO BOTH USERS
          let socketList = await io.fetchSockets();
          // console.log(socketList);
          _.forEach(socketList, (val) => {
            // console.log(val.id);
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
            lastMessage: "No messages sent yet!",
            lastMessageTime: null,
            isLastMessageMine: false,
          };

          let user2Online = false;
          // console.log(socketList);
          _.forEach(socketList, (val) => {
            // console.log(val.id);
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
            lastMessage: "No messages sent yet!",
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
      console.log(error);
    }
  });
});

const ioObject = io;
module.exports.io = ioObject;
