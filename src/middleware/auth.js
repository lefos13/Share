//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();
// get the values from the .env file
const { TOKEN_KEY } = process.env;
// END OF SECTION (ENV VAR)
//jwt
const jwt = require("jsonwebtoken");

/**
 * This is a middleware function in JavaScript that authenticates a token in the request header and
 * adds the email to the request body if the token is valid.
 * @param req - req stands for request and it is an object that contains information about the HTTP
 * request that was made, such as the request headers, request parameters, request body, etc.
 * @param res - `res` is the response object that is used to send a response back to the client making
 * the request. It contains methods such as `send`, `json`, `status`, etc. that are used to send
 * different types of responses.
 * @param next - next is a function that is called to pass control to the next middleware function in
 * the stack. If an error occurs or the request/response cycle is complete, it should be called to move
 * to the next middleware function.
 * @returns The function `authenticateToken` is not returning anything explicitly. It is either calling
 * the `next()` function to proceed to the next middleware function or sending a response using
 * `res.sendStatus()` or `res.json()`.
 */
const authenticateToken = (req, res, next) => {
  try {
    // const lang = req.headers["Accept-language"];
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) {
      // console.log("Unauthorized try to connect to an api");
      return res.sendStatus(401);
    }

    jwt.verify(token, TOKEN_KEY, (err, email) => {
      if (err)
        return res.json({
          body: null,
          message: "Token expired or didnt even exist",
        });
      else {
        req.body["extra"] = email.email;
        console.log("User", email.email, "Authenticated!");
      }
      next();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

module.exports = { authenticateToken };
