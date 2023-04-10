// In src/controllers/UserController.js
const groupService = require("../services/groupService");
const { determineLang } = require("../utils/functions");

const createGroup = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await groupService.sendReport(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  createGroup,
};
