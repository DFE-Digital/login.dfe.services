'use strict';

const get = async (req, res) => {
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);

  return res.render('users/views/removeOrganisation', {
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    user: req.session.user,
    currentPage: 'users',
    backLink: 'users-details',
    validationMessages: {},
  });
};

module.exports = {
  get
};
