// In src/controllers/UserController.js
const groupService = require("../services/groupService");
const { determineLang } = require("../utils/functions");

/**
 * These are controllers for a group service that handle creating, getting, deleting, changing name,
 * leaving, accepting, and declining invitations for groups.
 * @param req - The request object containing information about the HTTP request made by the client.
 * @param res - `res` is the response object that is used to send the HTTP response back to the client.
 * It contains methods like `status()` to set the HTTP status code, `json()` to send a JSON response,
 * and `send()` to send a plain text response.
 */
const createGroup = async (req, res) => {
  try {
    const msg = await determineLang(req);
    const data = await groupService.createGroup(req);

    if (data.status === 200) {
      res.status(200).json({ message: data.message, data: data.data });
    } else if (data.status === 405) {
      res.status(405).json({ message: data.message });
    } else {
      throw msg;
    }
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
    if (data.status === 405) {
      res.status(405).json({ message: data.message, postid: data.postid });
    } else if (data.status === 500) throw msg;
    else res.status(200).json({ message: data.message });
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
    if (data.status === 405) {
      res.status(405).json({ message: data.message, postid: data.postid });
    } else if (data.status === 500) throw msg;
    else res.status(200).json({ message: data.message });
  } catch (error) {
    console.error("Controller leaveGroup unhandled error!");
    res.status(500).json({ message: error.errorMessage });
  }
};

//accept invitation controller
const acceptInvitation = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.acceptInvitation(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message, data: data.data });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

//decline invitation controller
const declineInvitation = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.declineInvitation(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  declineInvitation,
  acceptInvitation,
  leaveGroup,
  changeName,
  deleteGroup,
  createGroup,
  getGroups,
};
