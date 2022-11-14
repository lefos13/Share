// In src/controllers/reviewController.js

const reviewService = require("../services/reviewService");

const getReviews = async (req, res) => {
  try {
    const data = await reviewService.getReviews(req);
    if (data.status == 500) {
      throw "Error";
    }
    res.json(data.response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};
const createReview = async (req, res) => {
  try {
    const data = await reviewService.createReview(req);
    if (data.status == 500) {
      throw "Error";
    }
    res.json(data.data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Κάτι πήγε στραβά!" });
  }
};

module.exports = {
  getReviews,
  createReview,
};
