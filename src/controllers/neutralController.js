// In src/controllers/UserController.js
const neutralService = require("../services/neutralService");

const sendReport = async (req, res) => {
  try {
    const data = await neutralService.sendReport(req);
    res.status(200).json({ message: data.message });
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

const getTerms = async (req, res) => {
  try {
    const data = await neutralService.getTerms(req);
    if (data.status == 500) throw "Error";
    res.sendFile(data.file);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

module.exports = {
  sendReport,
  getTerms,
};
