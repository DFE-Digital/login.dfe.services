'use strict';

const express = require('express');
const { isLoggedIn, isApprover} = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const getUsersList = require('./getUsersList');
const { get: getSelectOrganisation, post: postSelectOrganisation } = require('./selectOrganisation');
const router = express.Router({ mergeParams: true });

const users = (csrf) => {
  logger.info('Mounting users route');

  router.get('/users', asyncWrapper((req, res) => {
    req.user.organisations = req.user.organisations.filter(x => x.role.id === 10000);
    if (req.user.organisations.length === 1) {
      res.redirect(`${req.user.organisations[0].organisation.id}/users`);
    } else {
      res.redirect(`/approvals/select-organisation`);
    }
  }));

  router.get('/:orgId/users', csrf, isLoggedIn, isApprover, asyncWrapper(getUsersList));

  router.get('/select-organisation', csrf, isLoggedIn, asyncWrapper(getSelectOrganisation));
  router.post('/select-organisation', csrf, isLoggedIn, asyncWrapper(postSelectOrganisation));
  return router;

};
module.exports = users;
