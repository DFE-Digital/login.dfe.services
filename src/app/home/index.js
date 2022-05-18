'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const getIndex = require('./home');
const getServices = require('./getServices');
const { jobTitleBannerHandler, passwordChangeBannerHandler } = require('./closeBanner');

const router = express.Router({ mergeParams: true });

const home = (csrf, app) => {
  logger.info('Mounting home routes');

  router.get('/', asyncWrapper(getIndex));
  router.get('/my-services', isLoggedIn, asyncWrapper(getServices));
  router.get('/close-missing-jobtitle', isLoggedIn, asyncWrapper(jobTitleBannerHandler));
  router.get('/close-password-change', isLoggedIn, asyncWrapper(passwordChangeBannerHandler));
  
  return router;
};

module.exports = home;
