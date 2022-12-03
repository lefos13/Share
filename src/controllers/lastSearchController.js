// In src/controllers/lastSearchController.js
const lastSearchService = require("../services/lastSearchService");

const sendReport = async (req, res) => {
  try {
    const data = await lastSearchService.sendReport(req);
    res.status(200).json({ message: data.message });
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

module.exports = {
  sendReport,
};
