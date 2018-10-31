'use strict';
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const { getAllUsersForOrg } = require('../../infrastructure/search');


const getUsersList = async (req, res) => {
  const organisationId = req.params.orgId;
  const pageNumber = req.query && req.query.page ? parseInt(req.query.page) : 1;
  if (isNaN(pageNumber)) {
    return res.status(400).send();
  }
  const usersForOrganisation = await getAllUsersForOrg(pageNumber, organisationId, req.id);

  const organisationDetails = req.user.organisations.filter(x => x.organisation.id === organisationId);
  return res.render('users/views/usersList', {
    title: 'Users',
    csrfToken: req.csrfToken(),
    organisations: organisationDetails,
    usersForOrganisation,
    page: pageNumber,
    numberOfPages: usersForOrganisation.numberOfPages,
    totalNumberOfResults: usersForOrganisation.totalNumberOfResults,
    currentPage: 'users'
  });
};

module.exports = getUsersList;
