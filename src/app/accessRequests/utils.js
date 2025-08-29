const config = require("./../../infrastructure/config");
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
const { getUserService } = require("login.dfe.api-client/users");

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

/**
 * Retrieves and maps data for a user organisation request.  Requires `params.rid` to be
 * populated to find the request.
 *
 * @param {Object} [req] - request object that will contain the user organisation request id
 * @returns {Object} An object representing the request with the data tidied and mapped
 */
const getAndMapOrgRequest = async (req) => {
  const request = await getRequestById(req.params.rid, req.id);
  let mappedRequest;
  if (request) {
    let approverName = "";
    let approverEmail = "";

    const approver = request.actioned_by
      ? await Account.getById(request.actioned_by)
      : null;

    if (approver) {
      const supportServiceId = config.access.identifiers.service;
      const supportOrganisationId = config.access.identifiers.organisation;

      // If approver is present, check if they're a support user by calling getUserService from api-client
      const response = await getUserService({
        userId: request.actioned_by,
        serviceId: supportServiceId,
        organisationId: supportOrganisationId,
      });
      if (response !== null) {
        approverName = "DfE Sign-in support team";
        approverEmail = "NewApprover.dfesignin@education.gov.uk";
      } else {
        approverName = approver.name;
        approverEmail = approver.email;
      }
    }

    const user = await Account.getById(request.user_id);
    const usersName = user ? user.name : "";
    const usersEmail = user ? user.email : "";

    mappedRequest = Object.assign(
      { usersName, usersEmail, approverName, approverEmail },
      request,
    );
  }
  return mappedRequest;
};

/**
 * Deduplicates provided array of user ids and searches for user data based on those ids
 *
 * @param {Array} [usersForApproval] - Array of userIds
 * @returns {Array} An array of user details for the provided ids
 */
const getUserDetails = async (usersForApproval) => {
  const allUserId = flatten(usersForApproval.map((user) => user.user_id));
  if (allUserId.length === 0) {
    return [];
  }
  const distinctUserIds = uniq(allUserId);
  return await Account.getUsersById(distinctUserIds);
};

/**
 * Retrieves and maps service and sub-service (role) data for a user service request.
 *
 * Adds `serviceName`, a sorted `subServices` array (role objects) based on `roleIds`,
 * and `subServiceNames` (comma-separated role names from `subServices`).
 * Returns a new object; does not mutate the input.
 *
 * @param {Object} userRequest
 * @param {string|number} userRequest.serviceId - The service ID on the request.
 * @param {string|number} userRequest.requestId - The request ID (used for caching lookup).
 * @param {Array<string|number>} [userRequest.roleIds] - Role IDs to attach as subServices.
 * @returns {Promise<Object>} A new request object with `serviceName` (if found), `subServices` (roles),
 * and `subServiceNames` (if at least one role name is present).
 */
const getMappedRequestServiceWithSubServices = async (userRequest) => {
  if (!userRequest || typeof userRequest !== "object") {
    throw new TypeError("userRequest must be a non-null object");
  }

  const { service_id, id, role_ids = [] } = userRequest;

  // Fetch concurrently
  const [allServices, allRolesOfServiceUnsorted] = await Promise.all([
    checkCacheForAllServices(id),
    getServiceRolesRaw({ serviceId: service_id }),
  ]);

  // Resolve service name (== handles '1' vs 1 safely here)
  const serviceName = Array.isArray(allServices?.services)
    ? allServices.services.find((s) => s?.id == service_id)?.name
    : undefined;

  // Ensure an array
  const roles = Array.isArray(allRolesOfServiceUnsorted)
    ? allRolesOfServiceUnsorted
    : [];

  // Build a lookup map with **string** keys
  const rolesById = new Map(roles.map((r) => [String(r?.id), r]));

  // Filter, dedupe, and normalize **role_ids** to strings
  const uniqueRoleIds = [
    ...new Set(
      (Array.isArray(role_ids) ? role_ids : [])
        .filter((id) => id != null)
        .map((id) => String(id)),
    ),
  ];

  // Map the role ids to role objects via the Map, filter unknowns, and sort by name
  const subServices = uniqueRoleIds
    .map((id) => rolesById.get(id))
    .filter(Boolean)
    .sort((a, b) => {
      const an = a?.name ?? "";
      const bn = b?.name ?? "";
      return an.localeCompare(bn, undefined, { sensitivity: "base" });
    });

  const subServiceNames = subServices
    .map((r) => r?.name?.trim())
    .filter(Boolean)
    .join(", ");

  return {
    ...userRequest,
    ...(serviceName ? { serviceName } : {}),
    subServices,
    ...(subServiceNames ? { subServiceNames } : {}),
  };
};

/**
 * Retrieves and maps data for a user service request
 *
 * @param {String} [serviceReqId] - Id of the user service request
 * @returns {Object} An object representing the request with the data tidied and mapped
 */
const getAndMapServiceRequest = async (serviceReqId) => {
  const userServiceRequest = await services.getUserServiceRequest(serviceReqId);
  let mappedServiceRequest;
  if (userServiceRequest) {
    let approverName = "";
    let approverEmail = "";

    const approver = userServiceRequest.actioned_by
      ? await Account.getById(userServiceRequest.actioned_by)
      : null;

    if (approver) {
      const supportServiceId = config.access.identifiers.service;
      const supportOrganisationId = config.access.identifiers.organisation;

      // If approver is present, check if they're a support user by calling getUserService from api-client
      const response = await getUserService({
        userId: userServiceRequest.actioned_by,
        serviceId: supportServiceId,
        organisationId: supportOrganisationId,
      });
      if (response !== null) {
        approverName = "DfE Sign-in support team";
        approverEmail = "NewApprover.dfesignin@education.gov.uk";
      } else {
        approverName = approver.name;
        approverEmail = approver.email;
      }
    }

    const endUser = await Account.getById(userServiceRequest.user_id);
    const endUsersGivenName = endUser ? `${endUser.claims.given_name}` : "";
    const endUsersFamilyName = endUser ? `${endUser.claims.family_name}` : "";
    const endUsersEmail = endUser ? endUser.claims.email : "";

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

/**
 * Middleware to verify a user has the approver role for an organisation when
 * dealing with service requests.
 */
const isAllowedToApproveServiceReq = async (req, res, next) => {
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

/**
 * Middleware to verify a user has the approver role for an organisation when
 * dealing with organisation requests.
 */
const isAllowedToApproveOrganisationReq = async (req, res, next) => {
  if (req.userOrganisations && req.params.rid) {
    const request = await getRequestById(req.params.rid, req.id);
    const orgId = request.organisation_id;
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
  isAllowedToApproveServiceReq,
  isAllowedToApproveOrganisationReq,
  getOrganisationPermissionLevel,
  getMappedRequestServiceWithSubServices,
};
