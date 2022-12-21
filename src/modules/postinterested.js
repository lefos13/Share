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
  logging: true,
  dialectOptions: {
    dateStrings: true,
    typeCast: function (field, next) {
      // for reading from database
      // console.log(field.type);
      if (field.type == "DATETIME") {
        // console.log("!!!!!!!!!!!!!!!!!!!!!!", field.string());
        return field.string();
      }
      return next();
    },
  },
  timezone: "+02:00",
});

const PostInterested = sequelize.define(
  "postinterested",
  {
    piid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    postid: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isNotified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    ownerNotified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = PostInterested;
