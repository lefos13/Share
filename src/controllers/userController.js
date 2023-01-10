// In src/controllers/UserController.js
const { result } = require("lodash");
const { checkPass } = require("../database/utils");
const userService = require("../services/userService");
const fs = require("fs");
const { determineLang } = require("../utils/functions");

const createNewUser = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const newUser = await userService.createNewUser(req);
    if (newUser.status == 500) throw msg;
    res.status(newUser.status).json(newUser.data);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const createToken = async (req, res) => {
  try {
    // console.log(req.headers);
    let msg = await determineLang(req);
    // console.log(msg);
    let newToken = await userService.createToken(req);
    if (newToken.status == 200) res.status(newToken.status).json(newToken.data);
    else if (newToken.status == 500) throw msg;
    else res.status(newToken.status).json({ message: newToken.data });
  } catch (msg) {
    // console.log(error);
    res.status(500).json({ message: msg.errorMessage });
  }
};

const updateOneUser = async (req, res) => {
  try {
    const msg = await determineLang(req);
    const updatedUser = await userService.updateOneUser(req);
    if (updatedUser.status == 500) {
      throw msg;
    }
    res.status(updatedUser.status).json({ message: updatedUser.message });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const updatePass = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const updatedUser = await userService.updatePass(req);
    if (updatedUser.status == 500) throw msg;
    res.status(updatedUser.status).json({ message: updatedUser.message });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
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
    let msg = await determineLang(req);
    const results = await userService.login(req);
    if (results.status == 500) {
      throw msg;
    }
    res.status(results.status).json({
      message: results.message,
      user: results.user,
      forceUpdate: results.forceUpdate,
    });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const sendOtp = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const results = await userService.sendOtp(req);
    if (results.status == 500) throw msg;
    res
      .status(results.status)
      .json({ message: results.message, otp: results.otp });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const searchUser = async (req, res) => {
  try {
    const msg = await determineLang(req);
    const results = await userService.searchUser(req);
    if (results.status == 500) throw msg;
    else if (results.status == 404) {
      res.status(404).json({ message: results.message });
    }
    res.status(results.status).json(results.data);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const notifyMe = async (req, res) => {
  try {
    const msg = await determineLang(req);
    const results = await userService.notifyMe(req);
    if (results.status == 500) throw msg;
    else if (results.status == 404)
      res.status(404).json({ message: results.message });
    else res.status(results.status).json(results.data);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const loginThirdParty = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const results = await userService.loginThirdParty(req);
    if (results.status == 500) throw msg;
    else res.status(results.status).json(results.response);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const deleteUser = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const results = await userService.deleteUser(req);
    if (results.status == 500) throw msg;
    else res.status(results.status).json(results.response);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  deleteUser,
  createNewUser,
  updateOneUser,
  createToken,
  updatePass,
  userVerify,
  login,
  sendOtp,
  searchUser,
  notifyMe,
  loginThirdParty,
};
