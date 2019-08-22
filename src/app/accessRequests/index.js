'use strict';

const express = require('express');
const { isLoggedIn } = require('../../infrastructure/utils');
const logger = require('../../infrastructure/logger');
const { asyncWrapper } = require('login.dfe.express-error-handling');

const router = express.Router({ mergeParams: true });
const { get: getAccessRequests, post: postAccessRequests } = require('./accessRequests');
const { get: getSelectOrganisation, post: postSelectOrganisation } = require('./selectOrganisation');

const action = (csrf) => {
  logger.info('Mounting accessRequest routes');

  router.use(isLoggedIn);

  router.get('/', asyncWrapper((req, res) => {
    const approverOrgs = req.userOrganisations.filter(x => x.role.id === 10000);
    const allUserOrganisationRequests = req.organisationRequests;
    const orgs = approverOrgs.filter(x => allUserOrganisationRequests.find(y => y.org_id === x.organisation.id));
    if (approverOrgs.length === 0) {
      return res.status(401).render('errors/views/notAuthorised');
    }
    if (orgs.length === 1) {
      return res.redirect(`/access-requests/${req.userOrganisations[0].organisation.id}`);
    } else {
      return res.redirect(`/access-requests/select-organisation`);
    }
  }));

  //router.get('/',csrf, asyncWrapper(getAccessRequests));
  // router.post('/',csrf, asyncWrapper(postAccessRequests));

  router.get('/select-organisation', csrf, asyncWrapper(getSelectOrganisation));
  router.post('/select-organisation', csrf, asyncWrapper(postSelectOrganisation));

  return router;
};

module.exports = action;
