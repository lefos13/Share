const schedule = require("node-schedule");
const Post = require("../database/Post");
const Conv = require("../database/ConvUsers");
const { increaseAsValues } = require("../database/User");
const {
  destroyPerArrayIds,
  getAllVerifiedInterestsPerPost,
} = require("../database/PostInterested");
const moment = require("moment");
var _ = require("lodash");

/**
 * The `runJobs` function schedules two jobs in JavaScript, one to delete old posts from the database
 * every day at 12:45 AM, and another to delete expired conversations every day at 12:30 AM.
 */
const runJobs = function () {
  //run once a time to delete old posts from the database 45 0 * * *
  /* The above code is scheduling a job to run at 12:45 AM every day to delete all posts that are expired
    for more than 3 months. It first finds all the expired posts, then checks if any post is expired for
    more than 3 months. If it is, it deletes the post along with all those who were interested in it. It
    also writes the deleted post's data to a JSON file in the "deleted" folder. Finally, it destroys all
    the interested posts that were deleted along with the expired post. */
  const deleteOldPosts = schedule.scheduleJob("45 0 * * *", async function () {
    // const deleteOldPosts = schedule.scheduleJob("*/1 * * * * *", async function () {
    try {
      //find all posts that are expired
      let posts = await Post.globalAllExpired();

      //check if any post is expired more than 3 months and delete it along with all those that was interested to them
      let curDate = moment();
      for await (let post of posts) {
        let endDate =
          post.enddate != null ? moment(post.enddate) : moment(post.startdate);

        let months = curDate.diff(endDate, "months");
        let postIds = [];
        if (months >= 3) {
          postIds.push(post.postid);

          var json = JSON.stringify(post);
          fs.writeFileSync(
            "deleted/" + curDate + "_" + post.postid + ".json",
            json,
            "UTF-8"
          );

          post.destroy();
        }

        if (postIds.length > 0) {
          let intDestroyed = await destroyPerArrayIds(postIds);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  // */1 * * * * Every minute
  // */5 * * * * * Every 5 seconds
  // 30 0 * * * Every 12:30 after midnight
  /* The above code is scheduling a job to run every day at 12:30 AM. The job checks for expired
      conversations and deletes them from the database if any are found. It uses the Moment.js library to
      get the current time and date, and the Lodash library to iterate over the expired conversations and
      delete them. */
  const deleteConversations = schedule.scheduleJob(
    "30 0 * * *", //every 12:30 after midnight
    async function () {
      try {
        let curTime = moment().format("hh:mm:ss");

        let dateToCheck = moment().format("YYYY-MM-DD");
        const expired = await Conv.getAllExpired(dateToCheck);
        if (expired.length > 0) {
          _.forEach(expired, (val) => {
            val.destroy().catch((err) => {
              throw err;
            });
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  );

  const addNewDriversPassengers = schedule.scheduleJob(
    // "30 0 * * *", //every 12:30 after midnight
    "*/10 * * * * *",
    async () => {
      try {
        console.log(`Running cron job: addNewDriversPassengers`);
        //get posts that expired today
        const posts = await Post.getAllExpiredToday();
        //get users that are involved in the post
        if (posts.length > 0) {
          console.log(`found ${posts.length} posts`);
          //loop through all posts
          posts.forEach((post) => {
            const driver = post.email;
            //get passengers
            const postInterests = getAllVerifiedInterestsPerPost(post.postid);

            if (postInterests.length > 0) {
              increaseAsValues(driver, "driver");
              //get all emails of verified passengers
              postInterests.forEach((interest) => {
                increaseAsValues(interest.email, "passenger");
              });
            } else {
              console.log(
                `Found no verified passengers for post ${post.postid}`
              );
            }
          });
        } else {
          console.log(
            `No posts found that expired today and was active yesterday`
          );
        }

        //check if there are any passengers and ignore those posts with no passengers
        const ifPassengers = null;
        //increase the number of asDriver and asPassenger values to the corresponding collumns in db
        //...
      } catch (error) {
        console.log(
          "ERROR AT CRON JOB FOR ADDING ASDRIVER AND ASPASSENGER: ",
          error
        );
      }
    }
  );
};
module.exports = {
  runJobs,
};
