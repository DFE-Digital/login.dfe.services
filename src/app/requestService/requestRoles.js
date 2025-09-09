const config = require("../../infrastructure/config");
const {
  isMultipleRolesAllowed,
  RoleSelectionConstraintCheck,
} = require("../users/utils");
const {
  getOrganisationAndServiceForUserV2,
} = require("../../infrastructure/organisations");
const PolicyEngine = require("login.dfe.policy-engine");
const logger = require("../../infrastructure/logger");
const { getServiceRaw } = require("login.dfe.api-client/services");

const policyEngine = new PolicyEngine(config);
const renderAssociateRolesPage = (_req, res, model) => {
  return res.render("requestService/views/requestRoles", model);
};

const buildBackLink = (req) => {
  let backRedirect = `/request-service/${req.session.user.organisation}/users/${req.user.sub}`;
  return backRedirect;
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
  const selectedRoles = req.session.user.services
    ? req.session.user.services.find((x) => x.serviceId === req.params.sid)
    : [];

  const numberOfRolesAvailable = serviceRoles.length;
  const allowedToSelectMoreThanOneRole = isMultipleRolesAllowed(
    serviceDetails,
    numberOfRolesAvailable,
  );

  const roleSelectionConstraint =
    serviceDetails?.relyingParty?.params?.roleSelectionConstraint;

  let isRoleSelectionConstraintPresent = false;
  if (roleSelectionConstraint) {
    isRoleSelectionConstraintPresent = RoleSelectionConstraintCheck(
      serviceRoles,
      roleSelectionConstraint,
    );
  }

  return {
    csrfToken: req.csrfToken(),
    name: req.session.user
      ? `${req.session.user.firstName} ${req.session.user.lastName}`
      : "",
    user: req.session.user,
    title: `Select a sub-service for ${serviceDetails?.name}`,
    validationMessages: {},
    backLink: buildBackLink(req),
    currentPage: "services",
    organisationDetails,
    selectedRoles,
    serviceDetails,
    serviceRoles,
    currentService,
    totalNumberOfServices,
    allowedToSelectMoreThanOneRole,
    isRoleSelectionConstraintPresent,
  };
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  if (
    !Array.isArray(req.session.user.services) ||
    req.session.user.services.length === 0
  ) {
    logger.warn(
      `GET ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
    return res.redirect("/my-services");
  }

  const model = await getViewModel(req);
  return renderAssociateRolesPage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  if (
    !Array.isArray(req.session.user.services) ||
    req.session.user.services.length === 0
  ) {
    logger.warn(
      `POST ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
    return res.redirect("/my-services");
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

  return res.sessionRedirect(
    `/request-service/${req.params.orgId}/users/${req.user.sub}/confirm-request`,
  );
};

module.exports = {
  get,
  post,
};
