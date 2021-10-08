var path = require("path");
var app = require("express")();
var http = require("http").Server(app);
// var io = require("socket.io")(http);
const cors = require("cors");

//const socketAuth = require('socketio-auth');

//const whitelist = ["http://localhost:8080"];
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
      //callback(null, true);
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.get(
  "/run",
  [
    //check('access_token').isLength({ min: 40 }),
    //check('llo').isBase64()
  ],
  cors(corsOptions),
  (req, res, next) => {
    var RES = new Object();
    RES.code = req.query["code"];
    console.error("socket GET from client " + RES.code);

    RES.error = false;
    RES.error_msg = "ok";

    // io.emit("iotdata", RES);
    // io.in("iot").emit("message", RES);
    res.json(RES);
  }
);

app.get(
  "/test",
  [
    //check('access_token').isLength({ min: 40 }),
    //check('llo').isBase64()
  ],
  cors(corsOptions),
  (req, res) => {
    var data = req.query["input"];
    var RES = new Object();
    console.log("asd");
    console.error(`Client called GET from axios`);
    res.json(data);
  }
);

http.listen(3000, () => console.error("listening on http://0.0.0.0:3000/"));
console.error("Run demo project");
console.log("Hello World!");
