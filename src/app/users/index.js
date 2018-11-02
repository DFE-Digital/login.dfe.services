'use strict';

const express = require('express');
const { isLoggedIn, isApprover} = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const { get: getUsersList, post: postUserList } = require('./usersList');
const { get: getSelectOrganisation, post: postSelectOrganisation } = require('./selectOrganisation');
const getServices = require('./getServices');
const router = express.Router({ mergeParams: true });

const users = (csrf) => {
  logger.info('Mounting users route');

  router.use(isLoggedIn);

  router.get('/users', asyncWrapper((req, res) => {
    req.user.organisations = req.user.organisations.filter(x => x.role.id === 10000);
    if (req.user.organisations.length === 1) {
      res.redirect(`${req.user.organisations[0].organisation.id}/users`);
    } else {
      res.redirect(`/approvals/select-organisation`);
    }
  }));

  router.get('/:orgId/users/:uid', asyncWrapper((req, res) => {
    res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}/services`);
  }));

  router.get('/:orgId/users', csrf, isApprover, asyncWrapper(getUsersList));
  router.post('/:orgId/users', csrf, isApprover, asyncWrapper(postUserList));

  router.get('/:orgId/users/:uid/services', csrf, isApprover, asyncWrapper(getServices));

  router.get('/select-organisation', csrf, asyncWrapper(getSelectOrganisation));
  router.post('/select-organisation', csrf, asyncWrapper(postSelectOrganisation));


  return router;

};
module.exports = users;
