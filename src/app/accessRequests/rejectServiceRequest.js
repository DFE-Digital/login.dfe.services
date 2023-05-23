const { getAndMapServiceRequest, isReqAlreadyActioned } = require('./utils');
const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');
const { updateServiceRequest } = require('../requestService/utils');
const { listRolesOfService } = require('../../../src/infrastructure/access');
const { services: daoServices } = require('login.dfe.dao');

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const getViewModel = (req) => {
  const { rid, sid, orgId, uid, rolesIds } = req.params;
  const encodedRids = encodeURIComponent(rolesIds);
  const backLink = `/access-requests/service-requests/${rid}/${orgId}/users/${uid}/services/${sid}/roles/${encodedRids}`;
  const model = {
    csrfToken: req.csrfToken(),
    title: 'Reason for rejection - DfE Sign-in',
    backLink,
    cancelLink: `/access-requests/requests`,
    reason: '',
    request: {},
    validationMessages: {},
    currentPage: 'requests',
  };
  return model;
};

const validate = async (req) => {
  let model = getViewModel(req);
  model.request = await getAndMapServiceRequest(req.params.rid);
  model.reason = req.body.reason;
  console.log(model);
  if (model.reason.length > 1000) {
    model.validationMessages.reason = 'Reason cannot be longer than 1000 characters';
  }
  return model;
};

const get = async (req, res) => {
  const model = getViewModel(req);
  return res.render('accessRequests/views/rejectServiceRequest', model);
};

const post = async (req, res) => {
  const { rid } = req.params;
  const model = await validate(req);
  const roleIds = model.request.dataValues.role_ids;
  const serviceId = model.request.dataValues.service_id;
  const endUserId = model.request.dataValues.user_id;
  const service = await daoServices.getById(serviceId);
  const { organisation, endUsersEmail, endUsersFamilyName, endUsersGivenName } = model.request;
  const { reason } = model;
  const approver = req.user;

  const requestedRolesIds = roleIds && roleIds !== 'null' ? roleIds.split(',') : [];
  const allRolesOfService = await listRolesOfService(serviceId, rid);
  const selectedRoles = allRolesOfService.filter((x) =>
    requestedRolesIds.find((y) => y.toLowerCase() === x.id.toLowerCase()),
  );

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('accessRequests/views/rejectServiceRequest', model);
  }

  const updateServiceReq = await updateServiceRequest(rid, -1, req.user.sub);
  const resStatus = updateServiceReq.serviceRequest.status;

  if (updateServiceReq.success === false && (resStatus === -1 || 1)) {
    const request = await getAndMapServiceRequest(rid);
    if (request.approverEmail) {
      return isReqAlreadyActioned(
        'service',
        request.dataValues.status,
        request.approverEmail,
        request.endUsersGivenName,
        request.endUsersFamilyName,
        service.name,
        res,
      );
    }
  }

  await notificationClient.sendServiceRequestRejected(
    endUsersEmail,
    endUsersGivenName,
    endUsersFamilyName,
    organisation.name,
    service.name,
    selectedRoles.map((i) => i.name),
    reason,
  );

  logger.audit({
    type: 'services',
    subType: 'access-request-rejected',
    userId: approver.sub,
    userEmail: approver.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${approver.email} (approverId: ${
      approver.sub
    }) rejected service (serviceId: ${serviceId}), roles (roleIds: ${
      roleIds ? roleIds : 'No roles selected'
    }) and organisation (orgId: ${organisation.id}) for end user (endUserId: ${endUserId}). ${
      reason ? `The reject reason is ${reason}` : ''
    } - requestId (reqId: ${rid})`,
  });

  res.flash('title', `Success`);
  res.flash('heading', `Service access request rejected`);
  res.flash('message', `${endUsersGivenName} ${endUsersFamilyName} cannot access ${service.name}.`);

  return res.redirect(`/access-requests/requests`);
};

module.exports = {
  get,
  post,
};
