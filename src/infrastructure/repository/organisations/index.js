const config = require("./../../config");

const { makeConnection } = require("./connection");
const servicePostLogoutRedirectUris = require("./servicePostLogoutRedirects");

const db = makeConnection();

const buildDataModel = (model, connection, entityModels) => {
  const dbSchema = config.database.schema || "services";

  // Define
  entityModels.forEach((entityModel) => {
    model[entityModel.name] = entityModel.define(db, dbSchema);
  });

  // Extend
  entityModels
    .filter((m) => m.extend !== undefined)
    .forEach((entityModel) => {
      entityModel.extend(model);
    });
};
const dataModel = {};
buildDataModel(dataModel, db, [servicePostLogoutRedirectUris]);
dataModel.connection = db;

module.exports = dataModel;
