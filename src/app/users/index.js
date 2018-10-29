'use strict';

const express = require('express');
const { isLoggedIn, isApprover} = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const getUsersList = require('./getUsersList');

const router = express.Router({ mergeParams: true });

const users = () => {
  logger.info('Mounting users route');

  router.get('/users', asyncWrapper((req, res) => {
   req.user.organisations = req.user.organisations.filter(x => x.role.id === 10000);
    res.redirect(`${req.user.organisations[0].organisation.id}/users`);
  }));

  router.get('/:orgId/users', isLoggedIn, isApprover, asyncWrapper(getUsersList));
  return router;

};
module.exports = users;
