'use strict';

const express = require('express');
const { isLoggedIn, isApprover} = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const { get: getUsersList, post: postUserList } = require('./usersList');
const { get: getSelectOrganisation, post: postSelectOrganisation } = require('./selectOrganisation');
const { get: getRemoveOrganisation, post: postRemoveOrganisation } = require('./removeOrganisationAccess');
const { get: getEditPermission, post: postEditPermission } = require('./editPermission');
const { get: getEditService, post: postEditService } = require('./editServices');
const { get: getRemoveService, post: postRemoveService } = require('./removeServiceAccess');
const { get: getConfirmEditService, post: postConfirmEditService } = require('./confirmEditService');
const getServices = require('./getServices');

const router = express.Router({ mergeParams: true });

const users = (csrf) => {
  logger.info('Mounting users route');

  router.use(isLoggedIn);

  router.get('/users', asyncWrapper((req, res) => {
    if (req.userOrganisations.length === 1) {
      res.redirect(`${req.userOrganisations[0].organisation.id}/users`);
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

  router.get('/:orgId/users/:uid/services/:sid', csrf, isApprover, asyncWrapper(getEditService));
  router.post('/:orgId/users/:uid/services/:sid', csrf, isApprover, asyncWrapper(postEditService));
  router.get('/:orgId/users/:uid/services/:sid/confirm-edit-service', csrf, isApprover, asyncWrapper(getConfirmEditService));
  router.post('/:orgId/users/:uid/services/:sid/confirm-edit-service', csrf, isApprover, asyncWrapper(postConfirmEditService));
  router.get('/:orgId/users/:uid/services/:sid/remove-service', csrf, isApprover, asyncWrapper(getRemoveService));
  router.post('/:orgId/users/:uid/services/:sid/remove-service', csrf, isApprover, asyncWrapper(postRemoveService));

  router.get('/:orgId/users/:uid/remove-organisation', csrf, isApprover, asyncWrapper(getRemoveOrganisation));
  router.post('/:orgId/users/:uid/remove-organisation', csrf, isApprover, asyncWrapper(postRemoveOrganisation));
  router.get('/:orgId/users/:uid/edit-permission', csrf, isApprover, asyncWrapper(getEditPermission));
  router.post('/:orgId/users/:uid/edit-permission', csrf, isApprover, asyncWrapper(postEditPermission));

  router.get('/select-organisation', csrf, asyncWrapper(getSelectOrganisation));
  router.post('/select-organisation', csrf, asyncWrapper(postSelectOrganisation));


  return router;

};
module.exports = users;
