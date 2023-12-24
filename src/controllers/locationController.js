// In src/controllers/UserController.js
const locationService = require("../services/locationService");
const { determineLang } = require("../utils/functions");

const createLocationGroup = async (req, res) => {
  try {
    const msg = await determineLang(req);
    const data = await locationService.createLocationGroup(req);

    if (data.status === 200) {
      res.status(200).json({ message: "Location group created!", data: data.data });
    } else if (data.status === 405) {
      res.status(405).json({ message: "location group creation failed" });
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
