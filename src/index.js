const express = require("express");
const app = express();
var http = require("http").Server(app);
const { createProxyMiddleware } = require("http-proxy-middleware");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");

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

const { v4: uuidv4 } = require("uuid");
const Users = require("./modules/user");
const { valuesIn } = require("lodash");
const { IsJsonString } = require("./utils/functions");

// const users = {};

// let conversations = [];

// const createUsersOnline = (userId) => {
//   const values = Object.values(users);
//   const onlyWithUsernames = values.filter((u) => u.username != undefined);
//   console.log({ onlyWithUsernames });
//   return onlyWithUsernames;
// };

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    // delete users[socket.id];
    // io.emit("action", {
    //   type: "users_online",
    //   data: createUsersOnline(socket.id),
    // });
    // conversations = conversations.filter((conv) => conv.socketId != socket.id);
    // io.emit("action", { type: "conversations", data: conversations });
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
          _.forEach(dbConvs, (value) => {
            // console.log(value.toJSON());
            let convid = value.convid;
            const mails = value.convid.split("_");
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
          });

          //import into convs list all the data that are required for the emition
          for await (u of otherUsers) {
            let data = {};
            const us = await Users.findOne({ where: { email: u.mail } }).catch(
              (err) => {
                throw err;
              }
            );
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
            if (IsJsonString(u.messages) && u.messages != null) {
              // order
              u.messages = JSON.parse(u.messages);
              u.messages.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
              });
              data.messages = u.messages;
              data.lastMessage = u.messages[0].text;
              data.isLastMessageMine =
                u.messages[0].user._id == action.data.email ? true : false;
              data.lastMessageTime = moment(u.messages[0].createdAt).format(
                "HH:MM:SS"
              ); //need to change
              data.isRead = true; //need to change
              // console.log(u.messages);
            } else {
              data.messages = [];
              data.isRead = true;
              data.lastMessage = "No messages sent yet!";
              data.lastMessageTime = "00:00:00";
              data.isLastMessageMine = false;
            }

            console.log(data);
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

        case "server/app_in_background": {
          //app in background, do not close the socket connection
          break;
        }

        case "server/conversation_opened": {
          //this is triggered when i get to the personal chat and the message is not read.
          //so we must set it to read
          console.log("Coversation opened:", action.data.conversationId);
          // const conversationId = action.data.conversationId;
          // const isOpened = action.data.isOpened;
          // const itemToUpdate = conversations.find(
          //   (item) => item.userId === conversationId
          // );
          // const index = conversations.indexOf(itemToUpdate);
          // itemToUpdate.isRead = isOpened;
          // conversations[index] = itemToUpdate;

          break;
        }

        case "server/private_message":
          // console.log(action.data);

          // console.log(socket);

          const conversationId = action.data.conversationId; // this is the receipient id
          const from = action.data.senderId; //this is my id
          const fromEmail = action.data.senderEmail; //this is my id

          // const userValues = Object.values(users);
          const conversation = await Conv.findOne(conversationId);
          if (conversation === false) {
            return new Error("Conversation finding error");
          }
          // console.log(conversation.toJSON());
          const mails = conversation.convid.split("_");
          let receiver;
          mails[0] == fromEmail ? (receiver = mails[1]) : (receiver = mails[0]);

          const recUser = await User.findOneLight(receiver);
          const recSocketId = recUser.socketId;

          io.to(recSocketId).emit("action", {
            type: "private_message",
            data: {
              ...action.data,
              conversationId: conversationId,
              senderEmail: fromEmail,
            },
          });

          const addedMessage = await Conv.addMessage(
            conversationId,
            action.data.message
          );
      }
    } catch (error) {
      console.log(error);
    }
  });
});
