//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();

// get the values from the .env file
const { EMAIL, PASSEMAIL, HOST, USER, PASS, DATABASE, TOKEN_KEY, GOOGLE_KEY } =
  process.env;
// END OF SECTION (ENV VAR)

const moment = require("moment");
const Request = require("../database/Request");
const { fixDate } = require("../database/utils");

const createRequest = async (req) => {
  try {
    let data = req.body.data;
    let email = req.body.extra;

    let curTime = moment();
    data.created_at = curTime;
    data.email = email;

    //get how many requests the user has done
    const count = await Request.requestCount(email);
    const countDub1 = await Request.requestCountDub(
      email,
      data.startcoord,
      data.endcoord
    );
    console.log(count, countDub1);
    if (count == null || countDub1 == null) {
      throw new Error("Error at counting the requests");
    }

    //CHECK IF THE USER HAS MORE THAN THREE REQUESTS OR HAS THE SAME REQUEST
    if (count < 3 && countDub1 == 0) {
      //CREATE THE REQUEST
      const request = await Request.saveRequest(data);
      // console.log(request);
      if (request === false) {
        throw new Error("Error at creation of request");
      }
      return { status: 200, request: request, message: "Επιτυχής δημιουργία!" };
    } else if (countDub1 > 0) {
      return {
        status: 405,
        message: "Έχεις ήδη αίτηση διαδρομής με αυτές τις τοποθεσίες! ",
      };
    } else {
      return { status: 405, message: "Έχεις ήδη τρεις διαδρομές που ψάχνεις!" };
    }
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

const getRequests = async (req) => {
  try {
    let email = req.body.extra;
    const requests = await Request.getAll(email);
    if (requests === false) {
      throw new Error("Error at getting the requests");
    }
    if (requests.length > 0) {
      for await (r of requests) {
        const fixedDate = await fixDate(new Date(r.created_at));
        r.dataValues.created_at = fixedDate.dateMonthDay;
      }
      return { status: 200, requests: requests };
    } else {
      return { status: 404, message: "Δεν βρέθηκαν αναζητήσεις διαδρομών" };
    }
  } catch (error) {
    console.log(Error);
    return { status: 500 };
  }
};

const deleteRequest = async (req) => {
  try {
    //CHECK
    let data = req.body.data;
    let email = req.body.extra;

    const reqDel = await Request.deleteOne(data.postSearchId, email);
    if (reqDel == null) {
      throw new Error("Error at deleting the request");
    } else if (reqDel == 1) {
      return { status: 200, message: "Η διαγραφή έγινε επιτυχώς!" };
    } else {
      return { status: 404, message: "Το request δεν υπάρχει!" };
    }
  } catch (error) {
    console.log(error);
    return { status: 500, message: "Κάτι πήγε στραβά!" };
  }
};

module.exports = { createRequest, getRequests, deleteRequest };
