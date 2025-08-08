const express = require("express");
const {
  isLoggedIn,
  isApproverInSomeOrgs,
} = require("../../infrastructure/utils");
const logger = require("../../infrastructure/logger");
const { asyncWrapper } = require("login.dfe.express-error-handling");
const {
  isAllowedToApproveServiceReq,
  isAllowedToApproveOrganisationReq,
} = require("./utils.js");
const router = express.Router({ mergeParams: true });
const {
  get: getAllRequestsForApproval,
  post: postAllRequestsForApproval,
} = require("./getAllRequestsForApproval");
const {
  get: getReviewOrganisationRequest,
  post: postReviewOrganisationRequest,
} = require("./reviewOrganisationRequest");
const {
  get: getReviewSubServiceRequest,
  post: postReviewSubServiceRequest,
} = require("./reviewSubServiceRequest");
const {
  get: getRejectOrganisationRequest,
  post: postRejectOrganisationRequest,
} = require("./rejectOrganisationRequest");
const {
  get: getRejectSubServiceRequest,
  post: postRejectSubServiceRequest,
} = require("./rejectSubServiceRequest");

const {
  get: getReviewServiceRequest,
  post: postReviewServiceRequest,
} = require("./reviewServiceRequest");
const {
  get: getRejectServiceRequest,
  post: postRejectServiceRequest,
} = require("./rejectServiceRequest");

const { getApproverOrgsFromReq } = require("../users/utils");

const action = (csrf) => {
  logger.info("Mounting accessRequest routes");

  router.use(isLoggedIn);
  router.get(
    "/",
    asyncWrapper((req, res) => {
      const approverOrgs = getApproverOrgsFromReq(req);
      if (approverOrgs.length === 0) {
        return res.status(401).render("errors/views/notAuthorised");
      }
      return res.redirect(`/access-requests/requests`);
    }),
  );
  router.get(
    "/subService-requests/:rid",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(getReviewSubServiceRequest),
  );
  router.post(
    "/subService-requests/:rid",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(postReviewSubServiceRequest),
  );
  router.get(
    "/subService-requests/:rid/rejected",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(getRejectSubServiceRequest),
  );
  router.post(
    "/subService-requests/:rid/rejected",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(postRejectSubServiceRequest),
  );
  router.get(
    "/requests",
    csrf,
    isApproverInSomeOrgs,
    asyncWrapper(getAllRequestsForApproval),
  );
  router.post(
    "/requests",
    csrf,
    isApproverInSomeOrgs,
    asyncWrapper(postAllRequestsForApproval),
  );
  router.get(
    "/organisation-requests/:rid",
    csrf,
    isAllowedToApproveOrganisationReq,
    asyncWrapper(getReviewOrganisationRequest),
  );
  router.post(
    "/organisation-requests/:rid",
    csrf,
    isAllowedToApproveOrganisationReq,
    asyncWrapper(postReviewOrganisationRequest),
  );
  router.get(
    "/organisation-requests/:rid/rejected",
    csrf,
    isAllowedToApproveOrganisationReq,
    asyncWrapper(getRejectOrganisationRequest),
  );
  router.post(
    "/organisation-requests/:rid/rejected",
    csrf,
    isAllowedToApproveOrganisationReq,
    asyncWrapper(postRejectOrganisationRequest),
  );

  router.get(
    "/service-requests/:rid/services/:sid/roles/:rolesIds?",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(getReviewServiceRequest),
  );
  router.post(
    "/service-requests/:rid/services/:sid/roles/:rolesIds?",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(postReviewServiceRequest),
  );

  router.get(
    "/service-requests/:rid/services/:sid/roles/:rolesIds?/rejected",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(getRejectServiceRequest),
  );
  router.post(
    "/service-requests/:rid/services/:sid/roles/:rolesIds?/rejected",
    csrf,
    isAllowedToApproveServiceReq,
    asyncWrapper(postRejectServiceRequest),
  );

  return router;
};

module.exports = action;
