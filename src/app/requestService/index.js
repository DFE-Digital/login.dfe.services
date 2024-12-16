"use strict";

const express = require("express");
const {
  isApprover,
  isLoggedIn,
  isSelfRequest,
} = require("../../infrastructure/utils");
const logger = require("../../infrastructure/logger");
const { asyncWrapper } = require("login.dfe.express-error-handling");

const {
  get: getRequestService,
  post: postRequestService,
} = require("./requestService");
const {
  get: getRequestRoles,
  post: postRequestRoles,
} = require("./requestRoles");
const {
  get: getRequestEditRoles,
  post: postRequestEditRoles,
} = require("./requestEditRoles");
const {
  get: getConfirmEditRolesRequest,
  post: postConfirmEditRolesRquest,
} = require("./confirmEditRolesRequest");
const {
  get: getConfirmServiceRequest,
  post: postConfirmServiceRquest,
} = require("./confirmServiceRequest");
const {
  get: getApproveServiceRequest,
  post: postApproveServiceRquest,
} = require("./approveServiceRequest");
const {
  get: getRejectServiceRequest,
  post: postRejectServiceRquest,
} = require("./rejectServiceRequest");

const {
  get: getApproveRolesRequest,
  post: postApproveRolesRquest,
} = require("./approveRolesRequest");
const {
  get: getRejectRolesRequest,
  post: postRejectRolesRquest,
} = require("./rejectRolesRequest");

const router = express.Router({ mergeParams: true });

const requestService = (csrf) => {
  logger.info("Mounting request service route");

  router.use(isLoggedIn);

  router.get(
    "/:orgId/users/:uid",
    csrf,
    isSelfRequest,
    asyncWrapper(getRequestService),
  );
  router.post(
    "/:orgId/users/:uid",
    csrf,
    isSelfRequest,
    asyncWrapper(postRequestService),
  );
  router.get(
    "/:orgId/users/:uid/services/:sid",
    csrf,
    isSelfRequest,
    asyncWrapper(getRequestRoles),
  );
  router.post(
    "/:orgId/users/:uid/services/:sid",
    csrf,
    isSelfRequest,
    asyncWrapper(postRequestRoles),
  );

  //End user - edit roles on their account - request
  router.get(
    "/:orgId/users/:uid/edit-services/:sid",
    csrf,
    isSelfRequest,
    asyncWrapper(getRequestEditRoles),
  );
  router.post(
    "/:orgId/users/:uid/edit-services/:sid",
    csrf,
    isSelfRequest,
    asyncWrapper(postRequestEditRoles),
  );

  //End user - edit roles on their account - confirm request
  router.get(
    "/:orgId/users/:uid/edit-services/:sid/confirm-edit-roles-request",
    csrf,
    isSelfRequest,
    asyncWrapper(getConfirmEditRolesRequest),
  );
  router.post(
    "/:orgId/users/:uid/edit-services/:sid/confirm-edit-roles-request",
    csrf,
    isSelfRequest,
    asyncWrapper(postConfirmEditRolesRquest),
  );

  router.get(
    "/:orgId/users/:uid/confirm-request",
    csrf,
    isSelfRequest,
    asyncWrapper(getConfirmServiceRequest),
  );
  router.post(
    "/:orgId/users/:uid/confirm-request",
    csrf,
    isSelfRequest,
    asyncWrapper(postConfirmServiceRquest),
  );

  router.get(
    "/:orgId/users/:uid/services/:sid/roles/:rids/approve",
    csrf,
    isApprover,
    asyncWrapper(getApproveServiceRequest),
  );
  router.get(
    "/:orgId/users/:uid/services/:sid/roles/:rids/reject",
    csrf,
    isApprover,
    asyncWrapper(getRejectServiceRequest),
  );

  router.post(
    "/:orgId/users/:uid/services/:sid/roles/:rids/approve",
    csrf,
    isApprover,
    asyncWrapper(postApproveServiceRquest),
  );
  router.post(
    "/:orgId/users/:uid/services/:sid/roles/:rids/reject",
    csrf,
    isApprover,
    asyncWrapper(postRejectServiceRquest),
  );

  router.get(
    "/:orgId/users/:uid/services/:sid/roles/:rids/:reqID/approve-roles-request",
    csrf,
    isApprover,
    asyncWrapper(getApproveRolesRequest),
  );
  router.get(
    "/:orgId/users/:uid/services/:sid/roles/:rids/:reqID/reject-roles-request",
    csrf,
    isApprover,
    asyncWrapper(getRejectRolesRequest),
  );

  router.post(
    "/:orgId/users/:uid/services/:sid/roles/:rids/:reqID/approve-roles-request",
    csrf,
    isApprover,
    asyncWrapper(postApproveRolesRquest),
  );
  router.post(
    "/:orgId/users/:uid/services/:sid/roles/:rids/:reqID/reject-roles-request",
    csrf,
    isApprover,
    asyncWrapper(postRejectRolesRquest),
  );
  return router;
};
module.exports = requestService;
