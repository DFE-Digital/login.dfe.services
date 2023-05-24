const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');
const { listRolesOfService, addUserService } = require('../../../src/infrastructure/access');
const { updateServiceRequest } = require('../requestService/utils');
const { getAndMapServiceRequest, generateFlashMessages } = require('./utils');
const { services: daoServices } = require('login.dfe.dao');
const { actions } = require('../constans/actions');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);
const NotificationClient = require('login.dfe.notifications.client');
const { response } = require('express');
const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const getViewModel = async (req) => {
  const request = await getAndMapServiceRequest(req.params.rid);
  const service = await daoServices.getById(req.params.sid);
  const roleIds = req.params.rolesIds ? decodeURIComponent(req.params.rolesIds) : undefined;
  const endUserId = req.params.uid;

  const requestedRolesIds = roleIds && roleIds !== 'null' ? roleIds.split(',') : [];
  const allRolesOfService = await listRolesOfService(req.params.sid, req.id);
  const selectedRoles = allRolesOfService.filter((x) =>
    requestedRolesIds.find((y) => y.toLowerCase() === x.id.toLowerCase()),
  );
  const action = {
    serviceAction: actions.REVIEW_SERVICE_REQ_SERVICE,
    roleAction: actions.REVIEW_SERVICE_REQ_ROLE,
  };

  const baseAmendUrl = `/approvals/${request.organisation.id}/users/${endUserId}/associate-services`;
  const serviceAmendUrl = `${baseAmendUrl}?action=${action.serviceAction}`;
  const subServiceAmendUrl = `${baseAmendUrl}/${req.params.sid}?action=${action.roleAction}`;

  let model = {
    csrfToken: req.csrfToken(),
    title: 'Review service request - DfE Sign-in',
    backLink: `/access-requests/requests`,
    cancelLink: `/access-requests/requests`,
    request,
    service,
    action,
    requestedRolesIds,
    selectedRoles,
    serviceAmendUrl,
    subServiceAmendUrl,
    selectedResponse: req.body ? req.body.selectedResponse : null,
    validationMessages: {},
    currentPage: 'requests',
  };
  return model;
};

const validateModel = async (model, reqParams, res) => {
  const { requestedRolesIds, request, service } = model;
  const { rid, sid, orgId, uid } = reqParams;
  const policyValidationResult = await policyEngine.validate(uid, orgId, sid, requestedRolesIds, rid);

  if (model.selectedResponse === undefined || model.selectedResponse === null) {
    model.validationMessages.selectedResponse = 'Approve or Reject must be selected';
  } else if (model.request.approverEmail) {
    const { title, heading, message } = generateFlashMessages(
      'service',
      request.dataValues.status,
      request.approverEmail,
      request.endUsersGivenName,
      request.endUsersFamilyName,
      service.name,
      res,
    );
    res.flash('title', `${title}`);
    res.flash('heading', `${heading}`);
    res.flash('message', `${message}`);
    return res.redirect(`/access-requests/requests`);
  } else if (policyValidationResult.length > 0) {
    model.validationMessages.policyValidation = policyValidationResult.map((x) => x.message);
  }
  return model;
};

const get = async (req, res) => {
  const model = await getViewModel(req);
  const { request, action, requestedRolesIds, service } = model;
  const { rid, sid, rolesIds, uid } = req.params;
  req.session = {
    ...req.session,
    action: action,
    reviewServiceRequest: {
      serviceReqId: rid,
      serviceId: sid,
      selectedRoleIds: rolesIds,
    },
    user: {
      ...req.session.user,
      uid: uid,
      firstName: request.endUsersGivenName,
      lastName: request.endUsersFamilyName,
      email: request.endUsersEmail,
      services: [
        {
          serviceId: sid,
          roles: requestedRolesIds,
        },
      ],
    },
  };

  if (request.approverEmail) {
    const reqStatus = request.dataValues.status;
    const { approverEmail, endUsersGivenName, endUsersFamilyName } = request;
    const serviceName = service.name;
    const { title, heading, message } = generateFlashMessages(
      'service',
      reqStatus,
      approverEmail,
      endUsersGivenName,
      endUsersFamilyName,
      serviceName,
    );
    res.flash('title', `${title}`);
    res.flash('heading', `${heading}`);
    res.flash('message', `${message}`);
    return res.redirect(`/access-requests/requests`);
  }

  return res.render('accessRequests/views/reviewServiceRequest', model);
};

const post = async (req, res) => {
  let model = await getViewModel(req);
  model = await validateModel(model, req.params, res);
  if (model) {
    const { requestedRolesIds, service, selectedRoles } = model;
    const { rid, sid, orgId, uid, rolesIds } = req.params;
    const { organisation, endUsersEmail, endUsersFamilyName, endUsersGivenName } = model.request;
    const approver = req.user;

    if (Object.keys(model.validationMessages).length > 0) {
      model.csrfToken = req.csrfToken();
      return res.render('accessRequests/views/reviewServiceRequest', model);
    }

    if (model.selectedResponse === 'reject') {
      model.validationMessages = {};
      const encodedRids = encodeURIComponent(rolesIds);
      const rejectLink = `/access-requests/service-requests/${rid}/${orgId}/users/${uid}/services/${sid}/roles/${encodedRids}/rejected`;
      return res.redirect(`${rejectLink}`);
    }

    const updateServiceReq = await updateServiceRequest(rid, 1, req.user.sub);
    const resStatus = updateServiceReq.serviceRequest.status;

    if (updateServiceReq.success === false && (resStatus === -1 || 1)) {
      const request = await getAndMapServiceRequest(rid);
      const serviceName = model.service.name;
      if (request.approverEmail) {
        const { title, heading, message } = generateFlashMessages(
          'service',
          request.dataValues.status,
          request.approverEmail,
          request.endUsersGivenName,
          request.endUsersFamilyName,
          serviceName,
        );

        res.flash('title', `${title}`);
        res.flash('heading', `${heading}`);
        res.flash('message', `${message}`);
        return res.redirect(`/access-requests/requests`);
      }
    }

    await addUserService(uid, sid, orgId, requestedRolesIds, rid);

    await notificationClient.sendServiceRequestApproved(
      endUsersEmail,
      endUsersGivenName,
      endUsersFamilyName,
      organisation.name,
      service.name,
      selectedRoles.map((i) => i.name),
    );

    logger.audit({
      type: 'services',
      subType: 'access-request-approved',
      userId: approver.sub,
      userEmail: approver.email,
      application: config.loggerSettings.applicationName,
      env: config.hostingEnvironment.env,
      message: `${approver.email} (approverId: ${
        approver.sub
      }) approved service (serviceId: ${sid}) and roles (roleIds: ${JSON.stringify(
        requestedRolesIds,
      )}) and organisation (orgId: ${orgId}) for end user (endUserId: ${uid}) - requestId (reqId: ${rid})`,
    });

    res.flash('title', `Success`);
    res.flash('heading', `Service access request approved`);
    res.flash('message', `${endUsersGivenName} ${endUsersFamilyName} has been added to ${service.name}.`);

    return res.redirect(`/access-requests/requests`);
  }
};

module.exports = {
  get,
  post,
};
