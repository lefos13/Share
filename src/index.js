const express = require("express");
const app = express();
var http = require("http").Server(app);
const { createProxyMiddleware } = require("http-proxy-middleware");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");

let allowCrypto = true;

//limit the size of request
/* The above code is configuring the Express app to use the `body-parser` middleware to parse incoming
JSON data. The `limit` option sets the maximum size of the JSON payload to 5 megabytes, and the
`type` option specifies that the middleware should only parse requests with a content type of
`application/json`. */
var bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "5mb", type: "application/json" }));

//helmet for security
/* The above code is configuring the use of the Helmet middleware in a Node.js application. Helmet is a
security middleware that helps protect the application from common web vulnerabilities by setting
various HTTP headers. In this case, the `contentSecurityPolicy` option is set to `false`, which
disables the default content security policy that Helmet sets. The content security policy is a
security feature that helps prevent cross-site scripting (XSS) attacks by specifying which sources
of content are allowed to be loaded on a web page. Disabling it may make the application more
vulnerable to XSS attacks. */
const helmet = require("helmet");
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const path = require("path");

var _ = require("lodash");
/* The above code is setting up routes for serving static files using Express.js. It is serving files
from the "uploads" directory under the "/images" route, from the "termsPolicies" directory under the
"/termsPolicies" route, from the "static-page" directory under the "/web" route, and from the
"static-page/site-vue/hello-world/dist" directory under the "/web2" route. */
app.use("/images", express.static("uploads"));
app.use("/termsPolicies", express.static("termsPolicies"));
app.use("/web", express.static("static-page"));
app.use("/web2", express.static("static-page/site-vue/hello-world/dist"));
app.use("/postimages", express.static("postImages"));
app.get("/", (req, res) => {
  try {
    // const webPage = readFileSync(__dirname + "/static-page/site-vue/hello-world/dist/index.html");
    // res.redirect("/web/index.html");
    res.setHeader("Content-Type", "text/html");
    res.sendFile(
      path.join(__dirname, "/static-page/site-vue/hello-world/dist/index.html")
    );
  } catch (error) {
    console.error(error);
  }
});

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
const ConvGroup = require("./database/ConvGroups");
const Group = require("./database/Group");

/* The above code is importing the `authenticateToken` function from a file located in the
`./middleware/auth` directory. This function is likely used as middleware in a web application to
authenticate user tokens before allowing access to certain routes or resources. */
const { authenticateToken } = require("./middleware/auth");
//ROUTES IMPORT

// *** ADD ***
/* The above code is importing and using various routers for different endpoints in a Node.js
application. Specifically, it is using routers for handling requests related to posts, users,
requests, reviews, neutral items, last searches, and groups. These routers are defined in separate
files and are being imported into the main application file using the `require` function. The
`app.use` function is then used to mount these routers on their respective endpoints. */
const v1PostRouter = require("./v1/routes/postRoutes");
const v1UserRouter = require("./v1/routes/userRoutes");
const v1RequestRouter = require("./v1/routes/requestRoutes");
const v1ReviewRouter = require("./v1/routes/reviewsRoutes");
const v1NeutralRouter = require("./v1/routes/neutralRoutes");
const v1LastSearchesRouter = require("./v1/routes/lastSearchRoutes");
const v1GroupRouter = require("./v1/routes/groupRoutes");
const fs = require("fs");

app.use("/reviews", v1ReviewRouter);
app.use("/requests", v1RequestRouter);
app.use("/posts", v1PostRouter);
app.use("/users", v1UserRouter);
app.use("/neutral", v1NeutralRouter);
app.use("/searches", v1LastSearchesRouter);
app.use("/groups", v1GroupRouter);
// === END OF ROUTES IMPORT
checkconnection();

const schedule = require("node-schedule");

//run once a time to delete old posts from the database 45 0 * * *
/* The above code is scheduling a job to run at 12:45 AM every day to delete all posts that are expired
for more than 3 months. It first finds all the expired posts, then checks if any post is expired for
more than 3 months. If it is, it deletes the post along with all those who were interested in it. It
also writes the deleted post's data to a JSON file in the "deleted" folder. Finally, it destroys all
the interested posts that were deleted along with the expired post. */
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

        var json = JSON.stringify(post);
        fs.writeFileSync(
          "deleted/" + curDate + "_" + post.postid + ".json",
          json,
          "UTF-8"
        );

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
/* The above code is scheduling a job to run every day at 12:30 AM. The job checks for expired
conversations and deletes them from the database if any are found. It uses the Moment.js library to
get the current time and date, and the Lodash library to iterate over the expired conversations and
delete them. */
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
/* The above code is setting up CORS (Cross-Origin Resource Sharing) options for a server. It allows
requests from any origin (as specified by the `whitelist` array), with credentials, and with certain
HTTP methods (GET, PUT, POST, DELETE, OPTIONS). It also allows certain headers to be included in the
request. The `origin` function checks if the origin is in the whitelist and either allows the
request or throws an error. In this case, it is allowing all requests regardless of origin. */
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
/**
 * The function checks if there is a successful connection to a database using Sequelize and logs a
 * message accordingly.
 */
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
/* The above code is configuring a middleware for an Express.js application. The middleware is
responsible for handling requests to the "/autocomplete/json" endpoint. It first authenticates the
request using a token, then applies CORS settings using the cors middleware. Finally, it creates a
proxy to forward the request to a target API service URL, with some modifications to the request
path using pathRewrite. Specifically, it adds a language header to the request, and appends some
query parameters to the path to restrict the autocomplete results to cities in Greece and use a
Google API key. */
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

      // path += "&components=country:gr&types=(cities)&key=" + GOOGLE_KEY;
      path += "&types=(cities)&key=" + GOOGLE_KEY;
      return path;
    },
  })
);

//google proxy for place details
/* The above code is configuring a middleware function for an Express.js application. The middleware
function is using the createProxyMiddleware function from the http-proxy-middleware library to proxy
requests to an external API service. The middleware function is also using the cors middleware to
enable Cross-Origin Resource Sharing (CORS) for the proxied requests. The middleware function is
also using an authentication middleware function to authenticate the requests before they are
proxied. The pathRewrite function is modifying the path of the proxied request to add a query
parameter for the Google Maps API key and to specify the fields to be returned in the */
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
/* The above code is configuring a middleware for an Express.js application. The middleware is using
the `createProxyMiddleware` function to proxy requests to a geocoding API service located at
`API_SERVICE_URL2`. The middleware is also using the `cors` middleware with custom options specified
in `corsOptions`. Additionally, the middleware is using the `authenticateToken` middleware to ensure
that requests are authenticated before being proxied. Finally, the middleware is modifying the
request path by adding query parameters for language, result type, and a Google API key. */
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
  isJsonString,
  encryptMessages,
  decryptMessages,
  sendMessage,
  getLang,
  insertAver,
  sendMessageGroup,
  returnAllMembers,
} = require("./utils/functions");
const { destroyPerArrayIds } = require("./database/PostInterested");
const { findOne } = require("./database/Group");
const { insertDataToMembers } = require("./utils/functions");

app.locals["bg"] = {};

io.on("connection", (socket) => {
  socket.emit("action", {
    type: "getUserEmail",
    data: {},
  });
  socket.on("disconnecting", () => {
    console.log("Socket rooms of user that was connected", socket.rooms); // the Set contains at least the socket ID
  });
  /* The above code is a JavaScript event listener that listens for a "disconnect" event on a socket
  connection. When the event is triggered, it retrieves the user associated with the socket and
  finds all conversations that the user is a part of. For each conversation, it sets the user's
  online status to false and deletes any states associated with the user's conversations. Finally,
  it removes the user from the app's local storage. */
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

      const sockets = await io.fetchSockets();
      await sendEventsGroupOnline(user, sockets, 0);

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

        /* The above code is a case statement for handling the "server/join" event in a chat
        application. It first logs all data of the user and then retrieves the user's information
        from the database. It then adds the user's socket ID to the database and retrieves all
        active conversations for the user. For each conversation, it retrieves the other user's
        information and emits a message to inform the other user that the current user is online. It
        then retrieves the conversation messages, sorts them by date, and paginates them to send the
        last 20 messages. If encryption is allowed, it decrypts */
        case "server/join":
          //log all data of the user
          console.log("call server Join!!!");

          const initiator = await User.findOneLight(action.data.email);
          if (initiator === false) {
            throw new Error("Error at finding the user");
          }

          let msg = await getLang(initiator.lastLang);

          const addedSocketId = await User.addSocketId(
            socket.id,
            action.data.email
          );
          if (addedSocketId === false)
            throw new Error("Error at updating the socket id");

          await privateConversations();
          await groupConversations();
          break;

        /* The above code is handling a private message event on a server in a chat application. It
        receives the conversation ID, sender email, and message data from the client. It then
        retrieves the recipient's email from the conversation ID and checks if the recipient is
        online or in the background. If the recipient is online, it emits the message to the
        recipient's socket. If the recipient is offline or in the background, it sends a
        notification to the recipient. The message is also added to the conversation history in the
        database. */
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

        case "server/private_message_groups": {
          console.log("CONVERSATION ID message: ", action.data.conversationId);
          const conversationId = action.data.conversationId; // this is the receipient id
          const fromEmail = action.data.senderEmail; //this is my id
          let dataForNotification = action.data.message;

          const realGroupId = action.data.conversationId.split(",")[0];
          const realConversationId = action.data.conversationId.split(",")[1];
          console.log("Real Group Id: ", realGroupId);
          console.log("Real Conversation Id: ", realConversationId);

          let userEmails = realConversationId.split(" ");
          //exclude Sender Email
          userEmails = userEmails.filter((val) => val != fromEmail);

          action.data.message.isRead = false;
          action.data.message.seen = false;
          let socketList = await io.fetchSockets(); //get all sockets

          //send notification for offline or background user
          for await (email of userEmails) {
            let userData = await User.findOneLight(email);
            if (app.locals[email] === conversationId && email !== fromEmail) {
              action.data.message.isRead = true;
              action.data.message.seen = true;
              socket.emit("action", {
                type: "setGroupConversationSeen",
                data: {
                  conversationId: conversationId,
                  seen: true,
                },
              });
            }
            io.to(userData.socketId).emit("action", {
              type: "private_message_groups",
              data: {
                ...action.data,
                conversationId: conversationId,
                senderEmail: fromEmail,
              },
            });

            //check if online or in background
            let online = false;
            _.forEach(socketList, (val) => {
              if (val.id == userData.socketId) online = true;
            });
            let inBackground = false;
            if (app.locals.bg[userData.email] != null) inBackground = true;

            //send notification for offline or background user
            if (!online || inBackground) {
              console.log(
                "User is offline or in background so NOTIFICATION IS TO BE SENT"
              );
              await sendMessageGroup(
                dataForNotification,
                email,
                fromEmail,
                conversationId
              );
            }
          }

          const conversation = await ConvGroup.findOneByGroupId(realGroupId);
          if (conversation === false) {
            return new Error("Conversation finding error");
          }

          let messages = [];
          if (allowCrypto)
            messages = await encryptMessages([action.data.message]);
          else messages.push(action.data.message);
          // let blabla = await decryptMessages(messages);
          const addedMessage = await ConvGroup.addMessage(
            realGroupId,
            messages[0]
          );
          if (addedMessage == false) {
            console.log(new Error("Error at adding the message"));
          }
          break;
        }

        /* The above code is handling the "server/personalChatOpened" event. It is setting up a
        personal chat between two users and updating the conversation status. It is also informing
        the other user (if online) that the message has been seen and marking the last message as
        read. */
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

        case "server/personalGroupChatOpened": {
          console.log("Group Chat Opened", action.data);
          let conversationId = action.data.conversationId;
          let senderId = action.data.senderId;
          //state that user has opened the chat
          app.locals[action.data.senderId] = conversationId;
          let realConversationId = conversationId.split(",")[1];
          const groupId = conversationId.split(",")[0];
          //get all users email with sender too
          let usersEmail = realConversationId.split(" ");
          //exluce sender
          usersEmail = usersEmail.filter((val) => val != senderId);

          console.log(
            `Emiting to room ${groupId} that conversation has been read`
          );
          io.to(groupId.toString()).emit("action", {
            type: "setGroupConversationSeen",
            data: {
              conversationId: conversationId,
              seen: true,
            },
          });

          socket.emit("action", {
            type: "setIsConversationReadGroups",
            data: {
              conversationId: conversationId,
              isRead: true,
            },
          });

          //get conversation and mark the last message as read
          const conv = ConvGroup.updateLastMessage(
            realConversationId,
            senderId,
            true
          );
          if (conv === false) {
            throw new Error(
              "something went wrong with updating the last message"
            );
          }

          break;
        }

        /* The above code is a case statement in a JavaScript switch statement. It is checking if the
        action type is "server/personalChatClosed". If it is, it logs the senderId from the action
        data to the console, deletes the senderId property from the app.locals object, and breaks
        out of the switch statement. This code is likely part of a larger application that handles
        personal chat sessions and cleans up resources when a session is closed. */
        case "server/personalChatClosed": {
          console.log("personalChatClosed data: ", action.data.senderId);
          delete app.locals[action.data.senderId];
          break;
        }

        case "server/personalGroupChatClosed": {
          console.log("personalGroupChatClosed data: ", action.data);
          delete app.locals[action.data.senderId];
          break;
        }

        /* The above code is handling the "AppInBackground" action. It sets the background status of
        the user to true and sends notifications to the other user(s) in the conversation if the
        user is in the background. It retrieves all conversations involving the user and sets the
        "isUserOnline" status to false for the other user(s) in each conversation. */
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
          const sockets = await io.fetchSockets();
          const senderData = await User.findOneLight(sender);
          await sendEventsGroupOnline(senderData, sockets, 0);

          break;
        }

        /* The above code is a case statement in a JavaScript function that handles the
        "server/AppInForeground" action. It logs the sender's email to the console, deletes the
        sender's email from a local background object, retrieves all conversations involving the
        sender from the database, and sends a socket.io message to each conversation's other user to
        set their online status to true. */
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
          const sockets = await io.fetchSockets();
          const senderData = await User.findOneLight(sender);
          await sendEventsGroupOnline(senderData, sockets, 1);
          break;
        }

        /* The above code is a case statement in a JavaScript program that handles the
        "server/ActiveConversationInBackground" action. It logs the data of the action to the
        console, finds the user associated with the current socket, and deletes the user's email
        from the app's local storage. */
        case "server/ActiveConversationInBackground": {
          console.log("ActiveConversationInBackground data: ", action.data);
          const user = await User.findPerSocket(socket.id);
          delete app.locals[user.email];
          break;
        }

        /* The above code is handling a socket event "ActiveConversationInForeground". It is retrieving
        the conversation ID and the user associated with the socket. It is then marking the last
        message in the conversation as read and seen. It is also updating the conversation to
        indicate that it has been read by the user. Finally, it is updating the last message in the
        conversation with the user's email. */
        case "server/ActiveConversationInForeground": {
          console.log("ActiveConversationInForeground data: ", action.data);
          const conversationId = action.data.conversationId;
          const user = await User.findPerSocket(socket.id);
          app.locals[user.email] = action.data.conversationId;
          // I NEED TO MARK THE LAST MESSAGE AS READ AND SEEN
          //get conversation and mark the last message as read
          if (conversationId.includes(",")) {
            let realConversationId = conversationId.split(",")[1];
            const groupId = conversationId.split(",")[0];
            console.log(
              `Emiting to room ${groupId} that conversation has been read`
            );
            io.to(groupId.toString()).emit("action", {
              type: "setGroupConversationSeen",
              data: {
                conversationId: conversationId,
                seen: true,
              },
            });
            socket.emit("action", {
              type: "setIsConversationReadGroups",
              data: {
                conversationId: conversationId,
                isRead: true,
              },
            });

            const conv = ConvGroup.updateLastMessage(
              realConversationId,
              user.email,
              true
            );
            if (conv === false) {
              throw new Error(
                "something went wrong with updating the last message"
              );
            }
          } else {
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
          }

          break;
        }

        /* The above code is a case statement in a JavaScript function that handles a specific action
        type "server/updateExpirationDate". It retrieves information about two users and a
        conversation from a database, and then sends a message to both users' sockets using
        Socket.IO. The message contains the conversation ID and the new expiration date for the
        conversation. */
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

        /* The above code is a case statement that handles the "server/handShakeEstablished" event. It
        creates a new conversation between two users and sends the conversation data to both users.
        It checks if the users are online and retrieves their profile photos if available. Finally,
        it emits the "onConversationAdded" event to both users with the conversation data. */
        case "server/handShakeEstablished": {
          const [userApproving, userApproved] = await Promise.all([
            await User.findOneLight(action.data.userApproving),
            await User.findOneLight(action.data.userApproved),
          ]);

          const [msgUserApproving, msgUserApproved] = await Promise.all([
            await getLang(userApproving.lastLang),
            await getLang(userApproved.lastLang),
          ]);

          const conv = await Conv.checkIfExists(
            userApproved.email,
            userApproving.email
          );

          // send new conversation to both users.
          // send the new expiration date for the right conversation id
          // PREPARE DATA TO SEND TO BOTH USERS
          let socketList = await io.fetchSockets();

          let userOnline = false;
          let user2Online = false;
          const [
            photoApproving,
            photoApproved,
            ratingDataApproving,
            ratingDataApproved,
          ] = await Promise.all([
            (await checkImagePath(userApproving.email))
              ? `images/${userApproving.email}.jpeg`
              : null,
            (await checkImagePath(userApproved.email))
              ? `images/${userApproved.email}.jpeg`
              : null,
            await insertAver(userApproving),
            await insertAver(userApproved),
            socketList.forEach((val) => {
              if (val.id == userApproving.socketId) userOnline = true;
              if (val.id == userApproved.socketId) user2Online = true;
            }),
          ]);

          const dataForApprooved = {
            conversationId: conv.convid,
            socketId: userApproving.socketId,
            username: userApproving.fullname,
            photo: photoApproving,
            email: userApproving.email,
            average: ratingDataApproving.average,
            count: ratingDataApproving.count,
            isUserOnline: userOnline,
            expiresIn: conv.expiresIn,
            messages: [],
            isRead: true,
            lastMessage: null,
            lastMessageTime: null,
            isLastMessageMine: false,
            isGroupInterest: false,
            members: null,
          };

          const dataForApprooving = {
            conversationId: conv.convid,
            socketId: userApproved.socketId,
            username: userApproved.fullname,
            photo: photoApproved,
            email: userApproved.email,
            average: ratingDataApproved.average,
            count: ratingDataApproved.count,
            isUserOnline: user2Online,
            expiresIn: conv.expiresIn,
            messages: [],
            isRead: true,
            lastMessage: null,
            lastMessageTime: null,
            isLastMessageMine: false,
            isGroupInterest: false,
            members: null,
          };

          if (conv.groupId != null) {
            let group = await findOne(conv.groupId);
            dataForApprooving.members = (
              await insertDataToMembers(group)
            ).members;

            dataForApprooved.isGroupInterest = true;
            dataForApprooving.isGroupInterest = true;
          }

          console.log("Data for approved before send:", dataForApprooved);
          io.to(userApproved.socketId).emit("action", {
            type: "onConversationAdded",
            conversation: dataForApprooved,
          });

          console.log("Data for approving before send:", dataForApprooving);
          io.to(userApproving.socketId).emit("action", {
            type: "onConversationAdded",
            conversation: dataForApprooving,
          });
          break;
        }
      }
    } catch (error) {
      console.error(error);
    }

    async function privateConversations() {
      try {
        let conversations = [];
        const otherUsers = [];

        const dbConvs = await ConvUsers.findAll({
          where: {
            convid: { [Op.substring]: action.data.email },
          },
        }).catch((err) => {
          throw err;
        });

        for (const value of dbConvs) {
          const [mail1, mail2] = value.convid.split(" ");
          const otherMail = mail1 === action.data.email ? mail2 : mail1;
          const otherUser = {
            mail: otherMail,
            expiresIn: value.expiresIn,
            messages: value.messages,
            convid: value.convid,
            groupId: value.groupId,
          };
          otherUsers.push(otherUser);
        }

        //import into convs list all the data that are required for the emition
        for await (u of otherUsers) {
          const us = await Users.findOne({ where: { email: u.mail } }).catch(
            (err) => {
              console.error(err);
              throw new Error("Something went wrong with finding the user");
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

          const ratingData = await insertAver(us);
          const data = {
            conversationId: u.convid,
            socketId: socket.id,
            username: us.fullname,
            photo: (await checkImagePath(u.mail))
              ? `images/${u.mail}.jpeg`
              : null,
            email: u.mail,
            average: ratingData.average,
            count: ratingData.count,
            isGroupInterest: false,
            members: null,
            isUserOnline: false,
            expiresIn: u.expiresIn,
            messages: [],
            isRead: true,
            lastMessage: null,
            lastMessageTime: null,
            isLastMessageMine: false,
            messagesLeft: false,
          };

          //import members of group if the conversation was initiated by a group interest
          if (u.groupId != null) {
            data.isGroupInterest = true;
            const group = await findOne(u.groupId);
            if (group === false) {
              throw new Error("Error finding group");
            }
            //Check if the user is the admin of the group
            if (group.admin !== action.data.email) {
              data.isGroupInterest = true;
              data.members = (await insertDataToMembers(group)).members;
            } else {
              //do not include members in data
              data.isGroupInterest = true;
            }
          }

          let socketList = await io.fetchSockets();

          for (const val of socketList) {
            if (val.id == us.socketId) {
              data.isUserOnline = true;
              break;
            }
          }

          if (app.locals.bg[us.email] != null) data.isUserOnline = false;

          if (u.messages !== null) {
            // order
            let toJson = isJsonString(u.messages);

            if (toJson) u.messages = JSON.parse(u.messages);
            u.messages.sort((a, b) => {
              return new Date(b.createdAt) - new Date(a.createdAt);
            });
            //if those messages are the last 20 return false
            data.messagesLeft = u.messages.length > 20;
            //Paginate the messages and send the last 20 of them
            const finalMessages = _.take(
              _.drop(u.messages, 0),
              data.messagesLeft ? 20 : u.messages.length
            );

            if (allowCrypto) {
              data.messages = await decryptMessages(finalMessages);
            } else {
              data.messages = finalMessages;
            }

            data.lastMessage = finalMessages[0].text;
            data.isLastMessageMine =
              data.messages[0].user._id == action.data.email;
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
      } catch (error) {
        console.error(error);
      }
    }
    async function groupConversations() {
      try {
        console.log("Getting all the group conversations");
        const groupConvs = await ConvGroup.findAllByEmail(action.data.email);
        let groupConversations = await Promise.all(
          groupConvs.map(async (conv) => {
            const group = await Group.findOne(conv.groupId);
            if (group === false) throw new Error("Group not found");
            //CHECK IF THERE ARE PEDNING USERS IN THE GROUP
            const checkIfPending = await Group.getPendingUsers(conv.groupId);
            let flagPending = false;
            if (checkIfPending === false)
              throw new Error("Pending users not found");
            else if (checkIfPending === true) {
              if (action.data.email !== group.admin) {
                return null;
              } else {
                flagPending = true;
              }
            }
            const adminData = await User.findOneLight(group.admin);
            if (adminData === false) throw new Error("Admin not found");

            const ratingData = await insertAver(adminData);
            if (ratingData === false) throw new Error("Rating not found");

            const data = {
              conversationId: group.groupId + "," + conv.convid,
              socketId: adminData.socketId,
              username: group.groupName,
              photo: (await checkImagePath(adminData.email))
                ? `images/${adminData.email}.jpeg`
                : null,
              email: adminData.email,
              average: ratingData.average,
              count: ratingData.count,
              isGroupInterest: false,
              members: [],
              isUserOnline: false,
              expiresIn: null,
              messages: [],
              isRead: true,
              lastMessage: null,
              lastMessageTime: null,
              isLastMessageMine: false,
              messagesLeft: false,
              pending: flagPending,
            };

            //join the room for conversation
            socket.join(group.groupId.toString());
            socket.broadcast.to(group.groupId.toString()).emit("action", {
              type: "setIsConversationUserOnlineGroups",
              data: {
                conversationId: data.conversationId,
                isUserOnline: true,
              },
            });

            let emails = conv.convid.split(" ");
            emails = emails.filter((e) => e !== action.data.email);
            let socketList = await io.fetchSockets();
            //check if there is a user of the group online
            await Promise.all(
              emails.map(async (email) => {
                let userData = await User.findOneLight(email);
                if (userData === false) throw new Error("Error finding user");
                for (const soc of socketList) {
                  if (
                    soc.id == userData.socketId &&
                    app.locals.bg[userData.email] == null
                  ) {
                    console.log(`User ${userData.email} is online`);
                    data.isUserOnline = true;
                    break;
                  }
                }
              })
            );

            //get all the members of the group
            data.members = await returnAllMembers(group);
            console.log(
              "MEMBERS AFTER ALL DATA ARE INSERTED WITH ADMIN TOO!",
              group.groupId
            );
            if (conv.messages !== null) {
              if (isJsonString(conv.messages))
                conv.messages = JSON.parse(conv.messages);
              conv.messages.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
              });

              data.messagesLeft = conv.messages.length > 20;

              const finalMessages = _.take(
                _.drop(conv.messages, 0),
                data.messagesLeft ? 20 : conv.messages.length
              );

              if (allowCrypto) {
                data.messages = await decryptMessages(finalMessages);
              } else {
                data.messages = finalMessages;
              }
              data.lastMessage = finalMessages[0].text;
              data.isLastMessageMine =
                data.messages[0].user._id == action.data.email;
              data.lastMessageTime = moment(finalMessages[0].createdAt).format(
                "DD-MM-YYYY HH:mm"
              );
              if (data.isLastMessageMine) {
                data.isRead = true;
              } else {
                // check if the user has read it in the past
                data.isRead = finalMessages[0].isRead;
              }
            }
            return data;
          })
          //logic for messages and flags
        );

        groupConversations = groupConversations.filter((conv) => conv !== null);

        console.log(
          "Emitting all the group conversations, length:",
          groupConversations.length
        );
        socket.emit("action", {
          type: "conversationsGroups",
          data: groupConversations,
        });
      } catch (error) {
        console.error(error);
      }
    }
  });
});

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

/* The above code is exporting an object named `io` from a JavaScript module. The `io` object is
assigned to the `ioObject` constant and then exported using the `module.exports` syntax. This code
is likely part of a larger project that uses the `io` object for some purpose, such as creating a
WebSocket server or handling real-time communication between clients and a server. */
const ioObject = io;
module.exports.io = ioObject;
async function sendEventsGroupOnline(user, sockets, withSelf) {
  const groupConvs = await ConvGroup.findAllByEmail(user.email);
  await Promise.all(
    groupConvs.map(async (conv) => {
      const emails = conv.convid
        .split(" ")
        .filter((email) => email !== user.email);
      // console.log("USERS TO CHECK IF ONLINE", emails.join(","));
      const users = await Promise.all(
        emails.map(async (email) => await User.findOneLight(email))
      );
      let countOnlineUsers = withSelf;

      for await (const socket of sockets) {
        if (
          users.some(
            (data) =>
              data.socketId === socket.id && app.locals.bg[data.email] == null
          )
        ) {
          countOnlineUsers++;
        }
      }
      /* The above code is a commented out console.log statement in JavaScript. It is printing a
      message to the console that includes the group ID and the number of online users in that
      group. However, the code is currently commented out, so it will not be executed. */
      console.log(
        `ONLINE USERS OF GROUP:${conv.groupId} IS ${countOnlineUsers}`
      );
      const conversationId = conv.groupId + "," + conv.convid;
      if (countOnlineUsers < 2) {
        console.log("MAKE IT OFFLINE!");
        io.to(conv.groupId.toString()).emit("action", {
          type: "setIsConversationUserOnlineGroups",
          data: {
            conversationId,
            isUserOnline: false,
          },
        });
      } else {
        console.log("MAKE IT ONLINE!");
        io.to(conv.groupId.toString()).emit("action", {
          type: "setIsConversationUserOnlineGroups",
          data: {
            conversationId,
            isUserOnline: true,
          },
        });
      }
    })
  );
}
