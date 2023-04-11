// In src/controllers/UserController.js
const groupService = require("../services/groupService");
const { determineLang } = require("../utils/functions");

const createGroup = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.createGroup(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message, data: data.data });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const getGroups = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.getGroups(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message, data: data.data });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const deleteGroup = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.deleteGroup(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

//change group name controller
const changeName = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.changeName(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

//remove member from group
const leaveGroup = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.leaveGroup(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  leaveGroup,
  changeName,
  deleteGroup,
  createGroup,
  getGroups,
};
