const express = require("express");
const { isLoggedIn } = require("../../infrastructure/utils");
const logger = require("../../infrastructure/logger");
const { asyncWrapper } = require("login.dfe.express-error-handling");

const selectOrganisation = require("./selectOrganisation");
const review = require("./review");

const router = express.Router({ mergeParams: true });

const requestOrganisation = (csrf) => {
  logger.info("Mounting request organisation route");

  router.get("/search", isLoggedIn, csrf, asyncWrapper(selectOrganisation.get));
  router.post(
    "/search",
    isLoggedIn,
    csrf,
    asyncWrapper(selectOrganisation.post),
  );

  router.get("/review", isLoggedIn, csrf, asyncWrapper(review.get));
  router.post("/review", isLoggedIn, csrf, asyncWrapper(review.post));

  return router;
};
module.exports = requestOrganisation;
