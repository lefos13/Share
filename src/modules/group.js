const { Sequelize, DataTypes } = require("sequelize");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file

const { HOST, USERR, PASS, DATABASE } = process.env;
const sequelize = new Sequelize(DATABASE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  dialectOptions: {
    typeCast: function (field, next) {
      if (field.type == "DATETIME" || field.type == "TIMESTAMP") {
        return new Date(field.string() + "Z");
      }
      return next();
    },
  },
  timezone: "+02:00", // for writing to database
  logging: false,
});

const Groups = sequelize.define(
  "groups",
  {
    groupId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    admin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    members: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    groupName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isCreated: {
      type: DataTypes.DATE,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    logging: true,
  }
);

module.exports = Groups;
