"use strict";

const express = require("express");
const {
  isLoggedIn,
  isApprover,
  isApproverInSomeOrgs,
} = require("../../infrastructure/utils");
const logger = require("../../infrastructure/logger");
const { asyncWrapper } = require("login.dfe.express-error-handling");

const { get: getUsersList, post: postUserList } = require("./usersList");
const {
  get: getSelectOrganisation,
  post: postSelectOrganisation,
} = require("./selectOrganisation");
const {
  get: getSelectServiceWithOrganisation,
  post: postSelectServiceWithOrganisation,
} = require("./selectServiceWithOrganisation");
const {
  get: getRemoveOrganisation,
  post: postRemoveOrganisation,
} = require("./removeOrganisationAccess");
const {
  get: getEditPermission,
  post: postEditPermission,
} = require("./editPermission");
const {
  get: getEditService,
  post: postEditService,
} = require("./editServices");
const {
  get: getRemoveService,
  post: postRemoveService,
} = require("./removeServiceAccess");
const {
  get: getConfirmEditService,
  post: postConfirmEditService,
} = require("./confirmEditService");
const getServices = require("./getServices");
const {
  get: getNewUserDetails,
  post: postNewUserDetails,
} = require("./newUserDetails");
const {
  get: getConfirmExistingUser,
  post: postConfirmExistingUser,
} = require("./confirmExistingUser");
const {
  get: getAssociateServices,
  post: postAssociateServices,
} = require("./associateServices");
const {
  get: getOrganisationPermission,
  post: postOrganisationPermission,
} = require("./organisationPermission");
const {
  get: getAssociateRoles,
  post: postAssociateRoles,
} = require("./associateRoles");
const {
  get: getConfirmNewUser,
  post: postConfirmNewUser,
} = require("./confirmNewUser");
const {
  get: getResendInvitation,
  post: postResendInvitation,
} = require("./resendInvitation");
const { getApproverOrgsFromReq } = require("./utils");

const router = express.Router({ mergeParams: true });

const users = (csrf) => {
  logger.info("Mounting users route");

  router.use(isLoggedIn);

  // Manage users page - users list page
  router.get("/users", csrf, isApproverInSomeOrgs, asyncWrapper(getUsersList));
  router.post("/users", csrf, isApproverInSomeOrgs, asyncWrapper(postUserList));

  router.get(
    "/:orgId/users/new-user",
    csrf,
    isApprover,
    asyncWrapper(getNewUserDetails),
  );
  router.post(
    "/:orgId/users/new-user",
    csrf,
    isApprover,
    asyncWrapper(postNewUserDetails),
  );
  router.get(
    "/:orgId/users/:uid/confirm-user",
    csrf,
    isApprover,
    asyncWrapper(getConfirmExistingUser),
  );
  router.post(
    "/:orgId/users/:uid/confirm-user",
    csrf,
    isApprover,
    asyncWrapper(postConfirmExistingUser),
  );

  //add services to new user (invitation) if no user exists in DSI (from invite journey)
  router.get(
    "/:orgId/users/organisation-permissions",
    csrf,
    isApprover,
    asyncWrapper(getOrganisationPermission),
  );
  router.post(
    "/:orgId/users/organisation-permissions",
    csrf,
    isApprover,
    asyncWrapper(postOrganisationPermission),
  );
  router.get(
    "/:orgId/users/associate-services",
    csrf,
    isApprover,
    asyncWrapper(getAssociateServices),
  );
  router.post(
    "/:orgId/users/associate-services",
    csrf,
    isApprover,
    asyncWrapper(postAssociateServices),
  );
  router.get(
    "/:orgId/users/associate-services/:sid",
    csrf,
    isApprover,
    asyncWrapper(getAssociateRoles),
  );
  router.post(
    "/:orgId/users/associate-services/:sid",
    csrf,
    isApprover,
    asyncWrapper(postAssociateRoles),
  );
  router.get(
    "/:orgId/users/confirm-new-user",
    csrf,
    isApprover,
    asyncWrapper(getConfirmNewUser),
  );
  router.post(
    "/:orgId/users/confirm-new-user",
    csrf,
    isApprover,
    asyncWrapper(postConfirmNewUser),
  );

  //add services to existing user from user details page or invite journey if user found in DSI
  router.get(
    "/:orgId/users/:uid/organisation-permissions",
    csrf,
    isApprover,
    asyncWrapper(getOrganisationPermission),
  );
  router.post(
    "/:orgId/users/:uid/organisation-permissions",
    csrf,
    isApprover,
    asyncWrapper(postOrganisationPermission),
  );
  router.get(
    "/:orgId/users/:uid/associate-services",
    csrf,
    isApprover,
    asyncWrapper(getAssociateServices),
  );
  router.post(
    "/:orgId/users/:uid/associate-services",
    csrf,
    isApprover,
    asyncWrapper(postAssociateServices),
  );
  router.get(
    "/:orgId/users/:uid/associate-services/:sid",
    csrf,
    isApprover,
    asyncWrapper(getAssociateRoles),
  );
  router.post(
    "/:orgId/users/:uid/associate-services/:sid",
    csrf,
    isApprover,
    asyncWrapper(postAssociateRoles),
  );
  router.get(
    "/:orgId/users/:uid/confirm-details",
    csrf,
    isApprover,
    asyncWrapper(getConfirmNewUser),
  );
  router.post(
    "/:orgId/users/:uid/confirm-details",
    csrf,
    isApprover,
    asyncWrapper(postConfirmNewUser),
  );

  // User details page within manage users
  router.get(
    "/users/:uid",
    csrf,
    isApproverInSomeOrgs,
    asyncWrapper(getServices),
  );

  router.get(
    "/:orgId/users/:uid/services/:sid",
    csrf,
    isApprover,
    asyncWrapper(getEditService),
  );
  router.post(
    "/:orgId/users/:uid/services/:sid",
    csrf,
    isApprover,
    asyncWrapper(postEditService),
  );
  router.get(
    "/:orgId/users/:uid/services/:sid/confirm-edit-service",
    csrf,
    isApprover,
    asyncWrapper(getConfirmEditService),
  );
  router.post(
    "/:orgId/users/:uid/services/:sid/confirm-edit-service",
    csrf,
    isApprover,
    asyncWrapper(postConfirmEditService),
  );
  router.get(
    "/:orgId/users/:uid/services/:sid/remove-service",
    csrf,
    isApprover,
    asyncWrapper(getRemoveService),
  );
  router.post(
    "/:orgId/users/:uid/services/:sid/remove-service",
    csrf,
    isApprover,
    asyncWrapper(postRemoveService),
  );

  router.get(
    "/:orgId/users/:uid/remove-organisation",
    csrf,
    isApprover,
    asyncWrapper(getRemoveOrganisation),
  );
  router.post(
    "/:orgId/users/:uid/remove-organisation",
    csrf,
    isApprover,
    asyncWrapper(postRemoveOrganisation),
  );
  router.get(
    "/:orgId/users/:uid/edit-permission",
    csrf,
    isApprover,
    asyncWrapper(getEditPermission),
  );
  router.post(
    "/:orgId/users/:uid/edit-permission",
    csrf,
    isApprover,
    asyncWrapper(postEditPermission),
  );

  router.get(
    "/:orgId/users/:uid/resend-invitation",
    csrf,
    isApprover,
    asyncWrapper(getResendInvitation),
  );
  router.post(
    "/:orgId/users/:uid/resend-invitation",
    csrf,
    isApprover,
    asyncWrapper(postResendInvitation),
  );

  router.get("/select-organisation", csrf, asyncWrapper(getSelectOrganisation));
  router.post(
    "/select-organisation",
    csrf,
    asyncWrapper(postSelectOrganisation),
  );

  router.get(
    "/select-organisation-service",
    csrf,
    asyncWrapper(getSelectServiceWithOrganisation),
  );
  router.post(
    "/select-organisation-service",
    csrf,
    asyncWrapper(postSelectServiceWithOrganisation),
  );

  return router;
};
module.exports = users;
