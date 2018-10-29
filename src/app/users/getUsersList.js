'use strict';
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const { getAllUsersForOrganisation } = require('../../infrastructure/organisations');
const sortBy = require('lodash/sortBy');

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
  return res.render('users/views/usersList', {
    title: 'Users',
    organisations: req.user.organisations,
    usersForOrganisation,
    currentPage: 'users'
  });
};

module.exports = getUsersList;
