'use strict';

const express = require('express');
const { isLoggedIn, isApproverInSomeOrgs } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const { get: getAllRequestsForApproval, post: postAllRequestsForApproval } = require('./getAllRequestsForApproval');
const {
  get: getReviewOrganisationRequest,
  post: postReviewOrganisationRequest,
} = require('./reviewOrganisationRequest');
const {
  get: getRejectOrganisationRequest,
  post: postRejectOrganisationRequest,
} = require('./rejectOrganisationRequest');
const {
  get: getRejectSubServiceRequest,
  post: postRejectSubServiceRequest,
} = require('./rejectSubServiceRequest');
const { getApproverOrgsFromReq } = require('../users/utils');

const action = (csrf, app) => {
  logger.info('Mounting accessRequest routes');

  router.use(isLoggedIn);
  router.get(
    '/',
    asyncWrapper((req, res) => {
      const approverOrgs = getApproverOrgsFromReq(req);
      if (approverOrgs.length === 0) {
        return res.status(401).render('errors/views/notAuthorised');
      }
      return res.redirect(`/access-requests/requests`);
    }),
  );
  router.get('/subService-requests/:rid', csrf, isApproverInSomeOrgs, asyncWrapper(getReviewSubServiceRequest));
  router.post('/subService-requests/:rid', csrf, isApproverInSomeOrgs, asyncWrapper(postReviewSubServiceRequest));
  router.get(
    '/subService-requests/:rid/rejected',
    csrf,
    isApproverInSomeOrgs,
    asyncWrapper(getRejectSubServiceRequest),
  );
  router.post(
    '/subService-requests/:rid/rejected',
    csrf,
    isApproverInSomeOrgs,
    asyncWrapper(postRejectSubServiceRequest),
  );
  router.get('/requests', csrf, isApproverInSomeOrgs, asyncWrapper(getAllRequestsForApproval));
  router.post('/requests', csrf, isApproverInSomeOrgs, asyncWrapper(postAllRequestsForApproval));
  router.get('/organisation-requests/:rid', csrf, isApproverInSomeOrgs, asyncWrapper(getReviewOrganisationRequest));
  router.post('/organisation-requests/:rid', csrf, isApproverInSomeOrgs, asyncWrapper(postReviewOrganisationRequest));
  router.get(
    '/organisation-requests/:rid/rejected',
    csrf,
    isApproverInSomeOrgs,
    asyncWrapper(getRejectOrganisationRequest),
  );
  router.post(
    '/organisation-requests/:rid/rejected',
    csrf,
    isApproverInSomeOrgs,
    asyncWrapper(postRejectOrganisationRequest),
  );

  return router;
};

module.exports = action;
