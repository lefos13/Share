// In src/controllers/postController.js
const postService = require("../services/postService");
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");
const getAllPosts = (req, res) => {
  const allPosts = postService.getAllPosts();
  res.send("Get all workouts");
};

const getOnePost = (req, res) => {
  const onePost = postService.getOnePost();
  res.send("Get an existing workout");
};

const createNewPost = async (req, res) => {
  try {
    const newPost = await postService.createNewPost(req.body.data);
    if (newPost.status == 500) throw "error";
    res
      .status(newPost.status)
      .json({ message: newPost.data, postid: newPost.postid });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const updateOnePost = (req, res) => {
  const updatedPost = postService.updateOnePost();
  res.send("Update an existing workout");
};

const deleteOnePost = (req, res) => {
  const deletedPost = postService.deleteOnePost();
  res.send("Delete an existing workout");
};

const interested = async (req, res) => {
  try {
    // console.log("asd");
    const data = await postService.interested(req);
    if (data.status == 200) {
      // console.log(data.body.date);
      res.json({ body: data.body, message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const searchPosts = async (req, res) => {
  try {
    let data = await postService.searchPosts(req);
    res.status(data.status).json({ body: data.body, message: data.message });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const getPostsUser = async (req, res) => {
  try {
    let data = await postService.getPostsUser(req);
    if (data.status == 500) {
      throw "Error";
    }
    res.status(data.status).json(data.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const getPostPerId = async (req, res) => {
  try {
    let data = await postService.getPostPerId(req);
    if (data.status == 500) {
      throw "Error";
    }
    res.status(data.status).json(data.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const getInterestedPerUser = async (req, res) => {
  try {
    let data = await postService.getInterestedPerUser(req);
    if (data.status == 500) {
      throw "Error";
    } else if (data.status == 404) {
      res.status(404).json({ message: data.data });
    } else {
      res.status(data.status).json(data.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const getIntPost = async (req, res) => {
  try {
    let data = await postService.getIntPost(req);
    if (data.status == 500) {
      throw "Error";
    } else if (data.status == 404) {
      res.status(404).json({ message: data.data });
    } else {
      res.status(data.status).json(data.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const deletePost = async (req, res) => {
  try {
    let data = await postService.deletePost(req);
    if (data.status == 500) {
      throw "Error";
    } else if (data.status == 404) {
      res.status(404).json({ message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const deleteInterested = async (req, res) => {
  try {
    let data = await postService.deleteInterested(req);
    if (data.status == 500) {
      throw "Error";
    } else if (data.status == 404) {
      res.status(404).json({ message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const verInterested = async (req, res) => {
  try {
    let data = await postService.verInterested(req);
    if (data.status == 500) {
      throw "Error";
    } else if (data.status == 405) {
      res.status(405).json({ message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const handleFavourite = async (req, res) => {
  try {
    let data = await postService.handleFavourite(req);
    if (data.status == 500) {
      throw "Error";
    } else if (data.status == 405) {
      res.status(405).json({ message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const getFavourites = async (req, res) => {
  try {
    let data = await postService.getFavourites(req);
    if (data.status == 500) {
      throw "Error";
    } else if (data.status == 404) {
      res.status(404).json({ message: data.message });
    } else {
      res.status(data.status).json({ favourites: data.data });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

module.exports = {
  getAllPosts,
  getOnePost,
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
};
