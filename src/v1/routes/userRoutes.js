// In src/v1/routes/UserRoutes.js
const express = require("express");

const userController = require("../../controllers/userController");
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

router.get("/", userController.getAllUsers);

router.get("/:UserId", userController.getOneUser);

//route to find a user
router.post(
  "/searchuser",
  [authenticateToken],
  cors(corsOptions),
  userController.searchUser
);

//route to create a User
router.post("/register", [], cors(corsOptions), userController.createNewUser);

//route to update a user
router.post(
  "/updateProfile",
  [authenticateToken],
  cors(corsOptions),
  userController.updateOneUser
);

//route to create a jwt token for a certain user
router.post("/createtoken", [], cors(corsOptions), userController.createToken);

//route to update a user's pass
router.post(
  "/updateUserPass",
  [authenticateToken],
  cors(corsOptions),
  userController.updatePass
);

// route to login
router.post(
  "/login",
  [authenticateToken],
  cors(corsOptions),
  userController.login
);

//route for sending otp
router.post("/passotp", [], cors(corsOptions), userController.sendOtp);

//route for verifing user
router.post("/verify", [], cors(corsOptions), userController.userVerify);

router.patch("/:UserId", userController.updateOneUser);

router.delete("/:UserId", userController.deleteOneUser);

module.exports = router;
