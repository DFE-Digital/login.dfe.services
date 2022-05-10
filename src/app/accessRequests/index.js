'use strict';

const express = require('express');
const { isLoggedIn, isApproverInSomeOrgs } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const getOrganisationRequests = require('./getOrganisationRequests');
const {
  get: getReviewOrganisationRequest,
  post: postReviewOrganisationRequest,
} = require('./reviewOrganisationRequest');
const {
  get: getRejectOrganisationRequest,
  post: postRejectOrganisationRequest,
} = require('./rejectOrganisationRequest');
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

  router.get('/requests', csrf, isApproverInSomeOrgs, asyncWrapper(getOrganisationRequests));
  router.get('/requests/:rid', csrf, isApproverInSomeOrgs, asyncWrapper(getReviewOrganisationRequest));
  router.post('/requests/:rid', csrf, isApproverInSomeOrgs, asyncWrapper(postReviewOrganisationRequest));
  router.get('/requests/:rid/rejected', csrf, isApproverInSomeOrgs, asyncWrapper(getRejectOrganisationRequest));
  router.post('/requests/:rid/rejected', csrf, isApproverInSomeOrgs, asyncWrapper(postRejectOrganisationRequest));

  return router;
};

module.exports = action;
