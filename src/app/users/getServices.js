'use strict';
const { getUserDetails, getAllServicesForUserInOrg, isSelfManagement } = require('./utils');
const { getAllServices } = require('./../../infrastructure/applications');
const Account = require('./../../infrastructure/account');

const action = async (req, res) => {
  const user = await getUserDetails(req);
  const userMigratedDetails = req.params.uid.startsWith('inv-')
    ? await Account.getInvitationById(req.params.uid.substr(4))
    : await Account.getById(req.params.uid);
  let isMigrated;
  if (userMigratedDetails) {
    isMigrated = userMigratedDetails.claims ? userMigratedDetails.claims.isMigrated : userMigratedDetails.isMigrated;
  }
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const servicesForUser = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);
  const allServices = await getAllServices();
  const externalServices = allServices.services.filter(
    (x) =>
      x.isExternalService === true &&
      !(x.relyingParty && x.relyingParty.params && x.relyingParty.params.hideApprover === 'true'),
  );

  const displayedServices = servicesForUser.filter((x) => externalServices.find((y) => y.id === x.id));

  // temporary disabled myesf service for users who were invited
  if (isMigrated) {
    displayedServices.push({
      name: 'Manage Your Education and Skills Funding',
      disabled: true,
      status: {
        description: '18 March 2020',
      },
    });
  }

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
    services: displayedServices,
    user,
    isInvitation: req.params.uid.startsWith('inv-'),
    isSelfManage: isSelfManagement(req),
  });
};

module.exports = action;
