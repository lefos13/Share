// In src/controllers/UserController.js
const { result } = require("lodash");
const { checkPass } = require("../database/utils");
const userService = require("../services/userService");
const getAllUsers = (req, res) => {
  const allUsers = userService.getAllUsers();
  res.send("Get all workouts");
};

const getOneUser = (req, res) => {
  const oneUser = userService.getOneUser();
  res.send("Get an existing workout");
};

const createNewUser = async (req, res) => {
  try {
    const newUser = await userService.createNewUser(req);
    // console.log("controller: ", newUser);
    if (newUser.status == 500) throw "Error";
    res.status(newUser.status).json(newUser.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const createToken = async (req, res) => {
  try {
    const newToken = await userService.createToken(req);
    if (newToken.status == 200) res.status(newToken.status).json(newToken.data);
    else res.status(newToken.status).json({ message: newToken.data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const updateOneUser = async (req, res) => {
  try {
    const updatedUser = await userService.updateOneUser(req);
    res.status(updatedUser.status).json({ message: updatedUser.message });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const updatePass = async (req, res) => {
  try {
    const updatedUser = await userService.updatePass(req);
    res.status(updatedUser.status).json({ message: updatedUser.message });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const deleteOneUser = (req, res) => {
  const deletedUser = userService.deleteOneUser();
  res.send("Delete an existing workout");
};

const userVerify = async (req, res) => {
  try {
    const updatedUser = await userService.userVerify(req);
    res.status(updatedUser.status).json({ message: updatedUser.message });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const login = async (req, res) => {
  try {
    const results = await userService.login(req);
    res.status(results.status).json({
      message: results.message,
      user: results.user,
      forceUpdate: results.forceUpdate,
    });
  } catch (error) {
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const sendOtp = async (req, res) => {
  try {
    const results = await userService.sendOtp(req);
    res
      .status(results.status)
      .json({ message: results.message, otp: results.otp });
  } catch (error) {
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const searchUser = async (req, res) => {
  try {
    const results = await userService.searchUser(req);
    res.status(results.status).json(results.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const notifyMe = async (req, res) => {
  try {
    const results = await userService.notifyMe(req);
    if (results.status == 500) throw "error";
    else if (results.status == 404)
      res.status(404).json({ message: results.message });
    else res.status(results.status).json(results.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const loginThirdParty = async (req, res) => {
  try {
    const results = await userService.loginThirdParty(req);
    if (results.status == 500) throw "error";
    else res.status(results.status).json(results.response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

module.exports = {
  getAllUsers,
  getOneUser,
  createNewUser,
  updateOneUser,
  deleteOneUser,
  createToken,
  updatePass,
  userVerify,
  login,
  sendOtp,
  searchUser,
  notifyMe,
  loginThirdParty,
};
