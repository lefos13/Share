// In src/controllers/UserController.js
const {} = require("../database/utils");
const requestService = require("../services/requestService");

const createRequest = async (req, res) => {
  try {
    const data = await requestService.createRequest(req);
    if (data.status == 200) {
      res
        .status(data.status)
        .json({ request: data.request, message: data.message });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const getRequests = async (req, res) => {
  try {
    const data = await requestService.getRequests(req);
    if (data.status == 200) {
      res.status(data.status).json({ requests: data.requests });
    } else {
      res.status(data.status).json({ message: data.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const data = await requestService.deleteRequest(req);
    res.status(data.status).json({ message: data.message });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

module.exports = {
  createRequest,
  getRequests,
  deleteRequest,
};
