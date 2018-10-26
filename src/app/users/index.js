'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const getUsersList = require('./getUsersList');

const router = express.Router({ mergeParams: true });

const users = () => {
  logger.info('Mounting users route');

  router.get('/:orgId/users', isLoggedIn, asyncWrapper(getUsersList));
  return router;
};
module.exports = users;
