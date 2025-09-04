const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/approvals/users");
  }
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
  return req.query.review
    ? res.redirect(
        `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`,
      )
    : res.redirect(
        `/approvals/${req.params.orgId}/users/${req.session.user.uid}/organisation-permissions`,
      );
};

module.exports = {
  get,
  post,
};
