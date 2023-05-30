const {updateServiceRequest} = require('../requestService/utils');
const { isServiceEmailNotificationAllowed } = require('../../../src/infrastructure/applications');
const { getSubServiceRequestVieModel, getAndMapServiceRequest } = require('./utils');
const logger = require('./../../infrastructure/logger');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');


const validate = async (req) => {
  const buildmodel = await getAndMapServiceRequest(req.params.rid); 
  const viewModel = await getSubServiceRequestVieModel(buildmodel, req.id, req);
  viewModel.selectedResponse = req.body.selectedResponse;
const model = {
  title: 'Reason for rejection - DfE Sign-in',
  backLink: `/access-requests/subService-requests/${req.params.rid}`,
  cancelLink: `/access-requests/requests`,
  reason: req.body.reason,
  viewModel,
  validationMessages: {},
};
if (model.reason.length > 1000) {
  model.viewModel.validationMessages.reason = 'Reason cannot be longer than 1000 characters';
} else if (model.viewModel.approverEmail) {
  model.validationMessages.reason = `Request already actioned by ${model.viewModel.approverEmail}`;
}
return model;
};
const get = async (req, res) => {
    const model = await getAndMapServiceRequest(req.params.rid); 
    const viewModel = await getSubServiceRequestVieModel(model, req.id, req);
    viewModel.backLink =  `/access-requests/requests`;
  return res.render('accessRequests/views/rejectSubServiceRequest', {
    csrfToken: req.csrfToken(),
    title: 'Reason for rejection - DfE Sign-in',
    backLink: `/access-requests/subService-requests/${req.params.rid}`,
    cancelLink: `/access-requests/requests`,
    reason: '',
    validationMessages: {},
    currentPage: 'requests',
  });
};
const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.viewModel.validationMessages).length > 0) {
    model.viewModel.csrfToken = req.csrfToken();
    return res.render('accessRequests/views/rejectSubServiceRequest', model.viewModel);
  }
  //reqId, statusId, approverId, reason
  const request = await updateServiceRequest(req.params.rid,-1,req.user.sub,model.reason);
 if(request.success)
 {
  //send rejected email
  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  if (isEmailAllowed) {
    const notificationClient = new NotificationClient({
      connectionString: config.notifications.connectionString,
    });
    await notificationClient.sendSubServiceRequestRejected(
      model.viewModel.endUsersEmail,
          model.viewModel.endUsersGivenName,
          model.viewModel.endUsersFamilyName,
          model.viewModel.org_name,
          model.viewModel.Service_name,
          model.viewModel.Role_name,
          model.reason,
    );
  }
  logger.audit({
    type: 'sub-service',
    subType: 'sub-service request Rejected',
    userId: req.user.sub,
    userEmail: req.user.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (approverId: ${
      req.user.sub
    }) rejected sub-service request for (serviceId: ${model.viewModel.service_id}) and sub-services (roleIds: ${JSON.stringify(
      model.viewModel.role_ids,
    )}) for organisation (orgId: ${model.viewModel.org_id}) for end user (endUserId: ${model.viewModel.user_id}). ${
      model.reason ? `The reject reason is ${model.reason}` : ''
    } - requestId (reqId: ${req.params.rid})`,
  });

  res.flash('title', 'Success');
  res.flash('heading', 'Sub-service request rejected');
  res.flash(
    'message',
    'The user who raised the request will receive an email to tell them their sub-service access request has been rejected',
  );

  return res.redirect(`/access-requests/requests`);
 }
};
module.exports = {
  get,
  post,
};
