const restoreInviteSession = (req) => {
  if (!req.session.user?.isInvite && req.session.savedInvite?.isInvite) {
    const isInviteRoute =
      !req.params.uid ||
      req.params.uid.toLowerCase() !== req.user?.sub?.toLowerCase();
    if (isInviteRoute) {
      req.session.user = req.session.savedInvite;
      delete req.session.savedInvite;
    }
  }
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }
  restoreInviteSession(req);
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );
  return res.render("users/views/confirmExistingUser", {
    backLink: `/approvals/${req.params.orgId}/users/new-user`,
    currentPage: "users",
    csrfToken: req.csrfToken(),
    user: req.session.user,
    title: "This user has a DfE Sign-in account",
    organisationDetails,
  });
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }
  restoreInviteSession(req);
  return req.query.review
    ? res.sessionRedirect(
        `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`,
      )
    : res.sessionRedirect(
        `/approvals/${req.params.orgId}/users/${req.session.user.uid}/organisation-permissions`,
      );
};

module.exports = {
  get,
  post,
};
