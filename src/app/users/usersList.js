'use strict';
const { mapUserStatus } = require('./../../infrastructure/utils');
const { getAllUsersForOrg } = require('../../infrastructure/search');

const clearUserSessionData = (req) => {
  if (req.session.user) {
    req.session.user = undefined;
  }
};

const search = async (req) => {
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const paramsSource = req.method === 'POST' ? req.body : req.query;
  let page = paramsSource.page ? parseInt(paramsSource.page) : 1;
  if (isNaN(page)) {
    page = 1;
  }
  const usersForOrganisation = await getAllUsersForOrg(page, organisationId, req.id);
  for (let i = 0; i < usersForOrganisation.users.length; i++) {
    const user = usersForOrganisation.users[i];
    const organisation = user.organisations.filter(x => x.id === organisationId);
    user.statusId = mapUserStatus(user.statusId);
    user.organisations = organisation
  }
  return {
    page,
    usersForOrganisation,
    organisationDetails,
    numberOfPages: usersForOrganisation.numberOfPages,
    totalNumberOfResults: usersForOrganisation.totalNumberOfResults,
  }
};

const get = async (req, res) => {
  clearUserSessionData(req);
  const result = await search(req);
  return res.render('users/views/usersList', {
    title: 'Users',
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    usersForOrganisation: result.usersForOrganisation,
    page: result.page,
    numberOfPages: result.numberOfPages,
    totalNumberOfResults: result.totalNumberOfResults,
    organisationDetails: result.organisationDetails,
  });
};

const post = async (req, res) => {
  const result = await search(req);
  return res.render('users/views/usersList', {
    title: 'Users',
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    usersForOrganisation: result.usersForOrganisation,
    page: result.page,
    numberOfPages: result.numberOfPages,
    totalNumberOfResults: result.totalNumberOfResults,
    organisationDetails: result.organisationDetails,
  });
};

module.exports = {
  get,
  post,
};
