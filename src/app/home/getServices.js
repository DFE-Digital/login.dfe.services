'use strict';
const { getServicesForUser } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const Account = require('./../../infrastructure/account');
const appCache = require('./../../infrastructure/helpers/AppCache');

const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');
const {
  getOrganisationAndServiceForUser,
  getPendingRequestsAssociatedWithUser,
  getLatestRequestAssociatedWithUser,
} = require('./../../infrastructure/organisations');
const config = require('./../../infrastructure/config');

const getAndMapServices = async (account, correlationId) => {
  const user = await Account.getById(account.id);
  const isMigrated = user && user.claims ? user.claims.isMigrated : false;
  const serviceAccess = (await getServicesForUser(account.id, correlationId)) || [];
  let services = serviceAccess.map((sa) => ({
    id: sa.serviceId,
    name: '',
    serviceUrl: '',
    roles: sa.roles,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    if (service && !service.isRole) {
      let application = appCache.retrieve(service.id);

      if (!application) {
        application = await getApplication(service.id);
        appCache.save(service.id, application);
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
      approvers = organisation.approvers.map((approver) => {
        return allApprovers
          .filter((x) => x.claims.sub.toLowerCase() === approver.user_id.toLowerCase())
          .map((m) => m.claims);
      });
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
  if (config.toggles.useRequestOrganisation && services.length <= 0) {
    taskListStatusAndApprovers = await getTasksListStatusAndApprovers(account, req.id);
  }

  let addServicesRedirect;
  let editServicesRedirect;
  const approverOrgs = req.userOrganisations ? req.userOrganisations.filter((x) => x.role.id === 10000) : null;
  if (approverOrgs && approverOrgs.length > 0) {
    req.session.user = {
      uid: req.user.sub,
      firstName: req.user.given_name,
      lastName: req.user.family_name,
      email: req.user.email,
      services: [],
    };
    if (approverOrgs.length === 1) {
      addServicesRedirect = `approvals/${approverOrgs[0].organisation.id}/users/${req.user.sub}/associate-services`;
      editServicesRedirect = `approvals/${approverOrgs[0].organisation.id}/users/${req.user.sub}`;
    } else {
      addServicesRedirect = '/approvals/select-organisation?services=add';
      editServicesRedirect = '/approvals/select-organisation?services=edit';
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
    enableTaskList: config.toggles.useRequestOrganisation,
    addServicesRedirect,
    editServicesRedirect,
  });
};

module.exports = getServices;
