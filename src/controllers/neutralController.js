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
    res.status(500).json({ message: error.errorMessage });
  }
};

const webSendReport = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await neutralService.webSendReport(req);
    if (data.status != 200) throw "msg";
    res.status(200).json({ message: data.message });
  } catch (error) {
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
    res.status(500).json({ message: error.errorMessage });
  }
};

const moreMessagesGroups = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await neutralService.moreMessagesGroups(req);
    if (data.status != 200) throw msg;
    res.json({
      messages: data.data.finalMessages,
      messagesLeft: data.data.messagesLeft,
    });
  } catch (error) {
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
    res.status(500).json({ message: error.errorMessage });
  }
};

const getNotifications = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await neutralService.getNotifications(req);
    if (data.status != 200) throw msg;
    res.json({
      notifications: data.notifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const readNotification = async (req, res) => {
  try {
    let msg = await determineLang(req);

    const data = await neutralService.readNotification(req);

    if (data.status != 200) throw msg;
    res.json({
      notification: data.data,
    });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

const deleteNotification = async (req, res) => {
  try {
    let msg = await determineLang(req);
    const data = await neutralService.deleteNotification(req);
    if (data.status != 200) throw msg;
    res.json({
      message: msg.notificationDeleted,
    });
  } catch (error) {
    res.status(500).json({ message: error.errorMessage });
  }
};

module.exports = {
  deleteNotification,
  readNotification,
  getNotifications,
  webSendReport,
  moreMessages,
  sendReport,
  getTerms,
  moreMessagesGroups,
};
