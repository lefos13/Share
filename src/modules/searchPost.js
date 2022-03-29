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
  timezone: "+02:00",
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

const SearchPost = sequelize.define(
  "searchPost",
  {
    postSearchId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = SearchPost;
