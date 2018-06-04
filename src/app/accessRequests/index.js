'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const getAccessRequests = require('./accessRequests').get;
const postAccessRequests = require('./accessRequests').post;


const action = (csrf) => {
  logger.info('Mounting accessRequest routes');

  router.get('/',csrf, isLoggedIn, asyncWrapper(getAccessRequests));
  router.post('/',csrf, isLoggedIn, asyncWrapper(postAccessRequests));


  return router;
};

module.exports = action;
