'use strict';

const get = async (req, res) => {
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  const model = {
    csrfToken: req.csrfToken(),
    name: '',
    validationMessages: {},
    backLink: 'new-user-details',
    currentPage: 'users',
    organisationDetails,
  };

  if (req.session.user) {
    model.name = `${req.session.user.firstName} ${req.session.user.lastName}`
  }

  res.render('users/views/associateServices', model);
};

module.exports = {
  get,
};
