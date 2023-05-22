const { Sequelize, DataTypes } = require("sequelize");

// enviroment variables
const dotenv = require("dotenv");

dotenv.config();
// get the values from the .env file

/* This code is creating a Sequelize instance to connect to a MySQL database using the environment
variables for the host, username, password, and database name. The `sequelize.define` method is also
defining a model for a table called `convusers` with columns for `convid`, `expiresIn`, and
`messages`. The `freezeTableName` and `timestamps` options are set to `true` and `false`,
respectively. Finally, the `ConvUsers` model is exported for use in other parts of the application. */
const { HOST, USERR, PASS, DATABASEE } = process.env;
const sequelize = new Sequelize(DATABASEE, USERR, PASS, {
  host: HOST,
  dialect: "mysql",
  // dialectOptions: {
  //   useUTC: false, // for reading from database
  // },
  timezone: "+02:00", // for writing to database
  logging: true,
});

const ConvGroups = sequelize.define(
  "convgroups",
  {
    groupId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: true,
      defaultValue: null,
    },
    convid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    messages: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    pending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = ConvGroups;
