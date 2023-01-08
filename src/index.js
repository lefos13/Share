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

const users = {};

let conversations = [];

const createUsersOnline = (userId) => {
  const values = Object.values(users);
  const onlyWithUsernames = values.filter((u) => u.username != undefined);
  console.log({ onlyWithUsernames });
  return onlyWithUsernames;
};

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    delete users[socket.id];

    io.emit("action", {
      type: "users_online",
      data: createUsersOnline(socket.id),
    });

    conversations = conversations.filter((conv) => conv.socketId != socket.id);

    io.emit("action", { type: "conversations", data: conversations });
  });

  socket.on("action", (action) => {
    switch (action.type) {
      //once user logs in this case is triggered, here we want to send to this user a list
      //of all the conversations(user got approval from others or gave aprroval)
      //also when i initialize a chat conversation i need a unique id so i emit
      //the self_user to the client so i can initialize the chat with this id

      case "server/join":
        const uuid = uuidv4();
        users[socket.id] = { userId: uuid };
        users[socket.id].email = action.data.email;

        conversations.push({
          userId: uuid,
          socketId: socket.id,
          username: action.data.username,
          photo: "images/" + action.data.email + ".jpeg",
          email: action.data.email,
          lastMessage: "last message",
          isLastMessageMine: true,
          isUserOnline: false,
          lastMessageTime: "12:30",
          isRead: true,
          expiresIn: "13 Δεκ 2022",
          messages: [],
        });

        //i use io emit to emit in all sockets connected
        //io.emit("action", { type: "users_online", data: createUsersOnline(action.data.email) })

        io.emit("action", { type: "conversations", data: conversations });
        socket.emit("action", { type: "self_user", data: users[socket.id] });
        break;

      case "server/app_in_background": {
        //app in background, do not close the socket connection
        break;
      }

      case "server/conversation_opened": {
        //this is triggered when i get to the personal chat and the message is not read.
        //so we must set it to read

        const conversationId = action.data.conversationId;
        const isOpened = action.data.isOpened;
        const itemToUpdate = conversations.find(
          (item) => item.userId === conversationId
        );
        const index = conversations.indexOf(itemToUpdate);
        itemToUpdate.isRead = isOpened;
        conversations[index] = itemToUpdate;

        break;
      }

      case "server/private_message":
        const conversationId = action.data.conversationId; // this is the receipient id
        const from = action.data.senderId; //this is my id
        const fromEmail = action.data.senderEmail; //this is my id

        const userValues = Object.values(users);
        const socketIds = Object.keys(users);

        for (let i = 0; i < userValues.length; i++) {
          if (userValues[i].userId === conversationId) {
            const socketId = socketIds[i];
            io.to(socketId).emit("action", {
              type: "private_message",
              data: {
                ...action.data,
                conversationId: from,
                senderEmail: fromEmail,
              },
            });
            break;
          }
        }
        break;
    }
  });
});

//http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));

/*

{

  "572ca747-4ed5-42a2-89b8-b150b93221d6": {   //conversation id

    "messages": [

      {

        "_id": "b32d7799-7f84-4e53-9a86-bb2793d1384e",

        "createdAt": "2022-09-27T11:43:07.606Z",

        "text": "Ff",

        "user": {

          "_id": "af95de9f-c9bd-4194-b26b-3d3d73bec5bf"  //this id is mine

        }

      },

      {

        "_id": "22cc4dc6-b5d1-4906-9f27-62e605c90486",

        "createdAt": "2022-09-27T11:43:03.074Z",

        "text": "😘",

        "user": {

          "_id": "af95de9f-c9bd-4194-b26b-3d3d73bec5bf"

        }

      },

      {

        "_id": "f1cc7a06-ec38-40d6-85a5-d56c691fa5ff",

        "createdAt": "2022-09-27T11:42:55.030Z",

        "text": "Kk",

        "user": {

          "_id": "af95de9f-c9bd-4194-b26b-3d3d73bec5bf"

        }

      },

      {

        "_id": "7d471fc6-4f08-498d-ab05-0a7ba52f2444",

        "createdAt": "2022-09-27T11:42:03.913Z",

        "text": "Nnn",

        "user": {

          "_id": "af95de9f-c9bd-4194-b26b-3d3d73bec5bf"

        }

      }

    ],

    "username": "giannis fragoulis"

  },

  "a13306e6-ec82-40db-9ac7-15d3ddde88cf": {

    "messages": [],

    "username": "user1"

  }

}

*/
