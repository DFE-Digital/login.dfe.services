'use strict';
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const { getAllUsersForOrganisation } = require('../../infrastructure/organisations');

const getAllUsersForOrg = async (usersInOrg) => {
  const allUserIds = flatten(usersInOrg.map((user) => user.id));
  if (allUserIds.length === 0) {
    return [];
  }
  const distinctUserIds = uniq(allUserIds);
  return await Account.getUsersById(distinctUserIds);
};


const getUsersList = async (req, res) => {
  let usersForOrganisation = await getAllUsersForOrganisation(req.params.orgId, req.id);
  if (usersForOrganisation) {
    const userList = await getAllUsersForOrg(usersForOrganisation);
    usersForOrganisation = usersForOrganisation.map((user) => {
      const userFound = userList ? userList.find(c => c.claims.sub.toLowerCase() === user.id.toLowerCase()) : '';
      const usersName = userFound ? `${userFound.claims.given_name} ${userFound.claims.family_name}` : 'No Name Supplied';
      const usersEmail = userFound ? userFound.claims.email : '';
      return Object.assign({usersName, usersEmail}, user);
    });
  }
  const organisationId = req.params.orgId;
  const organisationDetails = req.user.organisations.filter(x => x.organisation.id === organisationId);
  return res.render('users/views/usersList', {
    title: 'Users',
    organisations: organisationDetails,
    usersForOrganisation,
    currentPage: 'users'
  });
};

module.exports = getUsersList;
