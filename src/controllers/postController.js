// In src/controllers/postController.js
const postService = require("../services/postService");
const getAllPosts = (req, res) => {
  const allPosts = postService.getAllPosts();
  res.send("Get all workouts");
};

const getOnePost = (req, res) => {
  const onePost = postService.getOnePost();
  res.send("Get an existing workout");
};

const createNewPost = async (req, res) => {
  const newPost = await postService.createNewPost(req.body.data);
  res.status(newPost.status).json({ message: newPost.data });
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
      res.json({ body: data.body, message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
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

module.exports = {
  getAllPosts,
  getOnePost,
  createNewPost,
  updateOnePost,
  deleteOnePost,
  interested,
  searchPosts,
};
