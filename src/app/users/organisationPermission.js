const buildBackLink = (req) => {
  if (req.session.user.isInvite) {
    req.params.uid
      ? (backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-user`)
      : (backRedirect = `/approvals/${req.params.orgId}/users/new-user`);

    return backRedirect;
  }
};

const buildRedirectLink = (req) => {
  if (req.session.user.isInvite) {
    if (req.params.uid) {
      req.query.review
        ? (continueRedirect = "confirm-details")
        : (continueRedirect = "associate-services");
    } else {
      req.query.review
        ? (continueRedirect = "confirm-new-user")
        : (continueRedirect = "associate-services");
    }
    return continueRedirect;
  }
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }
  const { organisation } = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );

  return res.render("users/views/organisationPermission", {
    csrfToken: req.csrfToken(),
    backLink: buildBackLink(req),
    user: `${req.session.user.firstName} ${req.session.user.lastName}`,
    organisation,
    selectedLevel: req.session.user.permission || 0,
    validationMessages: {},
    currentPage: "users",
  });
};

const validate = async (req) => {
  const validPermissionLevels = [0, 10000];
  const level = parseInt(req.body.selectedLevel);

  const model = {
    backLink: buildBackLink(req),
    user: `${req.session.user.firstName} ${req.session.user.lastName}`,
    selectedLevel: isNaN(level) ? undefined : level,
    validationMessages: {},
    currentPage: "users",
  };

  if (model.selectedLevel === undefined || model.selectedLevel === null) {
    model.validationMessages.selectedLevel = "Please select a permission level";
  } else if (
    validPermissionLevels.find((x) => x === model.selectedLevel) === undefined
  ) {
    model.validationMessages.selectedLevel = "Please select a permission level";
  }
  return model;
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render("users/views/organisationPermission", model);
  }
  req.session.user.permission = model.selectedLevel;
  const redirectLink = buildRedirectLink(req);
  return res.sessionRedirect(redirectLink);
};

module.exports = {
  get,
  post,
};
