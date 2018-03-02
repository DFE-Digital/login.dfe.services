'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const getAvailableServices = require('./getAvailableServices');


const home = () => {
  logger.info('Mounting services routes');

  router.get('/available-services', isLoggedIn, asyncWrapper(getAvailableServices));


  return router;
};

module.exports = home;
