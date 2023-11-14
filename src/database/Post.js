// inside src/database/Post.js

//ENVIROMENTAL VAR

// END OF SECTION (ENV VAR)

const { pushNotifications } = require("../utils/functions");
// code for db
const { Op } = require("sequelize");

const Posts = require("../modules/post");
const fs = require("fs");
const moment = require("moment");

/**
 * The function `countPosts` counts the number of posts made by a user on the current day.
 * @param user - The `user` parameter is the email of the user whose posts you want to count for the
 * current day.
 * @returns The function `countPosts` returns the number of posts made by a user on the current day.
 */
const countPosts = async (user) => {
  try {
    //moment conversions
    var startDay = moment();
    startDay.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    var endDay = moment();
    endDay.set({ hour: 23, minute: 59, second: 59, millisecond: 0 });

    const numOfPosts = await Posts.count({
      where: {
        date: { [Op.between]: [startDay, endDay] },
        email: user,
      },
    }).catch((err) => {
      throw err;
    });
    return numOfPosts;
  } catch (error) {
    console.error(error);
    return false;
  }
  // code to count posts of a user the current day
};

// *** ADD ***
/**
 * The function `createNewPost` creates a new post with data, image, and a message, and performs
 * various operations such as updating the image file and sending push notifications.
 * @param data - The `data` parameter is an object that contains the information for the new post. It
 * could include properties such as the post title, content, author, etc.
 * @param image - The `image` parameter is the image data that you want to associate with the post. It
 * can be either a base64 encoded string representing the image or a URL pointing to an existing image
 * file.
 * @param msg - The `msg` parameter is a message that will be used for push notifications. It is passed
 * to the `pushNotifications` function along with the `post` object.
 * @returns The function `createNewPost` returns the `post` object if the post is successfully created,
 * and `false` if there is an error.
 */
const createNewPost = async (data, image, msg) => {
  try {
    var postdate = moment();
    data.date = postdate;

    const post = await Posts.create(data).catch((err) => {
      throw err;
    });
    if (image == null) {
      console.log("POSTING WITH NO IMAGE");
    } else if (image.includes("postimages")) {
      //create new image file from the existing
      console.log("CASE OF REPOSTING WITH IMAGE");
      const array = image.split("/");
      const oldPostId = array[1].split(".")[0];
      fs.copyFile(
        "postImages/" + oldPostId + ".jpeg",
        "postImages/" + post.postid + ".jpeg",
        (err) => {
          if (err) throw err;
          console.log("Image was copied to destination.txt");
        }
      );
      await post.update({ image: "postimages/" + post.postid + ".jpeg" });
    } else {
      console.log(`CASE OF PLAIN POSTING WITH IMAGE`);
      const postid = post.postid;
      //create new image file from the base64 string
      const base64 = image;
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync("postImages/" + postid + ".jpeg", buffer);
      await post.update({ image: "postimages/" + postid + ".jpeg" });
    }
    //get current date

    //!!!!!!!!!!!!!!!!!!!!!!!!!!!
    //Firebase newRide notification

    pushNotifications(post, msg);
    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
  // logic for the creation of post in db
};

/**
 * The function `isPostOwner` checks if a given row belongs to the owner of a post.
 * @param row - The `row` parameter is an object that contains the properties `postid` and `email`.
 * These properties are used to check if a post with the given `postid` and `email` exists in the
 * `Posts` table.
 * @returns the result of the `checkPost` variable, which is the count of posts that match the given
 * `postid` and `email` in the `Posts` table.
 */
const isPostOwner = async (row) => {
  try {
    const checkPost = await Posts.count({
      where: {
        postid: row.postid,
        email: row.email,
      },
    }).catch((err) => {
      throw err;
    });
    return checkPost;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * This is an asynchronous function that finds a post by its ID and returns it, or returns false if
 * there is an error.
 * @param postid - The parameter `postid` is the unique identifier of a post that is being searched for
 * in the database table `Posts`. The function `findOne` uses this parameter to search for a specific
 * post in the database and returns the post object if it exists, or `false` if it does not.
 * @returns The function `findOne` returns either the `postForFunction` object if the `Posts.findOne`
 * query is successful, or `false` if there is an error caught in the `try-catch` block.
 */
const findOne = async (postid) => {
  try {
    const postForFunction = await Posts.findOne({
      where: {
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });

    return postForFunction;
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * The function `findOneNotOwnerGTEToday` finds a post that is not owned by a specific email and has an
 * end date greater than or equal to a given date.
 * @param postid - The postid parameter is the unique identifier of a post. It is used to filter the
 * Posts table and find a specific post with the given postid.
 * @param email - The email parameter is the email address of the user who is not the owner of the
 * post.
 * @param date - The `date` parameter represents a specific date.
 * @returns the value of the variable "post".
 */
const findOneNotOwnerGTEToday = async (postid, email, date) => {
  try {
    let post = await Posts.findOne({
      where: {
        postid: postid,
        email: { [Op.ne]: email },
        [Op.or]: [
          { enddate: { [Op.gte]: date } },
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.gte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `findAndCountAll` is an asynchronous function that finds and counts all posts based on
 * a given query.
 * @param query - The `query` parameter is an object that contains the options for the
 * `findAndCountAll` method. It can include properties such as `where`, `attributes`, `include`,
 * `order`, `limit`, and `offset`, which are used to specify the conditions, attributes to include,
 * associations
 * @returns The function `findAndCountAll` returns the result of the `Posts.findAndCountAll(query)`
 * method call.
 */
const findAndCountAll = async (query) => {
  try {
    const found = await Posts.findAndCountAll(query).catch((err) => {
      throw err;
    });
    return found;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * The function `countAllPastHalfYear` counts the number of posts with a given email and end date
 * greater than or equal to today.
 * @param email - The email parameter is the email address of the user for whom we want to count the
 * posts.
 * @param today - The "today" parameter represents the current date. It is used to filter the posts
 * based on their end date. Only the posts with an end date greater than or equal to today will be
 * counted.
 * @returns The function `countAllPastHalfYear` returns the count of posts where the email matches the
 * given email and the end date is greater than or equal to the given today's date.
 */
const countAllPastHalfYear = async (email, today) => {
  try {
    const count = await Posts.count({
      where: {
        email: email,
        enddate: { [Op.gte]: today },
      },
    }).catch((err) => {
      throw err;
    });
    return count;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * The function `findAllPastHalfYear` finds and counts all posts that meet certain criteria based on
 * the provided email and today's date.
 * @param email - The `email` parameter is the email address used to filter the posts.
 * @param today - The `today` parameter represents the current date. It is used to filter the posts
 * based on their end date and start date.
 * @returns The function `findAllPastHalfYear` returns the result of the `Posts.findAndCountAll` query.
 */
const findAllPastHalfYear = async (email, today) => {
  try {
    const all = await Posts.findAndCountAll({
      where: {
        email: email,
        [Op.or]: [
          { enddate: { [Op.gte]: today } },
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.gte]: today } }],
          },
        ],
      },
      order: [["date", "DESC"]],
    }).catch((err) => {
      throw err;
    });
    return all;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `countFavourites` counts the number of posts that are marked as favourites for a given
 * email.
 * @param email - The email parameter is the email address of the user for whom we want to count the
 * number of favorite posts.
 * @returns The function `countFavourites` returns the count of posts where the email matches the
 * provided email and the `isFavourite` property is set to `true`.
 */
const countFavourites = async (email) => {
  try {
    const countFavourites = await Posts.count({
      where: {
        email: email,
        isFavourite: true,
      },
    }).catch((err) => {
      throw err;
    });
    return countFavourites;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * The countPostsQuery function counts the number of posts that match a given query.
 * @param query - The `query` parameter is an object that specifies the conditions for counting the
 * posts. It is used as an argument for the `count` method of the `Posts` model. The `count` method
 * returns the number of documents in the `Posts` collection that match the specified query.
 * @returns The function `countPostsQuery` returns the value of `countPosts` if the query is
 * successful. If there is an error, it returns `null`.
 */
const countPostsQuery = async (query) => {
  try {
    const countPosts = await Posts.count(query).catch((err) => {
      throw err;
    });
    return countPosts;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * The function `deleteOne` deletes a post from a database table called `Posts` based on the provided
 * `postid`.
 * @param postid - The `postid` parameter is the identifier of the post that you want to delete from
 * the database.
 * @returns The function `deleteOne` returns the number of deleted posts.
 */
const deleteOne = async (postid) => {
  try {
    const countPosts = await Posts.destroy({
      where: {
        postid: postid,
      },
    }).catch((err) => {
      throw err;
    });
    return countPosts;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * The function `findAllOfUser` is an asynchronous function that retrieves all posts associated with a
 * given email address.
 * @param email - The email parameter is the email address of the user for whom you want to find all
 * posts.
 * @returns The function `findAllOfUser` returns the `passengerPosts` if the operation is successful.
 * If there is an error, it returns `false`.
 */
const findAllOfUser = async (email) => {
  try {
    const passengerPosts = await Posts.findAll({
      where: {
        email: email,
      },
    }).catch((err) => {
      throw err;
    });
    return passengerPosts;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `deleteFavourite` updates a post's `isFavourite` and `favouriteDate` properties to
 * false and null respectively, given a postid, and returns true if successful, false otherwise.
 * @param postid - The postid is the unique identifier of the post that needs to be updated.
 * @returns The function `deleteFavourite` returns a boolean value. It returns `true` if the update
 * operation is successful, and `false` if there is an error.
 */
const deleteFavourite = async (postid) => {
  try {
    await Posts.update(
      {
        isFavourite: false,
        favouriteDate: null,
      },
      { where: { postid: postid } }
    ).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `makeFavourite` updates a post's `isFavourite` and `favouriteDate` properties to mark
 * it as a favorite.
 * @param postid - The postid parameter is the unique identifier of the post that you want to mark as a
 * favorite.
 * @returns a boolean value. If the update operation is successful, it will return `true`. If there is
 * an error, it will return `false`.
 */
const makeFavourite = async (postid) => {
  try {
    let curDate = moment();
    await Posts.update(
      {
        isFavourite: true,
        favouriteDate: curDate,
      },
      { where: { postid: postid } }
    ).catch((err) => {
      throw err;
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `findAllFavourites` retrieves all posts that are marked as favourites for a given email
 * address, ordered by the date they were marked as favourites.
 * @param email - The email parameter is the email address of the user for whom we want to find all the
 * favourite posts.
 * @returns The function `findAllFavourites` returns either an array of all favourite posts for the
 * given email, or `false` if there is an error.
 */
const findAllFavourites = async (email) => {
  try {
    const allFavourites = await Posts.findAll({
      where: {
        email: email,
        isFavourite: true,
      },
      order: [["favouriteDate", "DESC"]],
    }).catch((err) => {
      throw err;
    });

    return allFavourites;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `findExpired` is an asynchronous function that takes a `postid` and a `date` as
 * parameters and tries to find a post that is not expired based on the given `date`.
 * @param postid - The `postid` parameter is the identifier of the post you want to find. It is used to
 * search for a specific post in the database.
 * @param date - The `date` parameter represents the current date. It is used to check if the end date
 * of a post is greater than or equal to the current date, or if the post has a null end date and the
 * start date is greater than or equal to the current date.
 * @returns The function `findExpired` returns the `post` object if a post is found that matches the
 * given `postid` and `date` criteria. If an error occurs during the execution of the function, it
 * returns `false`.
 */
const findExpired = async (postid, date) => {
  try {
    const post = await Posts.findOne({
      where: {
        postid: postid,
        [Op.or]: [
          { enddate: { [Op.gte]: date } }, //enddate megalutero tou curdate
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.gte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `findAllExpired` is an asynchronous function that takes an email and a date as
 * parameters and returns all posts that have expired based on the given email and date.
 * @param email - The email parameter is the email address of the user for whom you want to find
 * expired posts.
 * @param date - The `date` parameter represents the current date. It is used to find all expired posts
 * based on their end date.
 * @returns The function `findAllExpired` returns a promise that resolves to an array of `post`
 * objects.
 */
const findAllExpired = async (email, date) => {
  try {
    const post = await Posts.findAll({
      where: {
        email: email,
        [Op.or]: [
          { enddate: { [Op.lte]: date } }, //enddate megalutero tou curdate
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.lte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `findAllActive` retrieves all active posts based on the provided email and date.
 * @param email - The email parameter is the email address of the user for whom you want to find active
 * posts.
 * @param date - The `date` parameter represents a specific date.
 * @returns the result of the `Posts.findAll` query.
 */
const findAllActive = async (email, date) => {
  try {
    const post = await Posts.findAll({
      where: {
        email: email,
        [Op.or]: [
          { enddate: { [Op.gte]: date } }, //enddate megalutero tou curdate
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.gte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `destroyAllPerIds` is an asynchronous function that deletes posts from a database based
 * on their postids.
 * @param postids - The parameter `postids` is an array of post IDs that you want to delete from the
 * database.
 * @returns The function `destroyAllPerIds` returns the result of the `Posts.destroy` operation.
 */
const destroyAllPerIds = async (postids) => {
  try {
    const post = await Posts.destroy({
      where: {
        postid: postids,
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

/**
 * The function `globalAllExpired` retrieves all posts that have expired or have a start date before
 * the current date.
 * @returns The function `globalAllExpired` returns a promise that resolves to an array of `post`
 * objects.
 */
const globalAllExpired = async () => {
  try {
    let date = moment();
    const post = await Posts.findAll({
      where: {
        [Op.or]: [
          { enddate: { [Op.lte]: date } }, //enddate megalutero tou curdate
          {
            [Op.and]: [{ enddate: null }, { startdate: { [Op.lte]: date } }],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return post;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getAllExpiredToday = async () => {
  try {
    console.log("Getting all expired posts today");
    let curDate = moment();
    let yesterday = moment().subtract(1, "day");
    console.log(`Current date: ${curDate} and yesterday: ${yesterday}`);

    const posts = await Posts.findAll({
      where: {
        [Op.and]: [
          {
            //post is expired compared to current date
            [Op.or]: [
              { enddate: { [Op.lte]: date } },
              {
                [Op.and]: [
                  { enddate: null },
                  { startdate: { [Op.lte]: date } },
                ],
              },
            ],
          },
          {
            //post wasnt expired yesterday
            [Op.or]: [
              { enddate: { [Op.gte]: yesterday } },
              {
                [Op.and]: [
                  { enddate: null },
                  { startdate: { [Op.gte]: yesterday } },
                ],
              },
            ],
          },
        ],
      },
    }).catch((err) => {
      throw err;
    });

    return posts;
  } catch (error) {
    console.log("Error at getAllExpiredToday: ", error);
    return new Error("Error at database layer");
  }
};
module.exports = {
  globalAllExpired,
  destroyAllPerIds,
  findAllExpired,
  findAllActive,
  getAllExpiredToday,
  findExpired,
  createNewPost,
  countPosts,
  isPostOwner,
  findOne,
  findAndCountAll,
  countAllPastHalfYear,
  countFavourites,
  countPostsQuery,
  findAllPastHalfYear,
  findOneNotOwnerGTEToday,
  deleteOne,
  findAllOfUser,
  deleteFavourite,
  makeFavourite,
  findAllFavourites,
};
