'use strict';

const express = require('express');
const { isLoggedIn, isApprover } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const { get: getSelectOrganisation, post: postSelectOrganisation } = require('./selectOrganisation');
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

const action = (csrf) => {
  logger.info('Mounting accessRequest routes');

  router.use(isLoggedIn);

  router.get(
    '/',
    asyncWrapper((req, res) => {
      const approverOrgs = getApproverOrgsFromReq(req);
      const allUserOrganisationRequests = req.organisationRequests;
      const orgs = approverOrgs.filter((x) => allUserOrganisationRequests.find((y) => y.org_id === x.organisation.id));
      if (approverOrgs.length === 0) {
        return res.status(401).render('errors/views/notAuthorised');
      }
      if (orgs.length === 1) {
        return res.redirect(`/access-requests/${orgs[0].organisation.id}/requests`);
      } else {
        return res.redirect(`/access-requests/select-organisation`);
      }
    }),
  );

  router.get('/:orgId/requests', csrf, isApprover, asyncWrapper(getOrganisationRequests));
  router.get('/:orgId/requests/:rid', csrf, isApprover, asyncWrapper(getReviewOrganisationRequest));
  router.post('/:orgId/requests/:rid', csrf, isApprover, asyncWrapper(postReviewOrganisationRequest));
  router.get('/:orgId/requests/:rid/rejected', csrf, isApprover, asyncWrapper(getRejectOrganisationRequest));
  router.post('/:orgId/requests/:rid/rejected', csrf, isApprover, asyncWrapper(postRejectOrganisationRequest));

  router.get('/select-organisation', csrf, asyncWrapper(getSelectOrganisation));
  router.post('/select-organisation', csrf, asyncWrapper(postSelectOrganisation));

  return router;
};

module.exports = action;
