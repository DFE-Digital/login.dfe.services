const sanitizeHtml = require("sanitize-html");
const config = require("./../../infrastructure/config");
const {
  isUserManagement,
  getSingleServiceForUser,
  isEditService,
  getUserDetails,
  isReviewSubServiceRequest,
  isMultipleRolesAllowed,
  RoleSelectionConstraintCheck,
} = require("./utils");
const { getServiceRaw } = require("login.dfe.api-client/services");
const { actions } = require("../constants/actions");
const PolicyEngine = require("login.dfe.policy-engine");
const policyEngine = new PolicyEngine(config);

const renderEditServicePage = async (req, res, model) => {
  const userDetails = await getUserDetails(req);
  const isManage = isUserManagement(req);

  res.render(`users/views/editServices`, {
    ...model,
    currentPage: isManage ? "users" : "services",
    user: userDetails,
  });
};

const buildBackLink = (req) => {
  if (isEditService(req)) {
    return `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services?action=${actions.EDIT_SERVICE}`;
  }

  if (isUserManagement(req)) {
    if (isReviewSubServiceRequest(req)) {
      return `/access-requests/subService-requests/${req.session.rid}`;
    }
    return `/approvals/users/${req.params.uid}`;
  }
  return `/approvals/select-organisation-service?action=${actions.EDIT_SERVICE}`;
};

const buildCancelLink = (req) => {
  if (isUserManagement(req)) {
    return isReviewSubServiceRequest(req)
      ? `/access-requests/subService-requests/${req.session.rid}`
      : `/approvals/users/${req.params.uid}`;
  }
  return `/my-services`;
};

const getViewModel = async (req) => {
  const isManage = isUserManagement(req);
  const isReviewSubServiceReq = isReviewSubServiceRequest(req);
  const userService = await getSingleServiceForUser(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    req.id,
  );
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );
  const policyResult = await policyEngine.getPolicyApplicationResultsForUser(
    req.params.uid.startsWith("inv-") ? undefined : req.params.uid,
    req.params.orgId,
    [req.params.sid],
    req.id,
  );

  const application = await getServiceRaw({
    by: { serviceId: req.params.sid },
  });
  const serviceRoles = policyResult[0].rolesAvailableToUser.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const numberOfRolesAvailable = serviceRoles.length;

  const allowedToSelectMoreThanOneRole = isMultipleRolesAllowed(
    application,
    numberOfRolesAvailable,
  );

  const roleSelectionConstraint =
    application?.relyingParty?.params?.roleSelectionConstraint;

  let isRoleSelectionConstraintPresent = false;
  if (roleSelectionConstraint) {
    isRoleSelectionConstraintPresent = RoleSelectionConstraintCheck(
      serviceRoles,
      roleSelectionConstraint,
    );
  }

  const serviceMessageFooter =
    application?.relyingParty?.params?.serviceConfirmMessageFooter;
  const sanitizedServiceConfirmMessageFooter = serviceMessageFooter
    ? sanitizeHtml(serviceMessageFooter)
    : undefined;

  return {
    backLink: buildBackLink(req),
    cancelLink: buildCancelLink(req),
    currentPage: "users",
    csrfToken: req.csrfToken(),
    organisationDetails,
    service: {
      name: userService.name,
      id: userService.id,
    },
    validationMessages: {},
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    title: `Select a sub-service for ${userService.name}`,
    serviceRoles,
    serviceDetails: application,
    userService,
    roleMessage:
      application.relyingParty &&
      application.relyingParty.params &&
      application.relyingParty.params.serviceRoleMessage
        ? application.relyingParty.params.serviceRoleMessage
        : undefined,
    isManage,
    isReviewSubServiceReq,
    allowedToSelectMoreThanOneRole,
    isRoleSelectionConstraintPresent,
    sanitizedServiceConfirmMessageFooter,
  };
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(
      `/approvals/${req.params.orgId}/users/${req.params.uid}`,
    );
  }

  const model = await getViewModel(req);

  model.service.roles = model.userService.roles;
  if (
    req.session.rid &&
    req.query.actions === actions.REVIEW_SUBSERVICE_REQUEST
  ) {
    model.service.roles = req.session.roles;
  }
  saveRoleInSession(req, model.service.roles);
  return renderEditServicePage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(
      `/approvals/${req.params.orgId}/users/${req.params.uid}`,
    );
  }

  // selectedRoles are an array if multiple values entered, a string if one value entered
  // and undefined when nothing entered. Making sure that these values are always
  // in an array saves us having to constantly check that later down the line.
  let selectedRoles = req.body.role ? req.body.role : [];
  if (!(selectedRoles instanceof Array)) {
    selectedRoles = [req.body.role];
  }

  const policyValidationResult = await policyEngine.validate(
    req.params.uid.startsWith("inv-") ? undefined : req.params.uid,
    req.params.orgId,
    req.params.sid,
    selectedRoles,
    req.id,
  );

  saveRoleInSession(req, selectedRoles);

  if (policyValidationResult.length > 0) {
    const model = await getViewModel(req);
    let roles = {};
    model.service.roles = selectedRoles.map((x) => (roles[x] = { id: x }));
    model.validationMessages.roles = policyValidationResult.map((x) =>
      sanitizeHtml(x.message),
    );
    return renderEditServicePage(req, res, model);
  }

  let nexturl = `${req.params.sid}/confirm-edit-service`;

  if (
    req.session.rid &&
    req.query.actions === actions.REVIEW_SUBSERVICE_REQUEST
  ) {
    const model = await getViewModel(req);
    let roles = {};
    model.service.roles = selectedRoles.map((x) => (roles[x] = { id: x }));
    //loop through and add the ones selected and remove the ones not selected
    req.session.role = selectedRoles;
    req.session.roleIds = model.service.roles;
    nexturl = `/access-requests/subService-requests/${req.session.rid}`;
  } else if (isUserManagement(req)) {
    nexturl += "?manage_users=true";
  }

  return res.sessionRedirect(nexturl);
};

const saveRoleInSession = (req, selectedRoles) => {
  req.session.service = {
    roles: selectedRoles,
  };
};

module.exports = {
  get,
  post,
};
