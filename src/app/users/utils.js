'use strict';
const Account = require('./../../infrastructure/account');
const { mapUserStatus } = require('./../../infrastructure/utils');

const getUserDetails = async (req) => {
  const uid = req.params.uid;
  if (uid.startsWith('inv-')) {
    const invitation = await Account.getInvitation(uid.substr(4));
    const mapInvitation = {
      id: uid,
      name: invitation.claims.name,
      email: invitation.claims.email,
      status: invitation.claims.deactivated ? mapUserStatus(-2) : mapUserStatus(-1)
    };
    return mapInvitation
  } else {
    const user = await Account.getById(uid);
    return {
      id: uid,
      name: `${user.claims.given_name} ${user.claims.family_name}`,
      email: user.claims.email,
      status: mapUserStatus(user.claims.status)
    };
  }
};

module.exports = {
  getUserDetails,
};
