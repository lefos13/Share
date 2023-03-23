// inside src/database/ToReview.js

// END OF SECTION (ENV VAR)

// code for db
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");

const Users = require("../modules/user");
const Posts = require("../modules/post");
const PostInterested = require("../modules/postinterested");
const Reviews = require("../modules/review");
const SearchPost = require("../modules/searchPost");
const ToReview = require("../modules/toreview");
const FcmToken = require("../modules/fcmtoken");
const moment = require("moment");
// import "moment/locale/gr";
// moment.locale("gr");
// ==== code for db

// *** ADD ***
const {} = require("./utils");

const findForProfile = async (searcherEmail, profileEmail, dateToCheck) => {
  try {
    const possibleReviews = await ToReview.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { driverEmail: searcherEmail },
              { passengerEmail: searcherEmail },
            ],
          },
          {
            [Op.or]: [
              { driverEmail: profileEmail },
              { passengerEmail: profileEmail },
            ],
          },
        ],
        endDate: { [Op.lte]: dateToCheck },
      },
    }).catch((err) => {
      throw err;
    });
    return possibleReviews;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findForCreatingReview = async (review) => {
  try {
    const possibleReview = await ToReview.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { driverEmail: review.emailreviewer },
              { passengerEmail: review.emailreviewer },
            ],
          },
          {
            [Op.or]: [
              { driverEmail: review.email },
              { passengerEmail: review.email },
            ],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return possibleReview;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const setDriverDone = async (possibleReview) => {
  try {
    await possibleReview
      .update({
        driverDone: true,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const setPassengerDone = async (possibleReview) => {
  try {
    await possibleReview
      .update({
        passengerDone: true,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findIfExists = async (email1, email2) => {
  try {
    const toReviewExists = await ToReview.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [{ driverEmail: email1 }, { passengerEmail: email1 }],
          },
          {
            [Op.or]: [{ driverEmail: email2 }, { passengerEmail: email2 }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });
    return toReviewExists;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const createOne = async (driverEmail, passengerEmail, endDate, piid) => {
  try {
    const newToReview = await ToReview.create({
      driverEmail: driverEmail,
      passengerEmail: passengerEmail,
      endDate: endDate,
      piid: piid,
    }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const reverseUsers = async (
  toReview,
  driverEmail,
  passengerEmail,
  piid,
  enddate
) => {
  try {
    const newToReview = await toReview
      .update({
        driverEmail: driverEmail,
        passengerEmail: passengerEmail,
        piid: piid,
        endDate: enddate,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const resetFlags = async (toReviewExists, piid, enddate) => {
  try {
    await toReviewExists
      .update({
        driverDone: false,
        passengerDone: false,
        enddate: enddate,
        piid: piid,
      })
      .catch((err) => {
        throw err;
      });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const denyReview = async (toReviewExists) => {
  try {
    await toReviewExists
      .update({
        driverDone: true,
        passengerDone: true,
      })
      .catch((err) => {
        throw err;
      });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const newReview = async (toReviewExists, date, piid) => {
  try {
    await toReviewExists
      .update({
        driverDone: false,
        passengerDone: false,
        endDate: date,
        piid: piid,
      })
      .catch((err) => {
        throw err;
      });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const newReviewAndReverse = async (
  toReviewExists,
  newDriver,
  newPassenger,
  date,
  piid
) => {
  try {
    await toReviewExists
      .update({
        driverEmail: newDriver,
        passengerEmail: newPassenger,
        driverDone: false,
        passengerDone: false,
        endDate: date,
        piid: piid,
      })
      .catch((err) => {
        throw err;
      });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const updateInVer = async (
  driverEmail,
  passengerEmail,
  piid,
  enddate,
  oldpiid
) => {
  try {
    ToReview.update(
      {
        driverEmail: driverEmail,
        passengerEmail: passengerEmail,
        piid: piid,
        endDate: enddate,
        passengerDone: true,
        driverDone: true,
      },
      {
        where: {
          piid: oldpiid,
        },
      }
    ).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const deleteOne = async (piid) => {
  try {
    await ToReview.destroy({
      where: {
        piid: piid,
      },
    }).catch((err) => {
      throw err;
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findAllMyFinished = async (passengerEmail, driverEmail, dateToCheck) => {
  try {
    let possibleReviews = await ToReview.findAll({
      where: {
        [Op.or]: [
          { passengerEmail: passengerEmail },
          { driverEmail: driverEmail },
        ],
        endDate: { [Op.lte]: dateToCheck },
      },
    }).catch((err) => {
      throw err;
    });

    return possibleReviews;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const deleteAllPerUser = async (email) => {
  try {
    await ToReview.destroy({
      where: {
        [Op.or]: [{ passengerEmail: email }, { driverEmail: email }],
      },
    }).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const findAllPerUser = async (email) => {
  try {
    const toReviews = await ToReview.findAll({
      where: {
        [Op.or]: [
          {
            driverEmail: email,
          },
          {
            passengerEmail: email,
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });
  } catch (error) {
    console.error(error);
    return false;
  }
};
module.exports = {
  denyReview,
  newReviewAndReverse,
  newReview,
  deleteAllPerUser,
  findForProfile,
  findForCreatingReview,
  setDriverDone,
  setPassengerDone,
  findIfExists,
  createOne,
  reverseUsers,
  resetFlags,
  updateInVer,
  deleteOne,
  findAllMyFinished,
  findAllPerUser,
};
