'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const getAccessRequests = require('./accessRequests').get;
const postAccessRequests = require('./accessRequests').post;


const home = () => {
  logger.info('Mounting accessRequest routes');

  router.get('/', isLoggedIn, asyncWrapper(getAccessRequests));
  router.post('/', isLoggedIn, asyncWrapper(postAccessRequests));


  return router;
};

module.exports = home;
