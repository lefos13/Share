// In src/v1/routes/neutralRoutes.js
const express = require("express");

const neutralController = require("../../controllers/neutralController");
const { authenticateToken } = require("../../middleware/auth");
const router = express.Router();

const cors = require("cors");
//cors configuration
const whitelist = ["*"];
const corsOptions = {
  credentials: true,
  methods: ["GET", "PUT", "User", "DELETE", "OPTIONS"],
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
    // console.log(origin);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
      //callback(new Error('Not allowed by CORS'))
    }
  },
};

//route to find a user
router.post(
  "/sendReport",
  [authenticateToken],
  cors(corsOptions),
  neutralController.sendReport
);

router.post(
  "/webSendReport",
  [],
  cors(corsOptions),
  neutralController.webSendReport
);

router.get(
  "/getTerms",
  [authenticateToken],
  cors(corsOptions),
  neutralController.getTerms
);

router.post(
  "/moreMessages",
  [authenticateToken],
  cors(corsOptions),
  neutralController.moreMessages
);

router.get(
  "/getNotifications",
  [authenticateToken],
  cors(corsOptions),
  neutralController.getNotifications
);

router.post(
  "/readNotification",
  [authenticateToken],
  cors(corsOptions),
  neutralController.readNotification
);

router.post(
  "/deleteNotification",
  [authenticateToken],
  cors(corsOptions),
  neutralController.deleteNotification
);
// router.get(
//   "/",
//   [authenticateToken],
//   cors(corsOptions),
//   neutralController.getTerms
// );
module.exports = router;
