//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
// END OF SECTION (ENV VAR)
const { Sequelize, DataTypes, fn } = require("sequelize");
const { Op } = require("sequelize");
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

const moment = require("moment");
const Review = require("../database/Review");
const User = require("../database/User");
const ToReview = require("../database/ToReview");
const _ = require("lodash");

const getReviews = async (req) => {
  try {
    var data = req.body.data;
    let query = {
      attributes:
        // [sequelize.fn("count", sequelize.col("rating")), "counter"],
        [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
      where: {
        email: data.email,
      },
    };

    const revfound = await Review.findAndCountAll(query);
    if (revfound === false)
      throw new Error("Something went wrong with counting the reviews");
    var rows = revfound.rows;
    var total = null;
    for await (r of rows) {
      total = r.toJSON().total;
    }
    var average = total / revfound.count;
    console.log("total: " + total + " count: " + revfound.count);

    query = {
      where: {
        email: data.email,
      },
    };

    const rev = await Review.findAndCountAll(query);
    if (rev === false)
      throw new Error("Something went wrong with getting all the reviews");

    let counter = 0;
    // FIX DATES AND ADD MORE VALUES INTO THE OBJECTS
    for await (r of rev.rows) {
      r.dataValues.createdAt = moment(r.dataValues.createdAt).format(
        "DD MMM YYYY"
      );
      r.dataValues.updatedAt = moment(r.dataValues.updatedAt).format(
        "DD MMM YYYY"
      );

      r.dataValues.revId = counter;
      counter++;
      let user = await User.findOneUser(r.emailreviewer);
      if (user === false) {
        throw new Error(
          "Something went wrong with finding the user of the a review"
        );
      } else if (user == null) {
        //UNREALISTIC CASE
        r.dataValues["fullname"] = "Ο χρήστης δεν υπάρχει";
        r.dataValues.imagepath = "Η εικόνα δεν υπάρχει";
      } else {
        r.dataValues["fullname"] = user.fullname;
        r.dataValues.imagepath = "images/" + r.emailreviewer + ".jpeg";
      }
    }
    //PAGINATION
    var skipcount = 0;
    var takecount = 20;
    if (data.page > 1) skipcount = data.page * 20 - 20;
    var finalarr = _.take(_.drop(rev.rows, skipcount), takecount);
    let mod = rev.count % 20;
    // console.log(mod);
    let totallength = 1;
    mod == 0
      ? (totallength = rev.count / 20)
      : (totallength = rev.count / 20 - mod / 20 + 1);

    const response = {
      body: {
        reviews: finalarr,
        average: average,
        total_pages: totallength,
        page_length: finalarr.length,
      },
      message: "Αξιολογήσεις, Page: " + data.page,
    };
    return { status: 200, response: response };
  } catch (error) {
    console.log(error);
    return { status: 500, response: "Kάτι πήγε στραβά!" };
  }
};

const createReview = async (req) => {
  try {
    var data = req.body.data;
    let query = {
      attributes:
        // [sequelize.fn("count", sequelize.col("rating")), "counter"],
        [[sequelize.fn("sum", sequelize.col("rating")), "total"]],
      where: {
        email: data.email,
      },
    };
    const revExist = await Review.findOne(data.email, data.emailreviewer);
    if (revExist === false) {
      throw new Error("Something went wrong with finding an existing review");
    } else if (revExist == null) {
      //CASE THAT THE REVIEW DOESNT EXIST
      const review = await Review.saveReview(data);
      if (review === false) {
        throw new Error("Something went wrong with creating the review");
      }
      // get the possible review that led the user to create the particular review
      const possibleReview = await ToReview.findForCreatingReview(review);
      if (possibleReview === false) {
        throw new Error(
          "Something went wrong with getting the possible review"
        );
      } else if (possibleReview == null) {
        throw new Error(
          "H KATAGRAFH STON PINAKA TWN PITHANWN REVIEWS DEN UPARXEI === BUG"
        );
      }
      // if the reviewer is the driver then update the driver
      if (possibleReview.driverEmail == review.emailreviewer) {
        // console.log("Driver done review");
        await ToReview.setDriverDone(possibleReview);
      } else {
        //IF THE REVIEWER IS THE PASSENGER UPDATE THE PASSENGER
        await ToReview.setPassengerDone(possibleReview);
      }

      let results = await Review.findAndCountAll(query);
      if (results === false) {
        throw new Error(
          "Something went wrong with finding/counting the reviews"
        );
      }
      var rows = results.rows;

      var total = null;
      for await (r of rows) {
        // console.log(results.count);
        total = r.toJSON().total;
      }
      var average = total / results.count;
      let response = {
        review: review,
        average: average,
        count: results.count,
        message: "Η αξιολόγηση έγινε επιτυχώς!",
      };
      return { status: 200, data: response };
    } else {
      // CASE THAT THE REVIEW IS TO BE UPDATED.
      //Section where i update the toreview row!!!!!!!!!!!!1
      const possibleReview = await ToReview.findForCreatingReview(data);
      if (possibleReview === false) {
        throw new Error(
          "Something went wrong at finding possible Review at updating the review"
        );
      }

      if (possibleReview == null) {
        throw new Error(" H KATAGRAFH STON PINAKA TO REVIEWS DEN UPARXEI");
      }

      const flag = await Review.updateReview(revExist, data);
      if (flag === false) {
        throw new Error("Something went wrong with updating the review");
      }

      if (possibleReview.driverEmail == data.emailreviewer) {
        await ToReview.setDriverDone(possibleReview);
      } else {
        //if the reviewer is the passenger update the passenger
        await ToReview.setPassengerDone(possibleReview);
      }

      const results = await Review.findAndCountAll(query);
      if (results === false) {
        throw new Error(
          "Something went wrong at getting the sum and count of reviews (updating"
        );
      }
      var rows = results.rows;

      var total = null;
      for await (r of rows) {
        // console.log(results.count);
        total = r.toJSON().total;
      }
      var average = total / results.count;
      let response = {
        review: revExist,
        average: average,
        count: results.count,
        message: "Η αξιολόγηση ανανεώθηκε επιτυχώς!",
      };
      return { status: 200, data: response };
    }
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

module.exports = { getReviews, createReview };
