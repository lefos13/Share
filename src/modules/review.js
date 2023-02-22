const { Sequelize, DataTypes } = require("sequelize");
const { nextTick } = require("process");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file

const { HOST, USERR, PASS, DATABASE } = process.env;
const sequelize = new Sequelize(DATABASE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: false,
  dialectOptions: {
    typeCast: function (field, next) {
      if (
        field.type == "DATETIME" ||
        field.type == "TIMESTAMP" ||
        field.type == "DATE"
      ) {
        return new Date(field.string() + "Z");
      }
      return next();
    },
    dateStrings: true,
  },
  timezone: "+02:00", // for writing to database
});

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

const Reviews = sequelize.define(
  "reviews",
  {
    email: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
    emailreviewer: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      // set(value) {
      //   this.setDataValue("emailreviewer", "testest");
      // },
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      // defaultValue: new Date().addHours(3),
      // allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    timezone: "+02:00",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = Reviews;
