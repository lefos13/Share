const { Sequelize, DataTypes } = require("sequelize");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file

const { HOST, USERR, PASS, DATABASEE } = process.env;
const sequelize = new Sequelize(DATABASEE, USERR, PASS, {
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
  logging: true,
});

const Locations = sequelize.define(
  "locations",
  {
    locationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
    },
    initiator: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    receivers: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    locationName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isCreated: {
      type: DataTypes.DATE,
    },
    locationCoords: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    logging: true,
  }
);

module.exports = Locations;
