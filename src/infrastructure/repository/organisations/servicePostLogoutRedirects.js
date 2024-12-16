const Sequelize = require("sequelize").default;
const Op = Sequelize.Op;

const define = (db, schema) => {
  const model = db.define(
    "servicePostLogoutRedirectUris",
    {
      serviceId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      redirectUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "servicePostLogoutRedirectUris",
      schema,
    },
  );
  model.removeAttribute("id");
  return model;
};

const extend = () => {};

module.exports = {
  name: "servicePostLogoutRedirects",
  define,
  extend,
};
