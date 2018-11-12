'use strict';
const logger = require('./../../infrastructure/logger');
const { getUserDetails } = require('./utils');


const get = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  return res.render('users/views/confirmEditService', {
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    currentPage: 'users',
    backLink: 'edit-service',
    user,
    roles: req.session.service.roles,
  });
};

module.exports = {
  get,
};
