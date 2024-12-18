const Sequelize = require("sequelize").default;
const assert = require("assert");
const config = require("./../../config");

const Op = Sequelize.Op;

const getIntValueOrDefault = (value, defaultValue = 0) => {
  if (!value) {
    return defaultValue;
  }
  const int = parseInt(value);
  return isNaN(int) ? defaultValue : int;
};

const makeConnection = () => {
  if (config.database && config.database.postgresUrl) {
    return new Sequelize(config.database.postgresUrl);
  }

  assert(
    config.database.username,
    "Database property username must be supplied",
  );
  assert(
    config.database.password,
    "Database property password must be supplied",
  );
  assert(config.database.host, "Database property host must be supplied");
  assert(
    config.database.dialect,
    "Database property dialect must be supplied, this must be postgres or mssql",
  );

  const databaseName = config.database.name || "postgres";
  const encryptDb = config.database.encrypt || true;
  const dbOpts = {
    retry: {
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
      ],
      name: "query",
      backoffBase: 100,
      backoffExponent: 1.1,
      timeout: 60000,
      max: 5,
    },
    host: config.database.host,
    dialect: config.database.dialect,
    operatorsAliases: Op,
    dialectOptions: {
      encrypt: encryptDb,
    },
    logging: false,
  };
  if (config.database.pool) {
    dbOpts.pool = {
      max: getIntValueOrDefault(config.database.pool.max, 5),
      min: getIntValueOrDefault(config.database.pool.min, 0),
      acquire: getIntValueOrDefault(config.database.pool.acquire, 10000),
      idle: getIntValueOrDefault(config.database.pool.idle, 10000),
    };
  }

  return new Sequelize(
    databaseName,
    config.database.username,
    config.database.password,
    dbOpts,
  );
};

module.exports = {
  makeConnection,
};
