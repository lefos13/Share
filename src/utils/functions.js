const nodemailer = require("nodemailer");

const dotenv = require("dotenv");
dotenv.config();
// get the values from the .env file
const { EMAIL, PASSEMAIL } = process.env;

module.exports = {
  sendReport: async (text, email) => {
    try {
      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: EMAIL,
          pass: PASSEMAIL,
        },
      });

      // send mail with defined transport object
      info = await transporter.sendMail({
        from: `Report`,
        to: EMAIL, // list of receivers
        subject: "Report from the App", // Subject line
        text: text + " by " + email, // plain text body
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
};
