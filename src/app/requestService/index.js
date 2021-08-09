'use strict';

const express = require('express');
const { isApprover, isLoggedIn, isSelfRequest } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const { get: getRequestService, post: postRequestService } = require('./requestService');
const { get: getRequestRoles, post: postRequestRoles } = require('./requestRoles');
const { get: getConfirmServiceRequest, post: postConfirmServiceRquest } = require('./confirmServiceRequest');
const { get: getApproveServiceRequest, post: postApproveServiceRquest } = require('./approveServiceRequest');
const { get: getRejectServiceRequest, post: postRejectServiceRquest } = require('./rejectServiceRequest');

const router = express.Router({ mergeParams: true });

const requestService = (csrf) => {
  logger.info('Mounting request service route');
  
  router.use(isLoggedIn);

  router.get('/:orgId/users/:uid', csrf, isSelfRequest, asyncWrapper(getRequestService));
  router.post('/:orgId/users/:uid', csrf, isSelfRequest, asyncWrapper(postRequestService));
  router.get('/:orgId/users/:uid/services/:sid', csrf, isSelfRequest, asyncWrapper(getRequestRoles));
  router.post('/:orgId/users/:uid/services/:sid', csrf, isSelfRequest, asyncWrapper(postRequestRoles));
  router.get('/:orgId/users/:uid/confirm-request', csrf, isSelfRequest, asyncWrapper(getConfirmServiceRequest));
  router.post('/:orgId/users/:uid/confirm-request', csrf, isSelfRequest, asyncWrapper(postConfirmServiceRquest));

  router.get('/:orgId/users/:uid/services/:sid/roles/:rids/approve', csrf, isApprover, asyncWrapper(getApproveServiceRequest));
  router.get('/:orgId/users/:uid/services/:sid/roles/:rids/reject', csrf, isApprover, asyncWrapper(getRejectServiceRequest));
  
  router.post('/:orgId/users/:uid/services/:sid/roles/:rids/approve', csrf, isApprover, asyncWrapper(postApproveServiceRquest));
  router.post('/:orgId/users/:uid/services/:sid/roles/:rids/reject', csrf, isApprover, asyncWrapper(postRejectServiceRquest));
  return router;
};
module.exports = requestService;
