'use strict';
const { getServicesForUser } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');
const { getOrganisationAndServiceForUser, getPendingRequestsAssociatedWithUser, getLatestRequestAssociatedWithUser } = require('./../../infrastructure/organisations');

const getAndMapServices = async (account, correlationId) => {
  const serviceAccess = (await getServicesForUser(account.id, correlationId)) || [];
  const services = serviceAccess.map((sa) => ({
    id: sa.serviceId,
    name: '',
    serviceUrl: '',
    roles: sa.roles,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    if (service && !service.isRole) {
      const application = await getApplication(service.id);
      if (application.relyingParty && application.relyingParty.params && application.relyingParty.params.showRolesOnServices === 'true') {
        for (let r = 0; r < service.roles.length; r++) {
          const role = service.roles[r];
          services.push({
            id: role.id,
            name: role.name,
            serviceUrl: application.relyingParty && application.relyingParty.params && application.relyingParty.params[role.code] ? application.relyingParty.params[role.code] : '',
            isRole: true,
          })
        }
        service.hideService = true;
      } else {
        service.name = application.name;
        service.serviceUrl = (application.relyingParty ? (application.relyingParty.service_home || application.relyingParty.redirect_uris[0]) : undefined) || '#';
      }
    }
  }
  return sortBy(services, 'name');
};

const getApproversDetails = async (organisations) => {
  const allApproverIds = flatten(organisations.map((org) => org.approvers));
  const distinctApproverIds = uniq(allApproverIds);
  if (distinctApproverIds.length === 0) {
    return [];
  }
  return Account.getUsersByIdV2(distinctApproverIds);
};

// This function should execute only if there are no services available for the user.
const getTasksListStatusAndApprovers = async (account, correlationId) => {
  let taskListStatus = {hasOrgAssigned :false, hasServiceAssigned :false, hasRequestPending :false, hasRequestRejected: false, approverForOrg: null};
  let approvers=[];
  const organisations = await getOrganisationAndServiceForUser(account.id, correlationId);
  const allApprovers = await getApproversDetails(organisations, correlationId)

  // Check for organisations and services for the user account
  if(organisations && organisations.length > 0) {
    taskListStatus.hasOrgAssigned = true;
    organisations.forEach((organisation) => {
      if(organisation.services && organisation.services.length > 0){
        taskListStatus.hasServiceAssigned = true;
      }
      if(organisation.role.id === 10000) {
        taskListStatus.approverForOrg = organisation.organisation.id;
      }
      approvers = organisation.approvers.map((approverId) => {
        return allApprovers.find(x => x.id.toLowerCase() === approverId.toLowerCase());
      });
    });
  }else{
    // If no organisations assigned to a user account then check for pending requests.
    const pendingUserRequests = await getPendingRequestsAssociatedWithUser(account.id, correlationId);
    if(pendingUserRequests && pendingUserRequests.length > 0) {
          taskListStatus.hasRequestPending = true;
          taskListStatus.hasOrgAssigned = true; // User has placed a request to add org, and the request is in pending state so this is true.
    }else{
      const request = await getLatestRequestAssociatedWithUser(account.id, correlationId);
      if(request && request.status.id===-1){
        taskListStatus.hasRequestRejected = true;
      }
    }
  }
  return {taskListStatus, approvers};
};

const getServices = async (req, res) => {
  const account = Account.fromContext(req.user);
  const allServices = await getAndMapServices(account, req.id);
  const services = uniqBy(allServices.filter(x => !x.hideService), 'id');
  const approverRequests = req.organisationRequests || [];
  if(services.length <= 0) {
    const taskListStatusAndApprovers = await getTasksListStatusAndApprovers(account, req.id);
    return res.render('home/views/services', {
      title: 'Access DfE services',
      user: account,
      services,
      currentPage: 'services',
      approverRequests,
      taskListStatus : taskListStatusAndApprovers.taskListStatus,
      approvers : taskListStatusAndApprovers.approvers,
    });
  }else {
    return res.render('home/views/services', {
      title: 'Access DfE services',
      user: account,
      services,
      currentPage: 'services',
      approverRequests,
    });
  }
};

module.exports = getServices;
