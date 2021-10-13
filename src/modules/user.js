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
  logging: false,
});

const Users = sequelize.define(
  "Users",
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    car: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cardate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    facebook: {
      type: DataTypes.TEXT,
    },
    instagram: {
      type: DataTypes.TEXT,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = Users;
