// In src/v1/routes/neutralRoutes.js
const express = require("express");

const groupController = require("../../controllers/groupController");
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
  "/createGroup",
  [authenticateToken],
  cors(corsOptions),
  groupController.createGroup
);

router.get(
  "/getGroups",
  [authenticateToken],
  cors(corsOptions),
  groupController.getGroups
);

router.post(
  "/deleteGroup",
  [authenticateToken],
  cors(corsOptions),
  groupController.deleteGroup
);

//change group name route
router.post(
  "/changeName",
  [authenticateToken],
  cors(corsOptions),
  groupController.changeName
);

//remove member route (GUEST)
router.post(
  "/leaveGroup",
  [authenticateToken],
  cors(corsOptions),
  groupController.leaveGroup
);

//accept invitation route (GUEST)
router.post(
  "/acceptInvitation",
  [authenticateToken],
  cors(corsOptions),
  groupController.acceptInvitation
);

//decline invitation route (GUEST)
router.post(
  "/declineInvitation",
  [authenticateToken],
  cors(corsOptions),
  groupController.declineInvitation
);

module.exports = router;
