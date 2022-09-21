const buildBackLink = (req) => {
  if (req.session.user.isInvite) {
    req.params.uid
      ? (backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-user`)
      : (backRedirect = `/approvals/${req.params.orgId}/users/new-user`);

    return backRedirect;
  }
};
const get = async (req, res) => {
  const { organisation } = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);

  return res.render('users/views/organisationPermission', {
    csrfToken: req.csrfToken(),
    backLink: buildBackLink(req),
    cancelLink: `/services/${req.params.sid}/users`,
    user: `${req.session.user.firstName} ${req.session.user.lastName}`,
    organisation,
    selectedLevel: req.session.user.permission || 0,
    validationMessages: {},
    serviceId: req.params.sid,
    currentNavigation: 'users',
  });
};

const validate = async (req) => {
  const validPermissionLevels = [0, 10000];
  const level = parseInt(req.body.selectedLevel);

  const model = {
    backLink: buildBackLink(req),
    user: `${req.session.user.firstName} ${req.session.user.lastName}`,
    organisation: req.session.user.organisationName,
    selectedLevel: isNaN(level) ? undefined : level,
    validationMessages: {},
    serviceId: req.params.sid,
    currentNavigation: 'users',
  };

  if (model.selectedLevel === undefined || model.selectedLevel === null) {
    model.validationMessages.selectedLevel = 'Please select a permission level';
  } else if (validPermissionLevels.find((x) => x === model.selectedLevel) === undefined) {
    model.validationMessages.selectedLevel = 'Please select a permission level';
  }
  return model;
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/services/${req.params.sid}/users`);
  }
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('users/views/organisationPermission', model);
  }
  req.session.user.permission = model.selectedLevel;
  return req.query.review ? res.redirect('confirm-new-user') : res.redirect('associate-services');
};

module.exports = {
  get,
  post,
};
