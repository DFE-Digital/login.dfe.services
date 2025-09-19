const express = require("express");
const { isLoggedIn } = require("../../infrastructure/utils");
const logger = require("../../infrastructure/logger");
const { asyncWrapper } = require("login.dfe.express-helpers/error-handling");

const getIndex = require("./home");
const getServices = require("./getServices");
const {
  jobTitleBannerHandler,
  passwordChangeBannerHandler,
  closeSubServiceAddedBanner,
  closeServiceAddedBanner,
} = require("./userBannersHandlers");

const router = express.Router({ mergeParams: true });

const home = (csrf) => {
  logger.info("Mounting home routes");

  router.get("/", asyncWrapper(getIndex));
  router.get("/my-services", csrf, isLoggedIn, asyncWrapper(getServices));
  router.get(
    "/close-missing-jobtitle",
    isLoggedIn,
    asyncWrapper(jobTitleBannerHandler),
  );
  router.get(
    "/close-password-change",
    isLoggedIn,
    asyncWrapper(passwordChangeBannerHandler),
  );
  router.get(
    "/close-sub-service-added/:bannerId",
    isLoggedIn,
    asyncWrapper(closeSubServiceAddedBanner),
  );
  router.get(
    "/close-service-added/:bannerId",
    isLoggedIn,
    asyncWrapper(closeServiceAddedBanner),
  );
  return router;
};

module.exports = home;
