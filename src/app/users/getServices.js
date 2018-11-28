'use strict';
const { getUserDetails, getAllServicesForUserInOrg } = require('./utils');

const action = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const servicesForUser = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);
  if (!req.session.user) {
    req.session.user = {};
  }
  req.session.user.uid = user.id;
  req.session.user.firstName = user.firstName;
  req.session.user.lastName = user.lastName;
  req.session.user.email = user.email;
  req.session.user.services = [];

  return res.render('users/views/services', {
    backLink: '../',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisationDetails,
    services: servicesForUser,
    user,
  });
};

module.exports = action;
