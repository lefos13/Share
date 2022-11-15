// In src/services/Postservice.js

// *** ADD *** (methods for all the posts that access data in db)
const Post = require("../database/Post");
const PostInterested = require("../database/PostInterested");
const User = require("../database/User");
const Review = require("../database/Review");
const fun = require("../utils/functions");
const { insertAver, applyFilters } = require("../utils/functions");
const _ = require("lodash");
// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
const { Op } = require("sequelize");
const { Sequelize, DataTypes, fn } = require("sequelize");
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

const getAllPosts = () => {
  return;
};

const getOnePost = () => {
  return;
};
// create post service
const createNewPost = async (data) => {
  try {
    const postToInsert = {
      ...data,
    };
    let message = null;
    //Check if the user has done more than three posts current day.
    const counter = await Post.countPosts(postToInsert.email);
    // console.log("Inside postService: " + counter);
    if (counter < 3) {
      //do it
      const newPost = Post.createNewPost(postToInsert);
      if (newPost != false)
        message = { status: 200, data: "Η υποβολή πραγματοποιήθηκε επιτυχώς." };
      else message = { status: 500, data: "Κάτι πήγε λάθος" };
    } else {
      message = {
        status: 405,
        data: "Έχεις κάνει ήδη 3 post σήμερα! Προσπάθησε ξανά αύριο.",
      };
    }
    return message;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const updateOnePost = () => {
  return;
};

const deleteOnePost = () => {
  return;
};

const interested = async (req) => {
  try {
    let extra = req.body.extra;
    // console.log(req.query);
    var results = null;

    let curtime = moment().format("YYYY-MM-DD HH:m:s");
    let starttime = moment().subtract(1, "day").format("YYYY-MM-DD HH:m:s");
    // console.log("Moment curdate: ", cur, endDate);

    var row = {
      email: req.body.data.email,
      postid: req.body.data.postid,
      date: curtime,
      isVerified: false,
      isNotified: false,
      ownerNotified: false,
    };
    row["date"] = curtime;
    //CHECK IF THE CLIENT IS THE OWNER OF THE POST
    const isPostOwner = await Post.isPostOwner(row);

    if (isPostOwner > 0) {
      throw 1;
    } else if (isPostOwner == null) {
      throw new Error("Something went wrong in checking the post owner");
    }

    const interest = await PostInterested.findOne(row.email, row.postid);
    if (interest == false) {
      throw new Error("Something went wrong!");
    }
    if (interest == null) {
      const count = await PostInterested.getCountOfUser(
        row.email,
        starttime,
        curtime
      );
      if (count == null) {
        throw new Error(
          "Something went wrong at counting the interests of user"
        );
      } else if (count == 9) {
        return {
          status: 405,
          message:
            "Έχεις δηλώσει ήδη 10 φορές ενδιαφέρον. Δοκίμασε πάλι αύριο!",
        };
      } else {
        const inter = await PostInterested.createInterest(row);
        if (inter == false)
          throw new Error("Something went wrong with creation of interest!");
        results = inter;
        //Section for notificaiton through firebase
        const postForFunction = await Post.findOne(row.postid);
        fun.toNotifyOwner(postForFunction.email, extra, row.postid);
        // return the right results to the controller
        return {
          status: 200,
          body: results,
          message: "Ο οδηγός θα ενημερωθεί πως ενδιαφέρθηκες",
        };
      }
    } else {
      const deleted = await PostInterested.destroyOne(row.email, row.postid);
      if (deleted == true) {
        return { status: 200, message: "Ακυρώθηκε το ενδιαφέρον σου!" };
      } else {
        throw new Error("Something went wrong with canceling the interest");
      }
    }
    return true;
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const searchPosts = async (req) => {
  try {
    var data = req.body.data;
    if (data.startdate == null) {
      data.startdate = moment().format("YYYY-MM-DD");
      data.enddate = moment().add(1, "months").format("YYYY-MM-DD");
    }
    let query = {
      where: {
        // minimum cost
        costperseat: { [Op.lte]: data.cost },
        // email different than one that do the search
        email: { [Op.ne]: data.email },
        [Op.and]: [
          // arxikos proorismos h syntetagmenes
          {
            [Op.or]: [
              { startplace: data.startplace },
              { startcoord: data.startcoord },
            ],
          },
          // elegxos na peftei h arxikh hmeromhnia tou post anamesa sthn arxikh kai telikh toy xrhsth
          // ή na peftei h telikh hmeromhnia tou post anamesa sthn arxikh h telikh hmeromhnia tou xrhsth
          // ή na peftei h arxikh KAI h telikh hmeromhnia toy xrhsth na peftei anamesa sthn arxikh KAI telikh hmeromhnia tou post
          {
            [Op.or]: [
              { startdate: { [Op.between]: [data.startdate, data.enddate] } },
              { enddate: { [Op.between]: [data.startdate, data.enddate] } },
              {
                [Op.and]: [
                  { startdate: { [Op.gte]: data.startdate } },
                  { enddate: { [Op.lte]: data.enddate } },
                ],
              },
            ],
          },
          // elegxos an o telikos proorismos einai proorismos pou uparxei entos twn stasewn tou xrhsth
          // h an o telikos proorismos tou xrhsth einai telikos proorismos tou post antistoixa oi syntetagmenes
          {
            [Op.or]: [
              // sequelize.literal(
              //   `json_contains(moreplaces->'$[*].place', json_array("` +
              //     data.endplace +
              //     `")) OR json_contains(moreplaces->'$[*].placecoords', json_array("` +
              //     data.endcoord +
              //     `"))`
              // ),
              sequelize.literal(
                `JSON_CONTAINS(JSON_EXTRACT(moreplaces, "$[*].place"), '"` +
                  data.endplace +
                  `"') OR json_contains(JSON_EXTRACT(moreplaces, '$[*].placecoords'), '"` +
                  data.endcoord +
                  `"')`
              ),
              {
                [Op.or]: [
                  { endplace: data.endplace },
                  { endcoord: data.endcoord },
                ],
              },
            ],
          },
        ],
      },
      order: [["date", "DESC"]],
    };
    var results = null;
    var array = [];

    // ==========  if startdate is null, then search from the current date to a month after today.

    let found = await Post.findAndCountAll(query);
    if (found.count == 0) {
      return { status: 404, message: "Δεν υπάρχει καμία διαδρομή!" };
    } else if (found == null) {
      throw new Error("Something went wrong in searching the posts");
    }

    for await (fnd of found.rows) {
      if (IsJsonString(fnd.moreplaces)) {
        fnd.moreplaces = JSON.parse(fnd.moreplaces);

        fnd.dataValues.startdate = moment(fnd.dataValues.startdate).format(
          "DD MMM YYYY"
        );
        fnd.dataValues.enddate = moment(fnd.dataValues.enddate).format(
          "DD MMM YYYY"
        );
        // console.log(fnd.dataValues.startdate, fnd.dataValues.enddate);
      }

      let userQuery = {
        attributes: {
          exclude: ["password", "verified", "facebook", "instagram", "mobile"],
        },
        where: {
          email: fnd.email,
        },
      };

      const user = await User.findOneUserQuery(userQuery);
      if (user == false) {
        throw new Error(
          "Something went wrong with finding the user of each post"
        );
      }
      var flag;
      // insert the review average and count inside the object of the user
      let extraData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...extraData };
      console.log(user.dataValues);

      // check if the user is interested in the specific post
      let interested = await PostInterested.findOne(data.email, fnd.postid);

      if (interested == null) {
        flag = false;
      } else {
        flag = true;
      }
      results = {
        user: user.toJSON(),
        imagePath: "images/" + fnd.email + ".jpeg",
        post: fnd,
        interested: flag,
      };
      array.push(results);
    }

    let filteredArray = await applyFilters(data, array);
    if (filteredArray == false) {
      throw err;
    }
    var skipcount = 0;
    var takecount = 10;
    if (data.page > 1) skipcount = data.page * 10 - 10;
    var finalarr = _.take(_.drop(filteredArray, skipcount), takecount);
    //fix the dates of return and date of creation
    for await (ps of finalarr) {
      ps.post.dataValues.date = moment(ps.post.dataValues.date).format(
        "DD MMM YYYY"
      );
      ps.post.dataValues.returnStartDate = moment(
        ps.post.dataValues.returnStartDate
      ).format("DD MMM YYYY");
      ps.post.dataValues.returnEndDate = moment(
        ps.post.dataValues.returnEndDate
      ).format("DD MMM YYYY");
    }
    //CHECK IF ARRAY IS EMPTY AND SEND THE RESULTS
    if (finalarr.length == 0) {
      return { status: 404, message: "Δεν υπάρχει καμία διαδρομή!" };
    } else {
      // console.log(array[0].post.newdate);
      var mod = array.length % 10;
      var totallength = 1;
      mod == 0
        ? (totallength = array.length / 10)
        : (totallength = array.length / 10 - mod / 10 + 1);
      results = {
        postUser: finalarr,
        totalPages: totallength,
        pageLength: finalarr.length,
        // test: array,
      };
    }
    return { status: 200, body: results, message: "Βρέθηκαν Rides" };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const getPostsUser = async (req) => {
  try {
    var data = req.body.data;
    let array = [];

    let today = moment().subtract(6, "months");
    let found = await Post.findAllPastHalfYear(data.email, today);
    if (found == false) {
      throw new Error("Error with finding the posts of the user");
    }

    let rows = found.rows;
    let count = found.count;
    //PAGINATION
    let skipcount = 0;
    let takecount = 10;
    if (data.page > 1) skipcount = data.page * 10 - 10;
    let finalarr = _.take(_.drop(rows, skipcount), takecount);
    let mod = count % 10;
    let totallength = 1;
    mod == 0
      ? (totallength = count / 10)
      : (totallength = count / 10 - mod / 10 + 1);

    for await (post of finalarr) {
      if (IsJsonString(post.moreplaces)) {
        post.moreplaces = JSON.parse(post.moreplaces);
      }

      post.dataValues.date = moment(post.dataValues.date).format(
        "DD MMM YYYY HH:mm"
      );
      console.log(post.dataValues.date);

      post.dataValues.startdate = moment(post.dataValues.startdate).format(
        "DD MMM YYYY"
      );
      post.dataValues.enddate = moment(post.dataValues.enddate).format(
        "DD MMM YYYY"
      );

      post.dataValues.returnStartDate = moment(
        post.dataValues.returnStartDate
      ).format("DD MMM YYYY");

      post.dataValues.returnEndDate = moment(
        post.dataValues.returnEndDate
      ).format("DD MMM YYYY");
      let image = "images/" + post.email + ".jpeg";

      let rows = found.rows;
      let count = found.count;
      //get the data of user
      let user = await User.findOneLight(post.email);
      if (user == false) {
        throw new Error("Error at finding user");
      }

      let reviewData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...reviewData };

      let interested = await PostInterested.findOne(post.email, post.postid);
      if (interested == false) {
        throw new Error("Error at getting the interested of a post");
      }
      let flag;
      interested == null ? (flag = false) : (flag = true);
      const countInt = await PostInterested.countInterestedOfPost(
        post.postid,
        data.email
      );

      if (countInt == null) {
        throw new Error("Error at counting the interested of a single post");
      }

      let moreUsers = false;

      if (countInt > 0) moreUsers = true;

      let results = {
        user: user,
        imagePath: image,
        post: post,
        hasMoreUsers: moreUsers,
        countUsers: countInt,
        interested: flag,
      };
      array.push(results);
    }

    let response = {
      postUser: array,
      totalPages: totallength,
      totalLength: count,
      pageLength: finalarr.length,
    };

    return { status: 200, data: response };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

module.exports = {
  getAllPosts,
  getOnePost,
  createNewPost,
  updateOnePost,
  deleteOnePost,
  interested,
  searchPosts,
  getPostsUser,
};
