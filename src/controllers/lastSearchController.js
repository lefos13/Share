// In src/controllers/lastSearchController.js
const lastSearchService = require("../services/lastSearchService");
const { determineLang } = require("../utils/functions");

const addFavouriteSearch = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await lastSearchService.addFavouriteSearch(req);
    if (data.status == 500) {
      throw msg;
    }
    res.status(data.status).json({ message: data.message, data: data.data });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const getAllSearches = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await lastSearchService.getAllSearches(req);
    if (data.status == 500) {
      throw msg;
    }
    res.status(data.status).json({ message: data.message, data: data.data });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

const deleteFavourite = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await lastSearchService.deleteFavourite(req);
    if (data.status == 500) {
      throw msg;
    }
    res.status(data.status).json({ message: data.message, data: data.data });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  addFavouriteSearch,
  getAllSearches,
  deleteFavourite,
};
