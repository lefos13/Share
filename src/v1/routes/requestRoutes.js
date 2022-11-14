// In src/v1/routes/UserRoutes.js
const express = require("express");

const requestController = require("../../controllers/requestController");
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
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
      //callback(new Error('Not allowed by CORS'))
    }
  },
};

//route to create a User
router.post(
  "/createRequest",
  [authenticateToken],
  cors(corsOptions),
  requestController.createRequest
);

router.get(
  "/getRequests",
  [authenticateToken],
  cors(corsOptions),
  requestController.getRequests
);

router.post(
  "/deleteRequest",
  [authenticateToken],
  cors(corsOptions),
  requestController.deleteRequest
);

module.exports = router;
