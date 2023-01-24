// In src/controllers/UserController.js
const neutralService = require("../services/neutralService");
const { determineLang } = require("../utils/functions");

const sendReport = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await neutralService.sendReport(req);
    if (data.status != 200) throw msg;
    res.status(200).json({ message: data.message });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const getTerms = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await neutralService.getTerms(req);
    if (data.status == 500) throw msg;
    res.sendFile(data.file);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const moreMessages = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await neutralService.moreMessages(req);
    if (data.status != 200) throw msg;
    res.json({
      messages: data.data.finalMessages,
      messagesLeft: data.data.messagesLeft,
    });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  moreMessages,
  sendReport,
  getTerms,
};
