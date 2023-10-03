// In src/controllers/postController.js
const postService = require("../services/postService");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");

const { determineLang } = require("../utils/functions");
// const { MultiFactorSettings } = require("firebase-admin/lib/auth/user-record");

const createNewPost = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const newPost = await postService.createNewPost(req.body.data, req);
    if (newPost.status == 500) throw msg;
    res
      .status(newPost.status)
      .json({ message: newPost.data, postid: newPost.postid });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const updateOnePost = (req, res) => {
  const updatedPost = postService.updateOnePost();
  res.send("Update an existing post", updatedPost);
};

const deleteOnePost = (req, res) => {
  const deletedPost = postService.deleteOnePost();
  res.send("Delete an existing workout");
};

const interested = async (req, res) => {
  try {
    let msg = await determineLang(req);

    const data = await postService.interested(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 200) {
      res.json({ body: data.body, message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const searchPosts = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.searchPosts(req);
    if (data.status == 500) throw msg;
    res.status(data.status).json({ body: data.body, message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const getPostsUser = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.getPostsUser(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 404) {
      res.status(404).json({ message: data.message });
    }
    res.status(data.status).json(data.data);
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const feedScreen = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.feedScreen(req);
    if (data.status == 500) {
      throw msg;
    }
    res.status(data.status).json({ body: data.body, message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const feedAll = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.feedAll(req);
    if (data.status == 500) {
      throw msg;
    }
    res.status(data.status).json({ body: data.body, message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const getPostPerId = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.getPostPerId(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 404) {
      res.status(404).json({ message: msg.noRide });
    }
    res.status(data.status).json(data.data);
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const getInterestedPerUser = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.getInterestedPerUser(req);
    if (data.status == 500) {
      throw msg;
      // throw "asd";
    } else if (data.status == 404) {
      res.status(404).json({ message: data.data });
    } else {
      res.status(data.status).json(data.data);
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const getIntPost = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.getIntPost(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 404) {
      res.status(404).json({ message: data.data });
    } else {
      res.status(data.status).json(data.data);
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const deletePost = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.deletePost(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 404) {
      res.status(404).json({ message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const deleteInterested = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.deleteInterested(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 404) {
      res.status(404).json({ message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const verInterested = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.verInterested(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 405) {
      res.status(405).json({ message: data.message });
    } else {
      res.status(data.status).json({
        message: data.message,
        chatCreated: data.chatCreated,
        conversationId: data.conversationId,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const handleFavourite = async (req, res) => {
  try {
    let data = await postService.handleFavourite(req);
    let msg = await determineLang(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 405) {
      res.status(405).json({ message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const getFavourites = async (req, res) => {
  try {
    let msg = await determineLang(req);
    let data = await postService.getFavourites(req);
    if (data.status == 500) {
      throw msg;
    } else if (data.status == 404) {
      res.status(404).json({ message: data.message });
    } else {
      res.status(data.status).json({ favourites: data.data });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  createNewPost,
  updateOnePost,
  deleteOnePost,
  interested,
  searchPosts,
  getPostsUser,
  getPostPerId,
  getInterestedPerUser,
  getIntPost,
  deletePost,
  deleteInterested,
  verInterested,
  handleFavourite,
  getFavourites,
  feedScreen,
  feedAll,
};
