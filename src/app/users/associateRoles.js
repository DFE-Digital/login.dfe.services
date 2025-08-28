const config = require("./../../infrastructure/config");
const {
  isSelfManagement,
  isRequestService,
  isManageUserService,
  isReviewServiceReqAmendRole,
  isReviewServiceReqAmendService,
  isMultipleRolesAllowed,
  RoleSelectionConstraintCheck,
} = require("./utils");
const { getServiceRaw } = require("login.dfe.api-client/services");
const {
  getOrganisationAndServiceForUserV2,
} = require("./../../infrastructure/organisations");
const PolicyEngine = require("login.dfe.policy-engine");
const policyEngine = new PolicyEngine(config);
const { actions } = require("../constans/actions");
const logger = require("../../infrastructure/logger");

const renderAssociateRolesPage = (req, res, model) => {
  const isSelfManage = isSelfManagement(req);
  res.render(
    `users/views/${isSelfManage ? "associateRolesRedesigned" : "associateRoles"}`,
    {
      ...model,
      currentPage: isSelfManage ? "services" : "users",
    },
  );
};

const buildBackLink = (req, currentServiceIndex) => {
  const isRequestServiceUrl = isRequestService(req);
  const isManageUserServiceUrl = isManageUserService(req);
  const isReviewServiceReqAmendRoleUrl = isReviewServiceReqAmendRole(req);
  const isReviewServiceReqAmendServiceUrl = isReviewServiceReqAmendService(req);

  const baseUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`;
  if (isManageUserServiceUrl) {
    return `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-details`;
  } else if (
    isRequestServiceUrl &&
    req.session.user &&
    req.session.user.serviceId &&
    req.session.user.roleIds
  ) {
    const sid = req.session.user.serviceId;
    const roleIds = encodeURIComponent(
      JSON.stringify(req.session.user.roleIds),
    );
    return `/request-service/${req.params.orgId}/users/${req.params.uid}/services/${sid}/roles/${roleIds}/approve`;
  } else if (isReviewServiceReqAmendRoleUrl) {
    const { serviceReqId, serviceId, selectedRoleIds } =
      req.session.reviewServiceRequest;
    const rolesIds = encodeURIComponent(selectedRoleIds);
    return `${baseUrl}/access-requests/service-requests/${serviceReqId}/services/${serviceId}/roles/${rolesIds}`;
  } else if (isReviewServiceReqAmendServiceUrl) {
    const action = actions.REVIEW_SERVICE_REQ_SERVICE;
    return `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services?action=${action}`;
  } else if (
    req.query.action === actions.REQUEST_SUB_SERVICE &&
    req.session.subServiceReqId &&
    req.session
  ) {
    return `${baseUrl}/request-service/${req.params.orgId}/users/${req.session.user.uid}/services/${
      req.params.sid
    }/roles/${encodeURIComponent(JSON.stringify(req.session.user.roleIds))}/${
      req.session.subServiceReqId
    }/approve-roles-request`;
  }

  let backRedirect = `/approvals/${req.params.orgId}/users`;
  if (req.params.uid) {
    backRedirect += `/${req.params.uid}`;
  }
  backRedirect += `/associate-services`;
  if (currentServiceIndex > 0) {
    // go back to previous select role page for previous service as we had multi-select for services
    backRedirect += `/${req.session.user.services[currentServiceIndex - 1].serviceId}`;
  }
  return backRedirect;
};

const buildNextLink = (req, selectedRoles) => {
  const baseUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`;
  if (req.session.user.uid) {
    if (
      req.query.action === actions.REQUEST_SUB_SERVICE &&
      req.session.subServiceReqId
    ) {
      return `${baseUrl}/request-service/${req.params.orgId}/users/${req.session.user.uid}/services/${
        req.params.sid
      }/roles/${encodeURIComponent(JSON.stringify(selectedRoles))}/${
        req.session.subServiceReqId
      }/approve-roles-request`;
    } else if (
      (req.query.action === actions.REVIEW_SERVICE_REQ_ROLE ||
        actions.REVIEW_SERVICE_REQ_SERVICE) &&
      req.session?.reviewServiceRequest?.serviceReqId &&
      req.session?.reviewServiceRequest?.serviceId
    ) {
      const { serviceReqId } = req.session.reviewServiceRequest;
      const rolesList =
        selectedRoles.length > 0 ? encodeURIComponent(selectedRoles) : "null";
      return `${baseUrl}/access-requests/service-requests/${serviceReqId}/services/${req.params.sid}/roles/${rolesList}`;
    } else {
      return `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`;
    }
  } else {
    return `/approvals/${req.params.orgId}/users/confirm-new-user`;
  }
};

const buildCancelLink = (req) => {
  const isReviewServiceReqAmendRoleUrl = isReviewServiceReqAmendRole(req);
  const isReviewServiceReqAmendServiceUrl = isReviewServiceReqAmendService(req);
  const baseUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`;

  if (isReviewServiceReqAmendRoleUrl || isReviewServiceReqAmendServiceUrl) {
    const { serviceReqId, serviceId, selectedRoleIds } =
      req.session.reviewServiceRequest;
    const rolesIds = encodeURIComponent(selectedRoleIds);
    return `${baseUrl}/access-requests/service-requests/${serviceReqId}/services/${serviceId}/roles/${rolesIds}`;
  } else {
    return `/approvals/users/${req.session.user.uid}`;
  }
};

const getViewModel = async (req) => {
  const totalNumberOfServices = req.session.user.services.length;
  const currentServiceIndex = req.session.user.services.findIndex(
    (x) => x.serviceId === req.params.sid,
  );
  const currentService = currentServiceIndex + 1;
  const serviceDetails = await getServiceRaw({
    by: { serviceId: req.params.sid },
  });
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );

  const userOrganisations =
    req.params.uid && !req.params.uid.startsWith("inv-")
      ? await getOrganisationAndServiceForUserV2(req.params.uid)
      : undefined;
  const userAccessToSpecifiedOrganisation = userOrganisations
    ? userOrganisations.find(
        (x) =>
          x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase(),
      )
    : undefined;
  const policyResult = await policyEngine.getPolicyApplicationResultsForUser(
    userAccessToSpecifiedOrganisation ? req.params.uid : undefined,
    req.params.orgId,
    req.params.sid,
    req.id,
  );

  const serviceRoles = policyResult.rolesAvailableToUser.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const numberOfRolesAvailable = serviceRoles.length;

  const roleSelectionConstraint =
    serviceDetails?.relyingParty?.params?.roleSelectionConstraint;

  let isRoleSelectionConstraintPresent = false;
  if (roleSelectionConstraint) {
    isRoleSelectionConstraintPresent = RoleSelectionConstraintCheck(
      serviceRoles,
      roleSelectionConstraint,
    );
  }

  const allowedToSelectMoreThanOneRole = isMultipleRolesAllowed(
    serviceDetails,
    numberOfRolesAvailable,
  );

  const selectedRoles = req.session.user.services.length
    ? req.session.user.services.find((x) => x.serviceId === req.params.sid)
    : [];

  const isRequestSubService =
    req.query.action === actions.REQUEST_SUB_SERVICE &&
    req.session.subServiceReqId
      ? true
      : false;
  return {
    csrfToken: req.csrfToken(),
    name: `${req.session.user.firstName} ${req.session.user.lastName}`,
    user: req.session.user,
    title: `Select sub-service for ${serviceDetails?.name} - DfE Sign-in`,
    validationMessages: {},
    backLink: buildBackLink(req, currentServiceIndex),
    cancelLink: buildCancelLink(req),
    currentPage: "users",
    organisationDetails,
    selectedRoles,
    serviceDetails,
    serviceRoles,
    currentService,
    totalNumberOfServices,
    isRequestSubService,
    allowedToSelectMoreThanOneRole,
    isRoleSelectionConstraintPresent,
  };
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }

  if (
    !Array.isArray(req.session.user.services) ||
    req.session.user.services.length === 0
  ) {
    logger.warn(
      `GET ${req.originalUrl} missing user session services, redirecting to approvals/users`,
    );
    return res.redirect("/approvals/users");
  }

  const model = await getViewModel(req);
  return renderAssociateRolesPage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }

  if (
    !Array.isArray(req.session.user.services) ||
    req.session.user.services.length === 0
  ) {
    logger.warn(
      `POST ${req.originalUrl} missing user session services, redirecting to approvals/users`,
    );
    return res.redirect("/approvals/users");
  }

  const currentService = req.session.user.services.findIndex(
    (x) => x.serviceId === req.params.sid,
  );
  let selectedRoles = req.body.role ? req.body.role : [];
  if (!(selectedRoles instanceof Array)) {
    selectedRoles = [req.body.role];
  }

  const userOrganisations =
    req.params.uid && !req.params.uid.startsWith("inv-")
      ? await getOrganisationAndServiceForUserV2(req.params.uid)
      : undefined;
  const userAccessToSpecifiedOrganisation = userOrganisations
    ? userOrganisations.find(
        (x) =>
          x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase(),
      )
    : undefined;
  const policyValidationResult = await policyEngine.validate(
    userAccessToSpecifiedOrganisation ? req.params.uid : undefined,
    req.params.orgId,
    req.params.sid,
    selectedRoles,
    req.id,
  );

  // persist current selection in session
  req.session.user.services[currentService].roles = selectedRoles;

  if (policyValidationResult.length > 0) {
    const model = await getViewModel(req);
    model.validationMessages.roles = policyValidationResult.map(
      (x) => x.message,
    );
    return renderAssociateRolesPage(req, res, model);
  }

  if (currentService < req.session.user.services.length - 1) {
    const nextService = currentService + 1;
    return res.sessionRedirect(
      `${req.session.user.services[nextService].serviceId}`,
    );
  } else {
    const nextLink = buildNextLink(req, selectedRoles);
    return res.sessionRedirect(`${nextLink}`);
  }
};

module.exports = {
  get,
  post,
};
