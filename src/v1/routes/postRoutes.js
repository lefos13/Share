// In src/v1/routes/postRoutes.js
const express = require("express");

const postController = require("../../controllers/postController");
const { authenticateToken } = require("../../middleware/auth");
const router = express.Router();

const cors = require("cors");
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

router.get("/", postController.getAllPosts);

router.get("/:postId", postController.getOnePost);

//route to create a post
router.post(
  "/createPost",
  [authenticateToken],
  cors(corsOptions),
  postController.createNewPost
);

router.post(
  "/interested",
  [authenticateToken],
  cors(corsOptions),
  postController.interested
);

router.post(
  "/searchposts",
  [authenticateToken],
  cors(corsOptions),
  postController.searchPosts
);

router.post(
  "/getPostsUser",
  [authenticateToken],
  cors(corsOptions),
  postController.getPostsUser
);

router.patch("/:postId", postController.updateOnePost);

router.delete("/:postId", postController.deleteOnePost);

module.exports = router;
