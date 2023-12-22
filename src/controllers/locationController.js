// In src/controllers/UserController.js
const locationService = require("../services/locationService");
const { determineLang } = require("../utils/functions");

const createLocationGroup = async (req, res) => {
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

module.exports = {
  createLocationGroup,
};
