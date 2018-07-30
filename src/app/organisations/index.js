'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const org = require('./organisations');

const router = express.Router({ mergeParams: true });

const organisations = () => {
  logger.info('Mounting organisations route');
  router.get('/', isLoggedIn, asyncWrapper(org));
  return router;
};
module.exports = organisations;
