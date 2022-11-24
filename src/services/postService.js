// In src/services/Postservice.js

// *** ADD *** (methods for all the posts that access data in db)
const Post = require("../database/Post");
const PostInterested = require("../database/PostInterested");
const User = require("../database/User");
const Review = require("../database/Review");
const ToReview = require("../database/ToReview");
const fun = require("../utils/functions");
const {
  insertAver,
  applyFilters,
  IsJsonString,
} = require("../utils/functions");
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
const moment = require("moment-timezone");
moment.tz.setDefault("Europe/Athens");
moment.locale("el");

const RFC_H = "DD MMM YYYY hh:mm";
const RFC_ONLYM = "DD MMM YYYY";

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
      const newPost = await Post.createNewPost(postToInsert);
      if (newPost != false)
        message = {
          status: 200,
          data: "Η υποβολή πραγματοποιήθηκε επιτυχώς.",
          postid: newPost.postid,
        };
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

    let curtime = moment().endOf("day").format("YYYY-MM-DD HH:mm:ss");
    let starttime = moment().startOf("day").format("YYYY-MM-DD HH:mm:ss");
    // console.log(curtime, starttime);
    // console.log("Moment curdate: ", cur, endDate);

    let dateOfInterest = moment();
    // console.log(dateOfInterest);

    var row = {
      email: req.body.data.email,
      postid: req.body.data.postid,
      date: dateOfInterest.format("YYYY MMM DD HH:mm:ss"),
      isVerified: false,
      isNotified: false,
      ownerNotified: false,
    };
    // console.log(row.date);
    //CHECK IF THE CLIENT IS THE OWNER OF THE POST
    const isPostOwner = await Post.isPostOwner(row);

    if (isPostOwner > 0) {
      throw 1;
    } else if (isPostOwner == null) {
      throw new Error("Something went wrong in checking the post owner");
    }

    const interest = await PostInterested.findOne(row.email, row.postid);
    if (interest === false) {
      throw new Error("Something went wrong with finding the interested");
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
      } else if (count >= 9) {
        return {
          status: 405,
          message:
            "Έχεις δηλώσει ήδη 10 φορές ενδιαφέρον. Δοκίμασε πάλι αύριο!",
        };
      } else {
        const inter = await PostInterested.createInterest(row);
        // console.log(inter.date);
        if (inter === false)
          throw new Error("Something went wrong with creation of interest!");
        //Section for notificaiton through firebase
        const postForFunction = await Post.findOne(row.postid);
        fun.toNotifyOwner(postForFunction.email, extra, row.postid);
        // return the right results to the controller
        console.log(row.date);
        return {
          status: 200,
          body: row,
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
      if (user === false) {
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
    if (filteredArray === false) {
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
    if (found === false) {
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
      if (user === false) {
        throw new Error("Error at finding user");
      }

      let reviewData = await insertAver(user);
      user.dataValues = { ...user.dataValues, ...reviewData };

      let interested = await PostInterested.findOne(post.email, post.postid);
      if (interested === false) {
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

const getPostPerId = async (req) => {
  try {
    var postid = req.query.postid;
    let email = req.body.extra;

    let post = await Post.findOne(postid);
    if (post === false) {
      throw new Error("Error at finding one post");
    }
    if (IsJsonString(post.moreplaces)) {
      post.moreplaces = JSON.parse(post.moreplaces);
    }
    //FIX ALL DATES
    post.dataValues.date = moment(post.dataValues.date).format(RFC_H);
    post.dataValues.startdate = moment(post.startdate).format(RFC_ONLYM);
    post.dataValues.enddate = moment(post.enddate).format(RFC_ONLYM);
    post.dataValues.returnStartDate = moment(post.returnStartDate).format(
      RFC_ONLYM
    );
    post.dataValues.returnEndDate = moment(post.returnEndDate).format(
      RFC_ONLYM
    );

    // CHECK IF THE SEARCHER IS INTERESTED
    let interested = false;
    const postInt = await PostInterested.findOne(email, postid);
    if (postInt === false) {
      throw new Error("Error at findning if user is interested for the post");
    }
    // if the searcher is interested then true
    postInt == null ? (interested = false) : (interested = true);

    // find creator of post
    const user = await User.findOneLight(post.email);
    if (user === false) {
      throw new Error("Error at finding the user of the post");
    }

    // get average and count from reviews and insert them into the object
    let extraData = await insertAver(user);
    user.dataValues = { ...user.dataValues, ...extraData };

    // change cardate format
    user.cardate = parseInt(user.cardate, 10);

    const response = {
      imagePath: "images/" + post.email + ".jpeg",
      interested: interested,
      post: post,
      user: user,
    };

    return { status: 200, data: response };
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const getInterestedPerUser = async (req) => {
  try {
    var data = req.body.data;
    let response;

    let found = await PostInterested.findAny(data.email);
    if (found === false) {
      throw new Error("Error at getting all the interests");
    }

    let array = [];
    for await (postI of found) {
      let curDate = moment();

      let post = await Post.findOneNotOwnerGTEToday(
        postI.postid,
        data.email,
        curDate
      );
      if (post != null) {
        if (IsJsonString(post.moreplaces)) {
          post.moreplaces = JSON.parse(post.moreplaces);
        }
        postI.dataValues.date = moment(postI.dataValues.date).format(RFC_H);
        post.dataValues.date = moment(post.dataValues.date).format(RFC_H);
        post.dataValues.startdate = moment(post.startdate).format(RFC_ONLYM);
        post.dataValues.enddate = moment(post.enddate).format(RFC_ONLYM);
        post.dataValues.returnStartDate = moment(post.returnStartDate).format(
          RFC_ONLYM
        );
        post.dataValues.returnEndDate = moment(post.returnEndDate).format(
          RFC_ONLYM
        );

        // sugxwneush post kai stoixeia endiaferomenou
        if (postI.isNotified === false) {
          let flag = await PostInterested.updateNotify(postI);
          if (flag == null) {
            throw new Error(
              "Error at updating the notify flag at postinterested"
            );
          }
          post.dataValues = {
            ...post.dataValues,
            ...{ withColor: true },
          };
        } else
          post.dataValues = {
            ...post.dataValues,
            ...{ withColor: false },
          };
        let tempPost = {
          ...post.dataValues,
          ...{ piid: postI.piid, dateOfInterest: postI.date },
        };

        let user = await User.findOneLight(post.dataValues.email);
        if (user === false) {
          throw new Error("Error at finding the user of the post");
        }

        let extraData = await insertAver(user);

        user.dataValues = { ...user.dataValues, ...extraData };
        let image = "images/" + post.email + ".jpeg";
        let results = {
          user: user,
          imagePath: image,
          post: tempPost,
          interested: true,
        };
        array.push(results);
      }
    }
    if (array.length == 0) {
      return { status: 404, data: "Nothing found" };
    } else {
      return {
        status: 200,
        data: {
          postUser: array,
          message: "No pagination",
        },
      };
    }
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const getIntPost = async (req) => {
  try {
    var data = req.body.data;
    var extra = req.body.extra;

    let posts = await Post.findOne(data.postid);
    if (posts === false) {
      throw new Error("Error at finding the requested post");
    }
    if (IsJsonString(posts.moreplaces)) {
      posts.moreplaces = JSON.parse(posts.moreplaces);
    }
    posts.dataValues.date = moment(posts.dataValues.date).format(RFC_H);
    posts.dataValues.startdate = moment(posts.startdate).format(RFC_ONLYM);
    posts.dataValues.enddate = moment(posts.enddate).format(RFC_ONLYM);
    posts.dataValues.returnStartDate = moment(posts.returnStartDate).format(
      RFC_ONLYM
    );
    posts.dataValues.returnEndDate = moment(posts.returnEndDate).format(
      RFC_ONLYM
    );
    let message = "Βρέθηκαν ενδιαφερόμενοι";
    let isAny = 0;
    let fullpost;
    let allUsers = [];

    const interested = await PostInterested.findAllPerId(posts.postid);
    if (interested === false) {
      throw new Error("Error at finding all the interested per ID");
    }
    // ean vrethikan endiaferomenoi
    if (interested.length != 0) {
      //gia kathe endiaferomeno
      for await (one of interested) {
        isAny++;
        const user = await User.findOneLight(one.email);
        if (user === false) throw new Error("Error at getting user");

        if (user != null) {
          user.dataValues.imagePath = "images/" + user.email + ".jpeg";
          let testdata = await insertAver(user);
          user.dataValues = { ...user.dataValues, ...testdata };
          user.dataValues.isVerified = one.isVerified;
          user.dataValues.piid = one.piid;
          // console.log(JSON.stringify(testdata));
          allUsers.push(user);
        } else {
          allUsers.push({
            email: "Fake User",
            fullname: one.email,
            car: "BMW",
            cardate: "2016",
            gender: "male",
            age: "25",
            photo: "1",
            imagePath: "images/lefterisevagelinos1996@gmail.com.jpeg",
            average: 5,
            count: 100,
            isVerified: one.isVerified,
            piid: one.piid,
          });
        }
        fullpost = { ...posts.dataValues };
      }
    }
    let image = "images/" + extra + ".jpeg";

    if (isAny > 0) {
      message = "Βρέθηκαν ενδιαφερόμενοι";
      let skipcount = 0;
      let takecount = 10;
      if (data.page > 1) skipcount = data.page * 10 - 10;
      let finalarr = _.take(_.drop(allUsers, skipcount), takecount);
      let mod = isAny % 10;
      // console.log(mod);
      let totallength = 1;
      mod == 0
        ? (totallength = isAny / 10)
        : (totallength = isAny / 10 - mod / 10 + 1);
      let response = {
        users: finalarr,
        post: fullpost,
        postImage: image,
        totalPages: totallength,
        totalLength: isAny,
        pageLength: finalarr.length,
        curPage: data.page,
        message: message,
      };
      return { status: 200, data: response };
    } else {
      message = "Δεν βρέθηκαν ενδιαφερόμενοι";
      return { status: 404, data: "Δεν βρέθηκαν ενδιαφερόμενοι" };
    }
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

const deletePost = async (req) => {
  try {
    let data = req.body.data;

    // delete the post
    let results = await Post.deleteOne(data.postid);
    if (results == null) {
      throw new Error("Error at deleting the post");
    }
    //delete the interested people of this post
    let intRes = await PostInterested.detroyAllPerPost(data.postid);
    if (intRes == null) {
      throw new Error("Error at deleteing the interests of the post");
    }

    if (results == 0) {
      return { status: 404, message: "Το ride δεν υπάρχει!" };
    } else {
      return { status: 200, message: "Το post διαγράφηκε!" };
    }
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

const deleteInterested = async (req) => {
  try {
    var data = req.body.data;
    const results = await PostInterested.deleteOne(data.piid);
    if (results == null) {
      throw new Error("Error at deleting the interest");
    }

    if (results == 0) {
      return { status: 404, message: "Ο ενδιαφερόμενος δεν υπάρχει!" };
    } else {
      return { status: 200, message: "Ο ενδιαφερόμενος διαγράφηκε!" };
    }
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

const verInterested = async (req) => {
  try {
    var data = req.body.data;
    //GETING THE DATA OF THE ROW THAT IS TO BE VERIFIED
    const results = await PostInterested.findOneById(data.piid);
    if (results === false) {
      throw new Error("Error at getting the interested data");
    }

    //GETTING THE SUM OF THE VERIFIED
    const allIntersted = await PostInterested.countVerified(data.postid);
    if (allIntersted == null) {
      throw new Error("Error at getting the count of the verified");
    }

    //GETTING THE DATA OF THE CORRESPONDIND POST
    const post = await Post.findOne(data.postid);
    if (!post) throw new Error("Error at finding the post");

    if (allIntersted < post.numseats || results.isVerified == true) {
      if (results.isVerified === false) {
        const updated = await PostInterested.updateVerify(results);
        if (!updated) throw new Error("Error at update verify flag");
        // Create possible review notification

        //Find if a possible review already exists
        const toReviewExists = await ToReview.findIfExists(
          post.email,
          results.email
        );
        if (!toReviewExists)
          throw new Error("Error at finding possible review");
        //If there is no possible review, create a new one
        if (toReviewExists == null) {
          const reviewMade = await ToReview.createOne(
            post.email,
            results.email,
            post.enddate,
            results.piid
          );
          if (!reviewMade) throw new Error("Error at creating possible review");
        } else {
          //if a review is done already check if the driver and the passenger have the right emails.

          //if the possibleReview has the post owner as the passenger, change the row so that the owner become the driver
          // and the interested user become the passenger.
          if (
            toReviewExists.driverEmail != post.email &&
            toReviewExists.driverEmail == results.email
          ) {
            const reversed = await ToReview.reverseUsers(
              toReviewExists,
              post.email,
              results.email,
              results.piid,
              post.enddate
            );
            if (!reversed)
              throw new Error(
                "Error at reversing the users of possible review"
              );
          }

          //if a review is done already by the owner of the post and the owner is marked as driver
          //update him as false so he can review again the same user
          if (
            toReviewExists.driverDone == true &&
            toReviewExists.driverEmail == post.email
          ) {
            const updated = await ToReview.resetFlags(
              toReviewExists,
              data.piid
            );
            if (!updated) throw new Error("Error at resseting the flags");
          }
        }
        fun.toNotifyTheVerified(results.email, post.postid, post.email);
        return { status: 200, message: "Επιτυχής έγκριση ενδιαφερόμενου!" };
      } else {
        //unverify the interested user
        const reseted = await PostInterested.resetFlags(results);
        if (!reseted) {
          throw new Error("Error at reseting the flag of interested");
        }
        // delete possible review notification
        // check if the unverification should destroy the possible review
        // get all posts of current passenger
        const passengerPosts = await Post.findAllOfUser(results.email);
        if (!passengerPosts)
          throw new Error("Error at finding all the posts of user");
        let flagCounter = 0;

        //Check if the current driver was ever interested for a post of current passenger
        for await (p of passengerPosts) {
          const intP = await PostInterested.getInterestedIfVerified(
            p.postid,
            post.email
          );
          if (intP === false)
            throw new Error("Error at geting the PP if verified");

          // if you find such a post, then update the possible review and dont delete it
          if (intP != null) {
            flagCounter++;
            const updated = await ToReview.updateInVer(
              p.email,
              intP.email,
              intP.piid,
              p.enddate,
              results.piid
            );

            if (updated === false)
              throw new Error("Error at updating the possible review");
          }
        }
        if (flagCounter == 0) {
          const destroyed = await ToReview.destroyOne(results.piid);
          if (!destroyed)
            throw new Error("Error at destroying the possible review");
        }
        return { status: 200, message: "Ακύρωση έγκρισης ενδιαφερόμενου!" };
      }
    } else {
      return {
        status: 405,
        message: "Έχεις καλύψει πλήρως τις διαθέσιμες θέσεις",
      };
    }
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

const handleFavourite = async (req) => {
  try {
    let email = req.body.extra;
    let postid = req.body.data.postid;

    const countAll = await Post.countFavourites(email);
    if (countAll == null)
      throw new Error("Error at counting the favourites of user");

    const post = await Post.findOne(postid);
    if (post === false) throw new Error("Error at finding the post of user");

    if (post.isFavourite == true) {
      const deletedFav = await Post.deleteFavourite(postid);
      if (deletedFav === false)
        throw new Error("Error at deleting the favourite");
      return {
        status: 200,
        message: "Το ride αφαιρέθηκε από τα αγαπημένα σου!",
      };
    }
    if (countAll < 5) {
      const newFav = await Post.makeFavourite(postid);
      if (newFav === false) throw new Error("Error at declaring new favourite");
      return { status: 200, message: "To ride προστέθηκε στα αγαπημένα σου" };
    } else {
      return { status: 405, message: "Έχεις ήδη 5 αγαπημένα ride" };
    }
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

const getFavourites = async (req) => {
  try {
    let email = req.body.extra;
    moment.locale("en");

    const user = await User.findOneLight(email);
    if (user === false) throw new Error("Error at finding the user data");

    let extraData = await insertAver(user);
    user.dataValues = { ...user.dataValues, ...extraData };

    const allFavourites = await Post.findAllFavourites(email);
    if (allFavourites === false)
      throw new Error("Error at getting all the favourites");
    else if (allFavourites.length == 0) {
      return { status: 404, message: "Δεν βρέθηκαν αγαπημένα Rides" };
    }

    let allResults = [];
    for await (post of allFavourites) {
      post.dataValues.date = moment(post.dataValues.date).format(
        "DD MMM YYYY HH:mm"
      );

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

      allResults.push({
        user: user,
        post: post,
        imagePath: "images/" + post.email + ".jpeg",
        interested: false,
      });
    }
    return { status: 200, data: allResults };
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

module.exports = {
  getAllPosts,
  getOnePost,
  createNewPost,
  updateOnePost,
  deleteOnePost,
  interested,
  searchPosts,
  getPostsUser,
  getPostPerId,
  getInterestedPerUser,
  getIntPost,
  deletePost,
  deleteInterested,
  verInterested,
  handleFavourite,
  getFavourites,
};
