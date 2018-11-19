'use strict';

const get = async (req, res) => {
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  return res.render('users/views/confirmExistingUser', {
    backLink: 'new-user',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    user: req.session.user,
    organisationDetails,
  });
};

const post = async (req, res) => {
  return res.redirect(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/associate-services`)
};

module.exports = {
  get,
  post,
};
