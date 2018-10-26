'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const getUsersList = require('./getUsersList');

const router = express.Router({ mergeParams: true });

const users = () => {
  logger.info('Mounting users route');

  router.get('/users', asyncWrapper((req, res) => {
    res.redirect(`${req.user.organisations[0].id}/users`);
  }));

  router.get('/:orgId/users', isLoggedIn, asyncWrapper(getUsersList));
  return router;

};
module.exports = users;
