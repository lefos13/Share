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

const Posts = sequelize.define(
  "posts",
  {
    postid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startplace: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startcoord: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    endplace: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endcoord: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    numseats: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startdate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    enddate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    returnStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    returnEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    withReturn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    petAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    moreplaces: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isFavourite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    logging: true,
  }
);

module.exports = Posts;
