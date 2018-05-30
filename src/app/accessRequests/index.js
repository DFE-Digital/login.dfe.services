'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const getAccessRequests = require('./getAccessRequests');


const home = () => {
  logger.info('Mounting accessRequest routes');

  router.get('/', isLoggedIn, asyncWrapper(getAccessRequests));


  return router;
};

module.exports = home;
