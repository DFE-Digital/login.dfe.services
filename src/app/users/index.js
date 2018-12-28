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
const { get: getNewUserDetails, post: postNewUserDetails } = require('./newUserDetails');
const { get: getConfirmExistingUser, post: postConfirmExistingUser } = require('./confirmExistingUser');
const { get: getAssociateServices, post: postAssociateServices } = require('./associateServices');
const { get: getAssociateRoles, post: postAssociateRoles } = require('./associateRoles');
const { get: getConfirmNewUser, post: postConfirmNewUser} = require ('./confirmNewUser');

const router = express.Router({ mergeParams: true });

const users = (csrf) => {
  logger.info('Mounting users route');

  router.use(isLoggedIn);

  router.get('/users', asyncWrapper((req, res) => {
    req.userOrganisations = req.userOrganisations.filter(x => x.role.id === 10000);
    if (req.userOrganisations.length === 0) {
      return res.status(401).render('errors/views/notAuthorised');
    }
    if (req.userOrganisations.length === 1) {
      return res.redirect(`${req.userOrganisations[0].organisation.id}/users`);
    } else {
      res.redirect(`/approvals/select-organisation`);
    }
  }));



  router.get('/:orgId/users', csrf, isApprover, asyncWrapper(getUsersList));
  router.post('/:orgId/users', csrf, isApprover, asyncWrapper(postUserList));

  router.get('/:orgId/users/new-user', csrf, isApprover, asyncWrapper(getNewUserDetails));
  router.post('/:orgId/users/new-user', csrf, isApprover, asyncWrapper(postNewUserDetails));
  router.get('/:orgId/users/:uid/confirm-user', csrf, isApprover, asyncWrapper(getConfirmExistingUser));
  router.post('/:orgId/users/:uid/confirm-user', csrf, isApprover, asyncWrapper(postConfirmExistingUser));

  //add services to new user (invitation) if no user exists in DSI (from invite journey)
  router.get('/:orgId/users/associate-services', csrf, isApprover, asyncWrapper(getAssociateServices));
  router.post('/:orgId/users/associate-services', csrf, isApprover, asyncWrapper(postAssociateServices));
  router.get('/:orgId/users/associate-services/:sid', csrf, isApprover, asyncWrapper(getAssociateRoles));
  router.post('/:orgId/users/associate-services/:sid', csrf, isApprover, asyncWrapper(postAssociateRoles));
  router.get('/:orgId/users/confirm-new-user', csrf, isApprover, asyncWrapper(getConfirmNewUser));
  router.post('/:orgId/users/confirm-new-user', csrf, isApprover, asyncWrapper(postConfirmNewUser));

  //add services to existing user from user details page or invite journey if user found in DSI
  router.get('/:orgId/users/:uid/associate-services', csrf, isApprover, asyncWrapper(getAssociateServices));
  router.post('/:orgId/users/:uid/associate-services', csrf, isApprover, asyncWrapper(postAssociateServices));
  router.get('/:orgId/users/:uid/associate-services/:sid', csrf, isApprover, asyncWrapper(getAssociateRoles));
  router.post('/:orgId/users/:uid/associate-services/:sid', csrf, isApprover, asyncWrapper(postAssociateRoles));
  router.get('/:orgId/users/:uid/confirm-details', csrf, isApprover, asyncWrapper(getConfirmNewUser));
  router.post('/:orgId/users/:uid/confirm-details', csrf, isApprover, asyncWrapper(postConfirmNewUser));

  router.get('/:orgId/users/:uid', asyncWrapper((req, res) => {
    res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}/services`);
  }));
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
