// In src/controllers/lastSearchController.js
const lastSearchService = require("../services/lastSearchService");

const addFavouriteSearch = async (req, res) => {
  try {
    const data = await lastSearchService.addFavouriteSearch(req);
    res.status(200).json({ message: data.message });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: data.message });
  }
};

const getAllSearches = async (req, res) => {
  try {
    const data = await lastSearchService.getAllSearches(req);
    res.status(200).json({ message: data.message, data: data.data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: data.message });
  }
};

const deleteFavourite = async (req, res) => {
  try {
    const data = await lastSearchService.deleteFavourite(req);
    res.status(200).json({ message: data.message, data: data.data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: data.message });
  }
};

module.exports = {
  addFavouriteSearch,
  getAllSearches,
  deleteFavourite,
};
