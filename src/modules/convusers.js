const { Sequelize, DataTypes } = require("sequelize");
const { nextTick } = require("process");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file

const { HOST, USER, PASS, DATABASE } = process.env;
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
  // dialectOptions: {
  //   useUTC: false, // for reading from database
  // },
  timezone: "+02:00", // for writing to database
  logging: true,
});

const ConvUsers = sequelize.define(
  "convusers",
  {
    convid: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
      allowNull: false,
    },
    expiresIn: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    messages: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = ConvUsers;
