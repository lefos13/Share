const { Sequelize, DataTypes } = require("sequelize");
const { nextTick } = require("process");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file

const { HOST, USERR, PASS, DATABASEE } = process.env;
const sequelize = new Sequelize(DATABASEE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  logging: false,
});

const Users = sequelize.define(
  "users",
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
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    car: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cardate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    age: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    facebook: {
      type: DataTypes.TEXT,
    },
    instagram: {
      type: DataTypes.TEXT,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1,
    },
    isThirdPartyLogin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0,
    },
    lastLang: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    socketId: {
      type: DataTypes.STRING,
      defaultValue: null,
      allowNull: true,
    },
    OS: {
      type: DataTypes.STRING,
      defaultValue: null,
      allowNull: true,
    },
    asDriver: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    asPassenger: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = Users;
