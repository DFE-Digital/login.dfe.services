'use strict';
const { getById } = require('./../../infrastructure/search');
const { mapUserStatus } = require('./../../infrastructure/utils');
const {
  getServicesForUser,
  getServicesForInvitation,
  getSingleUserService,
  getSingleInvitationService,
} = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const { actions } = require('../constans/actions');
const moment = require('moment');
const sortBy = require('lodash/sortBy');
const numberOfHours = 24;
const getUserDetails = async (req) => {
  const uid = req.params.uid;
  const user = await getById(uid, req.id);
  const organisationDetails = user.organisations.find((x) => x.id === req.params.orgId);
  return {
    id: uid,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: mapUserStatus(user.statusId),
    organisation: organisationDetails,
    lastLogin: user.lastLogin,
    deactivated: user.statusId === -2,
  };
};

const getAllServicesForUserInOrg = async (userId, organisationId, correlationId) => {
  const allUserServices = userId.startsWith('inv-')
    ? await getServicesForInvitation(userId.substr(4), correlationId)
    : await getServicesForUser(userId, correlationId);
  if (!allUserServices) {
    return [];
  }

  const userServicesForOrg = allUserServices.filter((x) => x.organisationId === organisationId);
  const services = userServicesForOrg.map((service) => ({
    id: service.serviceId,
    dateActivated: service.accessGrantedOn,
    name: '',
    status: null,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const application = await getApplication(service.id);
    service.name = application.name;
    service.status = mapUserStatus(service.status);
  }
  return sortBy(services, 'name');
};

const getSingleServiceForUser = async (userId, organisationId, serviceId, correlationId) => {
  const userService = userId.startsWith('inv-')
    ? await getSingleInvitationService(userId.substr(4), serviceId, organisationId, correlationId)
    : await getSingleUserService(userId, serviceId, organisationId, correlationId);
  const application = await getApplication(userService.serviceId);
  return {
    id: userService.serviceId,
    roles: userService.roles,
    name: application.name,
  };
};

const delay = async (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const waitForIndexToUpdate = async (uid, updatedCheck) => {
  const abandonTime = Date.now() + 10000;
  let hasBeenUpdated = false;
  while (!hasBeenUpdated && Date.now() < abandonTime) {
    const updated = await getById(uid);
    if (updatedCheck) {
      hasBeenUpdated = updatedCheck(updated);
    } else {
      hasBeenUpdated = updated;
    }
    if (!hasBeenUpdated) {
      await delay(200);
    }
  }
};

const isSelfManagement = (req) => {
  return req.user.sub === req.session.user.uid;
};

const isUserManagement = (req) => {
  return req.query.manage_users === 'true' || isOrganisationInvite(req) || isViewOrganisationRequests(req);
};

const isRequestService = (req) => {
  return req.query.action === actions.REQUEST_SERVICE;
};

const isManageUserService = (req) => {
  return req.query.action === actions.MANAGE_SERVICE;
};

const isRequestServiceInSession = (req) => {
  return req.session.action === actions.REQUEST_SERVICE;
};

const isAddService = (req) => {
  return req.query.action === actions.ADD_SERVICE;
};

const isEditService = (req) => {
  return req.query.action === actions.EDIT_SERVICE;
};

const isRemoveService = (req) => {
  return req.query.action === actions.REMOVE_SERVICE;
};

const isOrganisationInvite = (req) => {
  return req.query.action === actions.ORG_INVITE;
};

const isViewOrganisationRequests = (req) => {
  return req.query.action === actions.VIEW_ORG_REQUESTS;
};

const isReviewServiceReqAmendRole = (req) => {
  return (
    req.query.action === actions.REVIEW_SERVICE_REQ_ROLE &&
    req.session.reviewServiceRequest.serviceReqId &&
    req.session.reviewServiceRequest.serviceId
  );
};

const isReviewServiceReqAmendService = (req) => {
  return (
    req.query.action === actions.REVIEW_SERVICE_REQ_SERVICE &&
    req.session.reviewServiceRequest.serviceReqId &&
    req.session.reviewServiceRequest.serviceId
  );
};

const isReviewSubServiceRequest = (req) => {
  return req.query.actions === actions.REVIEW_SUBSERVICE_REQUEST;
};

const getApproverOrgsFromReq = (req) => {
  if (req.userOrganisations) {
    return req.userOrganisations.filter((x) => x.role.id === 10000);
  }
  return [];
};

const getUserOrgsFromReq = (req) => {
  return req.userOrganisations;
};

const isUserApprover = (req) => {
  if (req.userOrganisations) {
    return req.userOrganisations.filter((x) => x.role.id === 10000).length > 0;
  }
  return false;
};

const isUserEndUser = (req) => {
  if (req.userOrganisations) {
    return req.userOrganisations.filter((x) => x.role.id === 0).length > 0;
  }
  return false;
};

const getOrgNaturalIdentifiers = (org) => {
  const naturalIdentifiers = [];
  const urn = org.URN || org.urn;
  const uid = org.UID || org.uid;
  const ukprn = org.UKPRN || org.ukprn;
  if (urn) {
    naturalIdentifiers.push(`URN: ${urn}`);
  }
  if (uid) {
    naturalIdentifiers.push(`UID: ${uid}`);
  }
  if (ukprn) {
    naturalIdentifiers.push(`UKPRN: ${ukprn}`);
  }
  return naturalIdentifiers;
};

const isOrgEndUser = (userOrganisations, orgId) => {
  if (userOrganisations) {
    const org = userOrganisations.filter((x) => x.organisation.id === orgId);
    return org.filter((x) => x.role.id === 0).length > 0;
  }
  return false;
};
const isLoginOver24 = (last_login, prev_login) => {
  let a = moment(last_login, "HH:mm")
  let b = moment(prev_login, "HH:mm")
  let checkfor24 = a.diff(b, 'hours');
  if(checkfor24 > numberOfHours)
  {
    return true;
  }
  return false;
};
const isMultipleRolesAllowed = (serviceDetails, numberOfRolesAvailable) => {
  const maximumRolesAllowed = serviceDetails?.relyingParty?.params?.maximumRolesAllowed;
  const minimumRolesRequired = serviceDetails?.relyingParty?.params?.minimumRolesRequired;

  const maxRoles = parseInt(maximumRolesAllowed, 10);
  const minRoles = parseInt(minimumRolesRequired, 10);

  if (numberOfRolesAvailable <= 1) {
    return false;
  } else {
    if (isNaN(maxRoles) && isNaN(minRoles)) {
      return true;
    }
    if (isNaN(maxRoles) && minRoles >= 1) {
      return true;
    }

    if (maxRoles >= 2 || minRoles >= 2) {
      return true;
    }

    if (maxRoles === 1 && (isNaN(minRoles) || minRoles === 0)) {
      return false;
    }

    return false;
  }
};

const RoleSelectionConstraintCheck = (serviceRoles, roleSelectionConstraint) => {
  try {
    let roleFoundCount = 0;
    if (roleSelectionConstraint) {
      let roleIds = roleSelectionConstraint.split(',').map( (role) => role.trim());
      serviceRoles.map( (role) => {
        if (roleIds.includes(role.id)) {
          roleFoundCount += 1;
        }
      });
    }

    if (roleFoundCount >= 2) {
      return true;
    } 
    return false;
  } catch (e) {
    return false;
  }
 
  
}

module.exports = {
  getUserDetails,
  getAllServicesForUserInOrg,
  getSingleServiceForUser,
  waitForIndexToUpdate,
  isSelfManagement,
  isUserManagement,
  getApproverOrgsFromReq,
  getOrgNaturalIdentifiers,
  getUserOrgsFromReq,
  isUserApprover,
  isUserEndUser,
  isOrganisationInvite,
  isViewOrganisationRequests,
  isReviewServiceReqAmendRole,
  isReviewServiceReqAmendService,
  isRequestService,
  isManageUserService,
  isRequestServiceInSession,
  isAddService,
  isEditService,
  isRemoveService,
  isOrgEndUser,
  isReviewSubServiceRequest,
  isMultipleRolesAllowed,
  isLoginOver24,
  RoleSelectionConstraintCheck,
};
