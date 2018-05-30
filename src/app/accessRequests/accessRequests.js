'use strict';

const Account = require('./../../infrastructure/account');
const { getOrganisationUsersForApproval } = require('../../infrastructure/organisations');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');

const getUserDetails = async (usersForApproval) => {
  const allUserId = flatten(usersForApproval.map((user) => user.user_id));
  const distinctUserIds = uniq(allUserId);
  return await Account.getUsersById(distinctUserIds);
};

const get = async (req, res) => {
  let usersForApproval = await getOrganisationUsersForApproval(req.user.sub, req.id);

  if(usersForApproval) {
    const userList = await getUserDetails(usersForApproval);

    usersForApproval = usersForApproval.map((user) => {
      const userFound = userList.find(c => c.claims.sub.toLowerCase() === user.user_id.toLowerCase());
      const usersName = userFound ? `${userFound.claims.given_name} ${userFound.claims.family_name}` : 'No Name Supplied';
      return Object.assign({usersName}, user);
    });
  }
  res.render('accessRequests/views/requests', {
    usersForApproval,
  });
};

const post = async (req, res) => {

  res.redirect('accessRequests/views/requests');
};


module.exports = {
  get,
  post,
};
