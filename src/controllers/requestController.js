// In src/controllers/UserController.js
const { determineLang } = require("../utils/functions");
const requestService = require("../services/requestService");

const createRequest = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await requestService.createRequest(req);
    if (data.status == 200) {
      res
        .status(data.status)
        .json({ request: data.request, message: data.message });
    } else if (data.status == 500) {
      throw msg;
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const getRequests = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await requestService.getRequests(req);
    if (data.status == 200) {
      res.status(data.status).json({ requests: data.requests });
    } else if (data.status == 500) {
      throw msg;
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const deleteRequest = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await requestService.deleteRequest(req);
    if (data.status == 500) throw msg;
    res.status(data.status).json({ message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  createRequest,
  getRequests,
  deleteRequest,
};
