const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const Account = require("./../../infrastructure/account");
const flatten = require("lodash/flatten");
const uniq = require("lodash/uniq");
const {
  checkCacheForAllServices,
} = require("../../infrastructure/helpers/allServicesAppCache");

const {
  getRequestById,
  getOrganisationById,
  getOrganisationAndServiceForUser,
} = require("./../../infrastructure/organisations");

const { services } = require("login.dfe.dao");

const getSubServiceRequestVieModel = async (model, requestId, req) => {
  let viewModel = {};
  viewModel.role_ids = [];
  viewModel.roles = [];
  viewModel.endUsersEmail = model.endUsersEmail;
  viewModel.endUsersFamilyName = model.endUsersFamilyName;
  viewModel.endUsersGivenName = model.endUsersGivenName;
  viewModel.org_name = model.organisation.name;
  viewModel.created_date = model.dataValues.createdAt;
  viewModel.org_id = model.organisation.id;
  viewModel.user_id = model.dataValues.user_id;
  if (model.dataValues.role_ids.includes(",")) {
    let tempArry = model.dataValues.role_ids.split(",");
    tempArry.forEach((item) => {
      viewModel.role_ids.push(item);
    });
  } else {
    viewModel.role_ids.push(model.dataValues.role_ids);
  }
  let roles = {};
  viewModel.role_ids = viewModel.role_ids.map((x) => (roles[x] = { id: x }));
  viewModel.service_id = model.dataValues.service_id;
  viewModel.status = model.dataValues.status;
  viewModel.actioned_reason = model.dataValues.actioned_reason;
  viewModel.actioned_by = model.dataValues.actioned_by;
  viewModel.reason = model.dataValues.reason;
  viewModel.csrfToken = null;
  viewModel.selectedResponse = " ";
  viewModel.validationMessages = {};
  viewModel.currentPage = "requests";
  viewModel.backLink = "/access-requests/requests";
  viewModel.cancelLink = "/access-requests/requests";
  viewModel = await getRoleAndServiceNames(viewModel, requestId, req);
  return viewModel;
};

const getRoleAndServiceNames = async (subModel, requestId, req) => {
  let serviceId = subModel.service_id;
  const allServices = await checkCacheForAllServices(requestId);
  const serviceDetails = allServices.services.find((x) => x.id === serviceId);
  const allRolesOfServiceUnsorted = await getServiceRolesRaw({ serviceId });
  const allRolesOfService = allRolesOfServiceUnsorted.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  subModel.roles = [];
  if (serviceDetails.name) subModel.Service_name = serviceDetails.name;
  if (req !== undefined) {
    req.session.roles = [];
  }
  ////add loop here to populate role and session role
  subModel.role_ids.forEach((item) => {
    let roleDetails = allRolesOfService.find((x) => x.id === item.id);
    if (req !== undefined && roleDetails) {
      req.session.roles.push(roleDetails);
    }
    subModel.roles.push(roleDetails);
  });

  return subModel;
};

const getAndMapOrgRequest = async (req) => {
  const request = await getRequestById(req.params.rid, req.id);
  let mappedRequest;
  if (request) {
    const approver = request.actioned_by
      ? await Account.getById(request.actioned_by)
      : null;
    const user = await Account.getById(request.user_id);
    const usersName = user
      ? `${user.claims.given_name} ${user.claims.family_name}`
      : "";
    const usersEmail = user ? user.claims.email : "";
    const approverName = approver
      ? `${approver.given_name} ${approver.family_name}`
      : "";
    const approverEmail = approver ? approver.email : "";
    mappedRequest = Object.assign(
      { usersName, usersEmail, approverName, approverEmail },
      request,
    );
  }
  return mappedRequest;
};

const getUserDetails = async (usersForApproval) => {
  const allUserId = flatten(usersForApproval.map((user) => user.user_id));
  if (allUserId.length === 0) {
    return [];
  }
  const distinctUserIds = uniq(allUserId);
  return await Account.getUsersById(distinctUserIds);
};

const getAndMapServiceRequest = async (serviceReqId) => {
  const userServiceRequest = await services.getUserServiceRequest(serviceReqId);
  let mappedServiceRequest;
  if (userServiceRequest) {
    const approver = userServiceRequest.actioned_by
      ? await Account.getById(userServiceRequest.actioned_by)
      : null;
    const endUser = await Account.getById(userServiceRequest.user_id);
    const endUsersGivenName = endUser ? `${endUser.claims.given_name}` : "";
    const endUsersFamilyName = endUser ? `${endUser.claims.family_name}` : "";
    const endUsersEmail = endUser ? endUser.claims.email : "";
    const approverName = approver
      ? `${approver.given_name} ${approver.family_name}`
      : "";
    const approverEmail = approver ? approver.email : "";
    const organisation = await getOrganisationById(
      userServiceRequest.organisation_id,
      serviceReqId,
    );
    mappedServiceRequest = Object.assign(
      {
        endUsersGivenName,
        endUsersFamilyName,
        endUsersEmail,
        approverName,
        approverEmail,
      },
      { organisation },
      userServiceRequest,
    );
  }
  return mappedServiceRequest;
};

const generateFlashMessages = (
  requestType,
  requestStatus,
  approverEmail,
  endUsersGivenName,
  endUsersFamilyName,
  orgOrServName,
) => {
  const capitalisedReqType =
    requestType[0].toUpperCase() + requestType.substring(1);
  const capitalisedGivenName =
    endUsersGivenName[0].toUpperCase() + endUsersGivenName.substring(1);
  const capitalisedFamilyName =
    endUsersFamilyName[0].toUpperCase() + endUsersFamilyName.substring(1);
  let action;

  switch (requestStatus) {
    case 1:
      action = "approved";
      break;
    case -1:
      action = "rejected";
      break;
  }
  const flashMessages = {
    title: "Important",
    heading: `${capitalisedReqType} request already ${action}: ${orgOrServName}`,
    message: `${approverEmail} has already responded to the ${requestType} request.<br>${capitalisedGivenName} ${capitalisedFamilyName} has received an email to tell them their request has been ${action}. No further action is needed.`,
  };
  return flashMessages;
};

const isAllowedToApproveReq = async (req, res, next) => {
  if (req.userOrganisations && req.params.rid) {
    const serviceSubServiceReq = await services.getUserServiceRequest(
      req.params.rid,
    );
    const orgId = serviceSubServiceReq.dataValues.organisation_id;
    const userApproverOrgs = req.userOrganisations.filter(
      (x) => x.role.id === 10000,
    );
    if (
      userApproverOrgs.find(
        (x) => x.organisation.id.toLowerCase() === orgId.toLowerCase(),
      )
    ) {
      return next();
    }
  }
  return res.status(401).render("errors/views/notAuthorised");
};

const getOrganisationPermissionLevel = async (userId, orgId, correlationId) => {
  try {
    const userOrganisations = await getOrganisationAndServiceForUser(userId);
    const userOrganisationDetails = userOrganisations.find(
      (x) => x.organisation.id === orgId,
    );

    if (userOrganisationDetails) {
      return {
        id: userOrganisationDetails.role.id,
        name: userOrganisationDetails.role.name,
      };
    } else {
      return {};
    }
  } catch (error) {
    throw new Error(
      `Failed to retrieve user's organisation permission level for request ID: ${correlationId}. Error: ${error.message}`,
    );
  }
};

module.exports = {
  getAndMapOrgRequest,
  getUserDetails,
  getRoleAndServiceNames,
  getSubServiceRequestVieModel,
  getAndMapServiceRequest,
  generateFlashMessages,
  isAllowedToApproveReq,
  getOrganisationPermissionLevel,
};
