'use strict';

const Account = require('./../../infrastructure/account');
const { getOrganisationUsersForApproval, putUserInOrganisation } = require('../../infrastructure/organisations');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const logger = require('./../../infrastructure/logger');

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
    csrfToken: req.csrfToken(),
  });
};

const post = async (req, res) => {

  const userId = req.body.user_id;
  const orgId = req.body.org_id;
  const status = req.body.radio_inline_approve_reject.toLowerCase() === 'approve' ? 1 : 0;
  let role = req.body.radio_inline_group_role.toLowerCase() === 'approver' ? 10000 : 1;
  let reason = req.body.message;

  if(status === 0) {
    role = 0;
  } else {
    reason = ''
  }

  await putUserInOrganisation(userId, orgId, status, role, reason, req.id);

  logger.audit(`User ${req.user.email} (id: ${req.user.sub}) has set set user id ${userId} to status "${req.body.radio_inline_approve_reject}"`, {
    type: 'services',
    subType: 'access-request',
    success: true,
    editedUser: userId,
    userId: req.user.sub,
    userEmail: req.user.email,
    role: req.body.radio_inline_group_role,
    reason,
    orgId,
    status: req.body.radio_inline_approve_reject
  });

  res.redirect('accessRequests');
};


module.exports = {
  get,
  post,
};
