const { Sequelize, DataTypes } = require("sequelize");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file

const { HOST, USER, PASS, DATABASE } = process.env;
const sequelize = new Sequelize(DATABASE, USER, PASS, {
  host: HOST,
  dialect: "mysql",
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
  },
  timezone: "+02:00", // for writing to database
  logging: false,
});

const LastSearch = sequelize.define(
  "lastsearch",
  {
    lsid: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isCreated: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isUpdated: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startPlace: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startCoord: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endPlace: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endCoord: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isFavourite: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    timezone: "+02:00",
  }
);

module.exports = LastSearch;
