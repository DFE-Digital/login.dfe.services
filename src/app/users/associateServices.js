const config = require("./../../infrastructure/config");
const {
  getAllServicesForUserInOrg,
  isSelfManagement,
  isRequestService,
  isRemoveService,
  isRequestServiceInSession,
  isManageUserService,
  isEditService,
  isReviewServiceReqAmendService,
} = require("./utils");
const PolicyEngine = require("login.dfe.policy-engine");
const {
  getOrganisationAndServiceForUserV2,
} = require("./../../infrastructure/organisations");
const {
  checkCacheForAllServices,
} = require("../../infrastructure/helpers/allServicesAppCache");
const { actions } = require("../constans/actions");

const policyEngine = new PolicyEngine(config);

const renderAssociateServicesPage = (req, res, model) => {
  const isSelfManage = isSelfManagement(req);
  res.render(
    `users/views/${isSelfManage ? "associateServicesRedesigned" : "associateServices"}`,
    { ...model, currentPage: isSelfManage ? "services" : "users" },
  );
};

const buildBackLink = (req) => {
  let backRedirect;

  const isRequestServiceUrl =
    isRequestService(req) || isRequestServiceInSession(req);
  const isManageUserServiceUrl = isManageUserService(req);

  const isReviewServiceReqAmendServiceUrl = isReviewServiceReqAmendService(req);
  const baseUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`;
  if (isManageUserServiceUrl) {
    backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-details`;
  } else if (isReviewServiceReqAmendServiceUrl) {
    const { serviceReqId, serviceId, selectedRoleIds } =
      req.session.reviewServiceRequest;
    const rolesIds = encodeURIComponent(selectedRoleIds);
    backRedirect = `${baseUrl}/access-requests/service-requests/${serviceReqId}/services/${serviceId}/roles/${rolesIds}`;
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
    backRedirect = `/request-service/${req.params.orgId}/users/${req.params.uid}/services/${sid}/roles/${roleIds}/approve`;
  } else if (req.session.user.isInvite) {
    req.params.uid
      ? (backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/organisation-permissions`)
      : (backRedirect = `/approvals/${req.params.orgId}/users/organisation-permissions`);
  } else if (isSelfManagement(req)) {
    // we need to check if user is approver at only one org to then send back to main services page
    if (req.userOrganisations.length === 1) {
      backRedirect = "/my-services";
    } else {
      backRedirect = `/approvals/select-organisation?action=${actions.ADD_SERVICE}`;
    }
  } else {
    backRedirect = `/approvals/users/${req.params.uid}`;
  }
  return backRedirect;
};

const getAllAvailableServices = async (req) => {
  const isEditServiceUrl = isEditService(req);
  const isRemoveUserServiceUrl = isRemoveService(req);

  const allServices = await checkCacheForAllServices(req.id);
  let externalServices = allServices.services.filter(
    (x) =>
      x.isExternalService === true &&
      !(
        x.relyingParty &&
        x.relyingParty.params &&
        x.relyingParty.params.hideApprover === "true"
      ),
  );
  if (req.params.uid) {
    const allUserServicesInOrg = await getAllServicesForUserInOrg(
      req.params.uid,
      req.params.orgId,
      req.id,
    );
    if (isEditServiceUrl || isRemoveUserServiceUrl) {
      externalServices = externalServices.filter((ex) =>
        allUserServicesInOrg.find((as) => as.id === ex.id),
      );
    } else {
      externalServices = externalServices.filter(
        (ex) => !allUserServicesInOrg.find((as) => as.id === ex.id),
      );
    }
  }

  const servicesNotAvailableThroughPolicies = [];
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

  for (let i = 0; i < externalServices.length; i++) {
    const policyResult = await policyEngine.getPolicyApplicationResultsForUser(
      userAccessToSpecifiedOrganisation ? req.params.uid : undefined,
      req.params.orgId,
      externalServices[i].id,
      req.id,
    );
    if (!policyResult.serviceAvailableToUser) {
      servicesNotAvailableThroughPolicies.push(externalServices[i].id);
    }
  }
  return externalServices.filter(
    (x) => !servicesNotAvailableThroughPolicies.find((y) => x.id === y),
  );
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }
  const isRemoveUserServiceUrl = isRemoveService(req);

  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );
  const externalServices = await getAllAvailableServices(req);
  const name = req.session.user
    ? `${req.session.user.firstName} ${req.session.user.lastName}`
    : "";
  const title = isRemoveUserServiceUrl
    ? "Remove which service?"
    : isEditService(req)
      ? `Edit which service for ${name}`
      : `Select a service for ${name}`;
  const subHeading = isRemoveUserServiceUrl
    ? ""
    : isEditService(req)
      ? `This service will be edited on the user's account, assigned to organisation`
      : `This service will be added to the user’s account, assigned to organisation`;

  const isReviewServiceReqAmend =
    req.query.action === actions.REVIEW_SERVICE_REQ_ROLE ||
    actions.REVIEW_SERVICE_REQ_SERVICE
      ? true
      : false;
  const model = {
    csrfToken: req.csrfToken(),
    name,
    user: req.session.user,
    validationMessages: {},
    backLink: buildBackLink(req),
    currentPage: "users",
    title,
    subHeading,
    organisationDetails,
    services: externalServices,
    selectedServices: req.session.user.services || [],
    isInvite: req.session.user.isInvite,
    isReviewServiceReqAmend,
  };

  renderAssociateServicesPage(req, res, model);
};

const validate = async (req) => {
  const name = req.session.user
    ? `${req.session.user.firstName} ${req.session.user.lastName}`
    : "";
  const isRemoveUserServiceUrl = isRemoveService(req);

  const title = isRemoveUserServiceUrl
    ? "Remove which service?"
    : isEditService(req)
      ? `Edit which service for ${name}`
      : `Select a service for ${name}`;
  const subHeading = isRemoveUserServiceUrl
    ? ""
    : isEditService(req)
      ? `This service will be edited on the user's account, assigned to organisation`
      : `This service will be added to the user’s account, assigned to organisation`;

  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );
  const externalServices = await getAllAvailableServices(req);

  let selectedServices = [];
  if (req.body.service && req.body.service instanceof Array) {
    selectedServices = req.body.service;
  } else if (req.body.service) {
    selectedServices = [req.body.service];
  }
  const model = {
    name,
    title,
    subHeading,
    user: req.session.user,
    backLink: buildBackLink(req),
    currentPage: "users",
    organisationDetails,
    services: externalServices,
    selectedServices,
    isInvite: req.session.user.isInvite,
    validationMessages: {},
  };
  if (!req.session.user.isInvite && model.selectedServices.length < 1) {
    if (isSelfManagement(req)) {
      model.validationMessages.services = "Please select a service";
    } else {
      model.validationMessages.services = "Select a service to continue";
    }
  }
  if (
    model.selectedServices &&
    model.selectedServices.filter(
      (sid) =>
        !externalServices.find((s) => s.id.toLowerCase() === sid.toLowerCase()),
    ).length > 0
  ) {
    model.validationMessages.services =
      "A service was selected that is no longer available";
  }
  return model;
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }

  const model = await validate(req);
  // persist current selection in session
  req.session.user.services = model.selectedServices.map((serviceId) => {
    const existingServiceSelections = req.session.user.services
      ? req.session.user.services.find((x) => x.serviceId === serviceId)
      : undefined;
    return {
      serviceId,
      roles: existingServiceSelections ? existingServiceSelections.roles : [],
    };
  });

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return renderAssociateServicesPage(req, res, model);
  }

  if (req.session.user.isInvite && model.selectedServices.length === 0) {
    return res.sessionRedirect(
      req.params.uid
        ? `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-details`
        : `/approvals/${req.params.orgId}/users/confirm-new-user`,
    );
  }

  const service = req.session.user.services[0].serviceId;
  const isEditServiceUrl = isEditService(req);
  const isRemoveUserServiceUrl = isRemoveService(req);
  const isReviewServiceReqAmendServiceUrl = isReviewServiceReqAmendService(req);

  if (isRemoveUserServiceUrl) {
    return res.sessionRedirect(
      `services/${service}/remove-service?manage_users=true&action=${actions.REMOVE_SERVICE}`,
    );
  } else if (isEditServiceUrl) {
    return res.sessionRedirect(
      `services/${service}?manage_users=true&action=${actions.EDIT_SERVICE}`,
    );
  } else if (isReviewServiceReqAmendServiceUrl) {
    return res.sessionRedirect(
      `associate-services/${service}?action=${actions.REVIEW_SERVICE_REQ_SERVICE}`,
    );
  }
  return res.sessionRedirect(`associate-services/${service}`);
};

module.exports = {
  get,
  post,
};
