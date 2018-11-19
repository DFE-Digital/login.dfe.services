'use strict';
const { getUserDetails, getAllServicesForUserInOrg } = require('./utils');

const action = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const servicesForUser = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);

  return res.render('users/views/services', {
    backLink: 'users-list',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisationDetails,
    services: servicesForUser,
    user,
  });
};

module.exports = action;
