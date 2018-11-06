'use strict';
const { getById } = require('./../../infrastructure/search');
const { mapUserStatus } = require('./../../infrastructure/utils');

const getUserDetails = async (req) => {
  const uid = req.params.uid;
  const user = await getById(uid, req.id);
  const organisationDetails = user.organisations.filter(x => x.id === req.params.orgId);
  return {
    id: uid,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    status: mapUserStatus(user.statusId),
    organisation: organisationDetails,
    lastLogin: user.lastLogin,

  };
};

module.exports = {
  getUserDetails,
};
