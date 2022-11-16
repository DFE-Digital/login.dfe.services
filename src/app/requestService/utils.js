const { services } = require('login.dfe.dao');

const mapUserServiceRequestStatus = (status) => {
  if (status === 0) {
    return { id: 0, description: 'Pending' };
  }
  if (status === -1) {
    return { id: -1, description: 'Rejected' };
  }
  if (status === 1) {
    return { id: 1, description: 'Approved' };
  }
};

const checkServiceRequestAndRedirect = async (reqId, res, viewModel) => {
  const userServiceRequest = await services.getUserServiceRequest(reqId);
  const userServiceRequestStatus = userServiceRequest.status;

  if (userServiceRequestStatus === -1) {
    viewModel.validationMessages = {};
    return res.render('requestService/views/serviceAlreadyRejected', viewModel);
  }

  if (userServiceRequestStatus === 1) {
    viewModel.validationMessages = {};
    return res.render('requestService/views/serviceAlreadyApproved', viewModel);
  }
};

const updateServiceRequest = async (reqId, res, statusId, approverId, model, reason) => {
  const status = mapUserServiceRequestStatus(statusId);

  const result = await services.updateUserPendingServiceRequest(reqId, {
    status: status.id,
    actioned_by: approverId,
    reason: reason ? reason : null,
    actioned_reason: status.description,
    actioned_at: new Date().toISOString(),
  });

  const resStatus = result.serviceRequest?.status;

  if (result.success === false && resStatus === -1) {
    model.validationMessages = {};
    return res.redirect('requestService/views/serviceAlreadyRejected', model);
  }

  if (result.success === false && resStatus === 1) {
    model.validationMessages = {};
    return res.redirect('requestService/views/serviceAlreadyApproved', model);
  }
};

const createServiceRequest = async (reqId, userId, serviceId, rolesIds, organisationId, statusId) => {
  const status = mapUserServiceRequestStatus(statusId);
  await services.putUserServiceRequest({
    id: reqId,
    user_id: userId,
    service_id: serviceId,
    role_ids: rolesIds.length ? rolesIds.toString() : null,
    organisation_id: organisationId,
    status: status.id,
    actioned_reason: status.description,
  });
};

module.exports = { checkServiceRequestAndRedirect, updateServiceRequest, createServiceRequest };
