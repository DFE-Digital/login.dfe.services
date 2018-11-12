'use strict';

const logger = require('./../../infrastructure/logger');
const { getSingleServiceForUser, getUserDetails } = require('./utils');
const { removeServiceFromUser, removeServiceFromInvitation } = require('./../../infrastructure/access');

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const service = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  return res.render('users/views/removeService', {
    backLink: 'edit-services',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    service,
    user,
  });
};

const post = async (req, res) => {
  const user = await getUserDetails(req);
  const uid = req.params.uid;
  const serviceId = req.params.sid;
  const organisationId = req.params.orgId;
  const service = await getSingleServiceForUser(uid, organisationId, serviceId, req.id);

  if(uid.startsWith('inv-')) {
    await removeServiceFromInvitation(uid.substr(4), serviceId, organisationId, req.id);
  } else {
    await removeServiceFromUser(uid, serviceId, organisationId, req.id);
  }
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const org = organisationDetails[0].organisation.name;
  logger.audit(`${req.user.email} (id: ${req.user.sub}) removed service ${service.name} for organisation ${org} (id: ${organisationId}) for user ${user.email} (id: ${uid})`, {
    type: 'approver',
    subType: 'user-service-deleted',
    userId: req.user.sub,
    userEmail: req.user.email,
    editedUser: uid,
    editedFields: [{
      name: 'remove_service',
      oldValue: serviceId,
      newValue: undefined,
    }],
  });
  res.flash('info', `${user.name} has been removed from ${service.name}`);
  return res.redirect(`/approvals/${organisationId}/users/${uid}/services`);
};

module.exports = {
  get,
  post,
};
