'use strict';
const { getUserDetails, getAllServicesForUserInOrg } = require('./utils');

const action = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const servicesForUser = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);

  req.session.user = {
    name: user.name,
    email: user.email,
  };

  return res.render('users/views/services', {
    backLink: 'users-list',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    services: servicesForUser,
    user,
  });
};

module.exports = action;
