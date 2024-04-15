'use strict';
const logger = require('../../../src/infrastructure/logger');
const { getSingleServiceForUser } = require('../../../src/app/users/utils');
const { createServiceRequest } = require('./utils');
const { listRolesOfService } = require('./../../infrastructure/access');
const { checkForActiveRequests } = require('./utils');
const config = require('../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');
const { isServiceEmailNotificationAllowed } = require('../../../src/infrastructure/applications');
const { v4: uuid } = require('uuid');

const renderConfirmEditRolesPage = (res, model) => {
  return res.render('requestService/views/confirmEditRolesRequest', { ...model });
};

const getSelectedRoles = async (req) => {
  let selectedRoleIds = req.session.service.roles;
  const allRolesOfService = await listRolesOfService(req.params.sid, req.id);
  let rotails;

  if (selectedRoleIds && !Array.isArray(selectedRoleIds)) {
    selectedRoleIds = [selectedRoleIds];
  }
  if (selectedRoleIds) {
    rotails = allRolesOfService.filter((x) => selectedRoleIds.find((y) => y.toLowerCase() === x.id.toLowerCase()));
  } else {
    rotails = [];
    selectedRoleIds = [];
  }
  return {
    rotails,
    selectedRoleIds,
  };
};

const get = async (req, res) => {
  if (!req.session.service || !req.session.user) {
    return res.redirect(`/approvals/users/${req.params.uid}`);
  }

  const service = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const selectedRoles = await getSelectedRoles(req);
  const backLink = `/request-service/${req.params.orgId}/users/${req.params.uid}/edit-services/${req.params.sid}`;

  const model = {
    csrfToken: req.csrfToken(),
    organisationDetails,
    currentPage: 'services',
    backLink,
    cancelLink: '/my-services',
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    roles: selectedRoles.rotails,
    service,
  };

  renderConfirmEditRolesPage(res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const serviceId = req.params.sid;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  const service = await getSingleServiceForUser(uid, organisationId, serviceId, req.id);
  const selectedRoles = await getSelectedRoles(req);
  const { selectedRoleIds } = selectedRoles;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const orgName = organisationDetails.organisation.name;
  const subServiceReqId = uuid();
  const senderFirstName = req.session.user.firstName;
  const senderLastName = req.session.user.lastName;
  const senderEmail = req.user.email;
  const roleNames = selectedRoles.rotails.map((i) => i.name);
  const notificationClient = new NotificationClient({
    connectionString: config.notifications.connectionString,
  });

  const baseUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`;
  const approveUrl = `${baseUrl}/request-service/${organisationId}/users/${uid}/services/${serviceId}/roles/${encodeURIComponent(
    JSON.stringify(selectedRoleIds),
  )}/${subServiceReqId}/approve-roles-request`;
  const rejectUrl = `${baseUrl}/request-service/${organisationId}/users/${uid}/services/${serviceId}/roles/${encodeURIComponent(
    JSON.stringify(selectedRoleIds),
  )}/${subServiceReqId}/reject-roles-request`;

  const helpUrl = `${config.hostingEnvironment.helpUrl}/requests/can-end-user-request-service`;

  await createServiceRequest(subServiceReqId, uid, serviceId, selectedRoleIds, organisationId, 0, 'subService');

  await notificationClient.sendSubServiceRequestToApprovers(
    senderFirstName,
    senderLastName,
    senderEmail,
    organisationDetails.organisation.id,
    organisationDetails.organisation.name,
    service.name,
    roleNames,
    rejectUrl,
    approveUrl,
    helpUrl,
  );

  logger.audit({
    type: 'sub-service',
    subType: 'sub-service request',
    userId: uid,
    userEmail: req.user.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${
      req.user.email
    } (userId: ${uid}) requested service roles update for (serviceId: ${serviceId}) and roles (roleIds: ${JSON.stringify(
      selectedRoleIds,
    )}) for organisation (orgId: ${organisationDetails.organisation.id}) - requestId (reqId: ${subServiceReqId})`,
  });

  res.flash('title', 'Success');
  res.flash('heading', 'Sub-service changes requested');
  res.flash(
    'message',
    `Your request to change sub-service access has been sent to all approvers at ${orgName}.<br>Your request will be approved or rejected within 5 days.`,
  );

  return res.redirect('/my-services');
};

module.exports = {
  get,
  post,
};
