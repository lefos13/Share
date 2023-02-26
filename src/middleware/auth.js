//ENVIROMENTAL VAR
const dotenv = require("dotenv");
dotenv.config();
// get the values from the .env file
const { TOKEN_KEY } = process.env;
// END OF SECTION (ENV VAR)
//jwt
const jwt = require("jsonwebtoken");

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
