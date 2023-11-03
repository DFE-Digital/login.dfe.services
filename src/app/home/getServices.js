'use strict';

const { getServicesForUser } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const Account = require('./../../infrastructure/account');
const appCache = require('./../../infrastructure/helpers/AppCache');
const { directories } = require('login.dfe.dao');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');
const {
  getOrganisationAndServiceForUser,
  getPendingRequestsAssociatedWithUser,
  getLatestRequestAssociatedWithUser,
} = require('./../../infrastructure/organisations');
const { fetchSubServiceAddedBanners, jobTitleBannerHandler, fetchNewServiceBanners } = require('../home/userBannersHandlers');
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');
const { getApproverOrgsFromReq, isUserEndUser, isLoginOver24 } = require('../users/utils');
const { actions } = require('../constans/actions');
const flash = require('express-flash-2');

const pireanServices = process.env.PIREAN_SERVICES ? process.env.PIREAN_SERVICES.split(',') : [];
let user = null;

const getAndMapServices = async (account, correlationId) => {
  user = await Account.getById(account.id);
  const isMigrated = user && user.claims ? user.claims.isMigrated : false;
  const serviceAccess = (await getServicesForUser(account.id, correlationId)) || [];
  let services = serviceAccess.map((sa) => ({
    id: sa.serviceId,
    name: sa.name,
    serviceUrl: '',
    roles: sa.roles,
    accessGrantedOn: sa.accessGrantedOn,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    if (service && !service.isRole) {
      let application = appCache.retrieve(service.id);

      if (!application) {
        application = await getApplication(service.id);
        appCache.save(service.id, application);
        logger.info(`${service.id} adding to app cache`);
      } else {
        logger.info(`${service.id} available in the cache`);
      }

      if (
        application.relyingParty &&
        application.relyingParty.params &&
        application.relyingParty.params.showRolesOnServices === 'true'
      ) {
        for (let r = 0; r < service.roles.length; r++) {
          const role = service.roles[r];
          services.push({
            id: role.id,
            name: role.name,
            serviceUrl:
              application.relyingParty && application.relyingParty.params && application.relyingParty.params[role.code]
                ? application.relyingParty.params[role.code]
                : '',
            isRole: true,
          });
        }
        service.hideService = true;
      } else {
        service.name = application.name;
        service.description = application.description;
        service.serviceUrl =
          (application.relyingParty
            ? application.relyingParty.service_home || application.relyingParty.redirect_uris[0]
            : undefined) || '#';
      }
    }
  }

  // temporary disabled myesf service for users who were invited
  if (isMigrated) {
    services.push({
      name: 'Manage Your Education and Skills Funding',
      description:
        "Use this service to: sign documents, view your funding allocations, view the funding you've received, manage apprenticeship details, and tell us about subcontractors",
      disabled: true,
      date: '18 March 2020',
    });
  }
  return sortBy(services, 'name');
};

const getApproversDetails = async (organisations) => {
  const allApproverIds = flatten(organisations.map((org) => org.approvers));
  const approverIds = allApproverIds.map((approver) => approver.user_id);
  const distinctApproverIds = uniq(approverIds);
  if (distinctApproverIds.length === 0) {
    return [];
  }
  return Account.getUsersById(distinctApproverIds);
};

// This function should execute only if there are no services available for the user.
const getTasksListStatusAndApprovers = async (account, correlationId) => {
  let taskListStatus = {
    hasOrgAssigned: false,
    hasServiceAssigned: false,
    hasRequestPending: false,
    hasRequestRejected: false,
    approverForOrg: null,
    multiOrgDetails: { orgs: 0, approvers: 0 },
  };
  let approvers = [];
  const organisations = await getOrganisationAndServiceForUser(account.id, correlationId);
  const allApprovers = await getApproversDetails(organisations, correlationId);

  // Check for organisations and services for the user account
  if (organisations && organisations.length > 0) {
    taskListStatus.hasOrgAssigned = true;
    if (organisations) {
      taskListStatus.multiOrgDetails.orgs = organisations.length;
    }
    organisations.forEach((organisation) => {
      if (organisation.services && organisation.services.length > 0) {
        taskListStatus.hasServiceAssigned = true;
      }
      if (organisation.role.id === 10000) {
        taskListStatus.approverForOrg = organisation.organisation.id;
      }
      approvers = organisation.approvers
        .map((approverId) => {
          return allApprovers.find((x) => x.claims.sub.toLowerCase() === approverId.user_id.toLowerCase());
        })
        .filter((x) => x);
      if (approvers && approvers.length > 0) {
        ++taskListStatus.multiOrgDetails.approvers;
      }
    });
  } else {
    // If no organisations assigned to a user account then check for pending requests.
    const pendingUserRequests = await getPendingRequestsAssociatedWithUser(account.id, correlationId);
    if (pendingUserRequests && pendingUserRequests.length > 0) {
      taskListStatus.hasRequestPending = true;
      taskListStatus.hasOrgAssigned = true; // User has placed a request to add org, and the request is in pending state so this is true.
    } else {
      const request = await getLatestRequestAssociatedWithUser(account.id, correlationId);
      if (request && request.status.id === -1) {
        taskListStatus.hasRequestRejected = true;
      }
    }
  }
  return { taskListStatus, approvers };
};

const getServices = async (req, res) => {
  const account = Account.fromContext(req.user);
  const allServices = await getAndMapServices(account, req.id);
  const services = uniqBy(
    allServices.filter((x) => !x.hideService),
    'id',
  );
  const approverRequests = req.organisationRequests || [];
  let taskListStatusAndApprovers;
  if (services.length <= 0) {
    taskListStatusAndApprovers = await getTasksListStatusAndApprovers(account, req.id);
  }

  let addServicesRedirect;
  let editServicesRedirect;
  let removeServicesRedirect;
  let requestServicesRedirect;
  let isRequestServiceAllowed;

  const approverOrgs = getApproverOrgsFromReq(req);
  req.session.user = {
    uid: req.user.sub,
    firstName: req.user.given_name,
    lastName: req.user.family_name,
    email: req.user.email,
    services: [],
    orgCount: 0,
  };

  const isEndUser = isUserEndUser(req);

  if (approverOrgs && approverOrgs.length > 0) {
    if (approverOrgs.length === 1 && !isEndUser) {
      addServicesRedirect = `approvals/${approverOrgs[0].organisation.id}/users/${req.user.sub}/associate-services`;
    } else {
      addServicesRedirect = `/approvals/select-organisation?action=${actions.ADD_SERVICE}`;
    }
    editServicesRedirect = `/approvals/select-organisation-service?action=${actions.EDIT_SERVICE}`;
    removeServicesRedirect = `/approvals/select-organisation-service?action=${actions.REMOVE_SERVICE}`;
  } else {
    editServicesRedirect = `/approvals/select-organisation-service?action=${actions.EDIT_SERVICE}`;
    const organisations = await getOrganisationAndServiceForUser(account.id, req.id);
    const orgLength = organisations.length;

    if (isEndUser && orgLength > 0) {
      if (req.session.user) {
        req.session.user.orgCount = orgLength;
      }

      if (orgLength === 1) {
        const selectedOrganisation = organisations[0].organisation.id;
        if (req.session.user) {
          req.session.user.organisation = selectedOrganisation;
        }
        requestServicesRedirect = `/request-service/${selectedOrganisation}/users/${req.user.sub}`;
      } else {
        requestServicesRedirect = `/approvals/select-organisation?action=${actions.REQUEST_SERVICE}`;
      }
    }
  }

  isRequestServiceAllowed = !!requestServicesRedirect;
  const { jobTitle } = await Account.getById(req.user.id);
  //2: "job title" notification banner
  const useJobTitleBanner = await directories.fetchUserBanners(req.user.id, 2);
  let showJobTitleBanner = !useJobTitleBanner && !jobTitle;
  //checks for first login if null they havn't logged in yet
  if (user.claims.prev_login !== undefined && user.claims.prev_login !== null  && showJobTitleBanner) {
    //check last logged in if its within 24 hrs show banner
    const checkfor24 = isLoginOver24(user.claims.last_login, user.claims.prev_login);
    if (checkfor24) {
      //close by adding database
      await jobTitleBannerHandler(req, res, true);
      showJobTitleBanner = false;
    }
  }
  //-3: "Unacknowledged" banner for changed password
  const passwordChangedBanner = await directories.fetchUserBanners(req.user.id, -3);

  // 4: "Sub-service added" banners fetch
  const subServiceAddedBanners = req.user.id ? await fetchSubServiceAddedBanners(req.user.id) : null;

  logger.audit({
    type: 'Sign-in',
    subType: 'services',
    userId: req.user.sub,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} has accessed services`,
    meta: {
      email: req.user.email,
      client: config.loggerSettings.applicationName,
    },
  });

  const userPireanServices = services.filter((value) => pireanServices.includes(value.name));
  const newServiceBanner = await fetchNewServiceBanners(req.user.id, 5);
  if(newServiceBanner !== null && newServiceBanner !== undefined && newServiceBanner.length > 0)
  {
    if((res.locals.flash === undefined || res.locals.flash.title === undefined))
    {
      const checkfor24 = isLoginOver24(user.claims.last_login, user.claims.prev_login);
      if(!checkfor24){
        newServiceBanner.forEach((serviceItem) =>{
          res.flash(["success"], `${serviceItem.serviceName}`)
        });
      }else{
        newServiceBanner.forEach((serviceItem) =>{
          directories.deleteUserBanner(serviceItem.id);
        });
      }
    }
  }

  return res.render('home/views/services', {
    title: 'Access DfE services',
    user: account,
    services,
    currentPage: 'services',
    approverRequests,
    taskListStatus: taskListStatusAndApprovers ? taskListStatusAndApprovers.taskListStatus : null,
    approvers: taskListStatusAndApprovers ? taskListStatusAndApprovers.approvers : null,
    addServicesRedirect,
    editServicesRedirect,
    removeServicesRedirect,
    requestServicesRedirect,
    isRequestServiceAllowed,
    passwordChangedBanner,
    showJobTitleBanner,
    pireanServices,
    userPireanServices,
    subServiceAddedBanners,
  });
};

module.exports = getServices;
