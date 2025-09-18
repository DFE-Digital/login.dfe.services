const express = require("express");
const { isLoggedIn, canRequestOrg } = require("../../infrastructure/utils");
const logger = require("../../infrastructure/logger");
const { asyncWrapper } = require("login.dfe.express-helpers/error-handling");

const selectOrganisation = require("./selectOrganisation");
const review = require("./review");

const router = express.Router({ mergeParams: true });

const requestOrganisation = (csrf) => {
  logger.info("Mounting request organisation route");

  router.use(isLoggedIn, canRequestOrg, csrf);

  router.get("/search", asyncWrapper(selectOrganisation.get));
  router.post("/search", asyncWrapper(selectOrganisation.post));

  router.get("/review", asyncWrapper(review.get));
  router.post("/review", asyncWrapper(review.post));

  return router;
};
module.exports = requestOrganisation;
