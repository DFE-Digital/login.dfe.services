const {
  getApproverOrgsFromReq,
  getUserOrgsFromReq,
  isUserManagement,
  isUserApprover,
  isUserEndUser,
  getOrgNaturalIdentifiers,
  isOrganisationInvite,
  isViewOrganisationRequests,
  isRequestService,
  isAddService,
  isEditService,
} = require("./utils");
const {
  recordRequestServiceBannerAck,
} = require("../../infrastructure/helpers/common");

const buildAdditionalOrgDetails = (userOrgs) => {
  userOrgs.forEach((userOrg) => {
    const org = userOrg.organisation;
    userOrg.naturalIdentifiers = getOrgNaturalIdentifiers(org);
  });
};

const renderSelectOrganisationPage = (req, res, model) => {
  const isManage = isUserManagement(req);
  res.render(
    `users/views/${isManage ? "selectOrganisation" : "selectOrganisationRedesigned"}`,
    {
      ...model,
      currentPage: isManage ? "users" : "services",
    },
  );
};

const handleRedirectAfterOrgSelected = (
  req,
  res,
  model,
  isApprover,
  isManage,
) => {
  const selectedOrg = model.organisations.filter(
    (o) => o.organisation.id === model.selectedOrganisation,
  );
  const isApproverForSelectedOrg =
    selectedOrg.filter((r) => r.role.id === 10000).length > 0;

  if (isAddService(req) || isRequestService(req)) {
    if (isApproverForSelectedOrg) {
      return res.sessionRedirect(
        `/approvals/${model.selectedOrganisation}/users/${req.user.sub}/associate-services`,
      );
    }

    if (isApprover && !isManage) {
      //show banner to an approver who is also an end-user
      res.flash("title", `Important`);
      res.flash(
        "heading",
        `You are not an approver at: ${selectedOrg[0].organisation.name}`,
      );
      res.flash(
        "message",
        `Because you are not an approver at this organisation, you will need to request access to a service in order to use it. This request will be sent to approvers at <b>${selectedOrg[0].organisation.name}</b>.`,
      );
    }
    return res.sessionRedirect(
      `/request-service/${model.selectedOrganisation}/users/${req.user.sub}`,
    );
  } else if (isOrganisationInvite(req)) {
    return res.sessionRedirect(
      `/approvals/${model.selectedOrganisation}/users/new-user`,
    );
  } else if (isViewOrganisationRequests(req)) {
    return res.sessionRedirect(
      `/access-requests/${model.selectedOrganisation}/requests`,
    );
  } else {
    return res.redirect(`/approvals/users`);
  }
};

const setUserOrgs = (req) => {
  const isManage = isUserManagement(req);
  const isApprover = isUserApprover(req);
  const isEndUser = isUserEndUser(req);
  const hasDualPermission = isEndUser && isApprover;
  req.userOrganisations =
    (hasDualPermission && !isManage) || !isApprover
      ? getUserOrgsFromReq(req)
      : getApproverOrgsFromReq(req);
  return { isApprover, hasDualPermission, isEndUser, isManage };
};

const buildSubHeader = (req) => {
  const commonMessage =
    "You are associated with more than 1 organisation. Select the organisation";
  let actionMessage;

  if (isRequestService(req) && !isUserApprover(req)) {
    // [REMOVE] NSA-8109 scenario 2
    actionMessage =
      " associated with the service you would like to request access to.";
  } else if (isAddService(req) && isUserApprover(req)) {
    // [REMOVE] NSA-8109 scenario 3
    actionMessage = " associated with the service you would like to access.";
  } else if (isOrganisationInvite(req) && isUserApprover(req)) {
    // [REMOVE] NSA-8109 scenario 4
    actionMessage = " you would like to invite another user to.";
  } else {
    // [REMOVE] NSA-8109 default/ scenario 1
    actionMessage = " you would like to sign-in with.";
  }

  return `${commonMessage}${actionMessage}`;
};

const buildBackLink = (req) => {
  let backRedirect;
  const isManage = isUserManagement(req);
  if (isManage) {
    backRedirect = "/approvals/users";
  } else {
    backRedirect = "/my-services";
  }
  return backRedirect;
};

const get = async (req, res) => {
  const { isApprover, isEndUser, hasDualPermission, isManage } =
    setUserOrgs(req);

  if (isEndUser && !isApprover && isManage) {
    //Recording request-a-service banner acknowledgement by end-user
    await recordRequestServiceBannerAck(req.session.user.uid);
  }

  buildAdditionalOrgDetails(req.userOrganisations);

  const model = {
    csrfToken: req.csrfToken(),
    title: "Select Organisation",
    subHeader: buildSubHeader(req),
    organisations: req.userOrganisations,
    currentPage: "users",
    selectedOrganisation: req.session.user
      ? req.session.user.organisation
      : null,
    validationMessages: {},
    backLink: buildBackLink(req),
    isApprover,
    hasDualPermission,
  };

  renderSelectOrganisationPage(req, res, model);
};

const validate = (req) => {
  const selectedOrg = req.body.selectedOrganisation;
  const model = {
    organisations: req.userOrganisations,
    currentPage: "users",
    selectedOrganisation: selectedOrg,
    validationMessages: {},
    backLink: buildBackLink(req),
  };

  if (
    model.selectedOrganisation === undefined ||
    model.selectedOrganisation === null
  ) {
    model.validationMessages.selectedOrganisation =
      "Select an organisation to continue.";
  }
  return model;
};

const post = async (req, res) => {
  const { isApprover, hasDualPermission, isManage } = setUserOrgs(req);

  buildAdditionalOrgDetails(req.userOrganisations);

  const model = validate(req);
  model.isApprover = isApprover;
  model.hasDualPermission = hasDualPermission;

  // persist selected org in session
  if (!req.session.user) {
    req.session.user = {};
  }
  req.session.user.organisation = model.selectedOrganisation;

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return renderSelectOrganisationPage(req, res, model);
  }

  handleRedirectAfterOrgSelected(req, res, model, isApprover, isManage);
};

module.exports = {
  get,
  post,
};
