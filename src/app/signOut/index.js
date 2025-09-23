const express = require("express");
const logger = require("../../infrastructure/logger");
const { asyncWrapper } = require("login.dfe.express-helpers/error-handling");

const signOutUser = require("./signOut");
const complete = require("./complete");
const sessionTimeout = require("./session-timeout");

const router = express.Router({ mergeParams: true });

const signout = () => {
  logger.info("Mounting signOut route");
  router.get("/", asyncWrapper(signOutUser));
  router.get("/complete", asyncWrapper(complete));
  router.get("/session-timeout", asyncWrapper(sessionTimeout));
  return router;
};

module.exports = signout;
