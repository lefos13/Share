// In src/controllers/reviewController.js

const reviewService = require("../services/reviewService");
const { determineLang } = require("../utils/functions");

const getReviews = async (req, res) => {
  try {
    let msg = await determineLang(req);
    // console.log(msg);
    const data = await reviewService.getReviews(req);
    if (data.status == 500) {
      throw msg;
    }
    res.json(data.response);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};
const createReview = async (req, res) => {
  try {
    let msg = await determineLang(req);
    // console.log(msg);
    const data = await reviewService.createReview(req);
    if (data.status == 500) {
      throw msg;
    }
    res.json(data.data);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  getReviews,
  createReview,
};
