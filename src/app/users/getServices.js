'use strict';
const { getUserDetails, getAllServicesForUserInOrg, isSelfManagement, getApproverOrgsFromReq } = require('./utils');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const Account = require('./../../infrastructure/account');
const { getOrganisationAndServiceForUser } = require('./../../infrastructure/organisations');

const action = async (req, res) => {
  const user = await getUserDetails(req);
  // TODO check what happens with invited users (test with Brian Corr DfE)
  const userMigratedDetails = req.params.uid.startsWith('inv-')
    ? await Account.getInvitationById(req.params.uid.substr(4))
    : await Account.getById(req.params.uid);
  let isMigrated;
  if (userMigratedDetails) {
    isMigrated = userMigratedDetails.claims ? userMigratedDetails.claims.isMigrated : userMigratedDetails.isMigrated;
  }

  const approverOrgs = getApproverOrgsFromReq(req);
  const userOrgs = await getOrganisationAndServiceForUser(req.params.uid, req.id);

  // get array of org ids where current user is an approver
  const visibleUserOrgs = userOrgs.filter((x) => approverOrgs.find((y) => y.organisation.id === x.organisation.id));

  // prepare details for all services to start matching and building details for the view
  const allServices = await checkCacheForAllServices();
  const externalServices = allServices.services.filter(
    (x) =>
      x.isExternalService === true &&
      !(x.relyingParty && x.relyingParty.params && x.relyingParty.params.hideApprover === 'true'),
  );

  visibleUserOrgs.forEach((userOrg) => {
    userOrg.displayedServices = userOrg.services.filter((x) => externalServices.find((y) => y.id === x.id));
    userOrg.services.forEach((service) => {
      const serviceDetails = allServices.services.find((x) => x.id === service.id);
      service.name = serviceDetails.name;
    });
  });

  if (!req.session.user) {
    req.session.user = {};
  }
  req.session.user.uid = user.id;
  req.session.user.firstName = user.firstName;
  req.session.user.lastName = user.lastName;
  req.session.user.email = user.email;
  req.session.user.services = [];

  return res.render('users/views/services', {
    backLink: './',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    visibleUserOrgs,
    user,
    isInvitation: req.params.uid.startsWith('inv-'),
    isSelfManage: isSelfManagement(req),
  });
};

module.exports = action;
