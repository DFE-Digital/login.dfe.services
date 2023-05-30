const Account = require('./../../infrastructure/account');
const {updateServiceRequest} = require('../requestService/utils');
const { getNewRoleDetails, getSubServiceRequestVieModel, getAndMapServiceRequest, generateFlashMessages } = require('./utils');
const { isServiceEmailNotificationAllowed } = require('../../../src/infrastructure/applications');
const { actions } = require('../constans/actions');
const logger = require('./../../infrastructure/logger');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');

const validate = async (req) => {
  const buildmodel = await getAndMapServiceRequest(req.params.rid); 
  const viewModel = await getSubServiceRequestVieModel(buildmodel, req.id);
  viewModel.selectedResponse = req.body.selectedResponse;
  const model = {
    title: 'Review request - DfE Sign-in',
    backLink: `/access-requests/requests`,
    cancelLink: `/access-requests/requests`,
    viewModel,
    selectedResponse: req.body.selectedResponse,
    validationMessages: {},
    currentPage: 'requests',
  };
  if (model.selectedResponse === undefined || model.selectedResponse === null) {
    model.validationMessages.selectedResponse = 'Approve or Reject must be selected';
    model.viewModel.validationMessages.selectedResponse =  'Approve or Reject must be selected';
  } else if (model.viewModel.approverEmail) {
    model.validationMessages.selectedResponse = `Request already actioned by ${model.viewModel.approverEmail}`;
    model.viewModel.validationMessages.selectedResponse = `Request already actioned by ${model.viewModel.approverEmail}`;
  }
  return model;
};

const get = async (req, res) => {
  const model = await getAndMapServiceRequest(req.params.rid); 
  const viewModel = await getSubServiceRequestVieModel(model, req.id, req);
  
  req.session.rid = req.params.rid;
  if(req.session.roleId != undefined && req.session.roleId  !== viewModel.role_ids)
  {
    let allServiceRole = await getNewRoleDetails(viewModel.service_id, req.session.roleId);
    let roleDetails = allServiceRole.find(x => x.id === req.session.roleId);
    viewModel.role_ids = req.session.roleId;
    viewModel.Role_name = roleDetails.name;
    req.session.roleId =  undefined;
  }
  
  viewModel.csrfToken = req.csrfToken();

  viewModel.subServiceAmendUrl = `/approvals/${viewModel.org_id}/users/${viewModel.user_id}/services/${viewModel.service_id}?actions=${actions.REVIEW_SUBSERVICE_REQUEST}`;
  if (viewModel.actioned_by && (viewModel.status === -1 || 1 )) {
    const user = await Account.getById(viewModel.actioned_by);
    const { title, heading, message } = generateFlashMessages(
      'service',
      viewModel.status,user.claims.email,viewModel.endUsersGivenName,viewModel.endUsersFamilyName, viewModel.Role_name,
      res,
    );
    res.flash('title', `${title}`);
    res.flash('heading', `${heading}`);
    res.flash('message', `${message}`);
    return res.redirect(`/access-requests/requests`);
  }
  return res.render('accessRequests/views/reviewSubServiceRequest', viewModel);
};

const post = async (req, res) => {
  const model = await validate(req);
  //check request for already actioned
 
  const request = await getAndMapServiceRequest(req.params.rid); 
  if(request.dataValues.status === -1 || 1){  
    const alreadyActioned = await getSubServiceRequestVieModel(request, req.id, req);
    if (alreadyActioned.actioned_by) {
      model.viewModel.validationMessages.alreadyActioned = `Request already actioned by ${alreadyActioned.actioned_by}`;
      const user = await Account.getById(alreadyActioned.actioned_by);
      const { title, heading, message } = generateFlashMessages(
        'service',
        request.dataValues.status ,alreadyActioned.endUsersGivenName, user.claims.email,alreadyActioned.endUsersFamilyName, alreadyActioned.Role_name,
        res,
      );
      res.flash('title', `${title}`);
      res.flash('heading', `${heading}`);
      res.flash('message', `${message}`);
      return res.redirect(`/access-requests/requests`);
    }
  }

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    model.viewModel.csrfToken = req.csrfToken();
    return res.render('accessRequests/views/reviewSubServiceRequest', model.viewModel);
  }

  if (model.selectedResponse === 'reject') {
    model.csrfToken = req.csrfToken();
    model.viewModel.csrfToken = req.csrfToken();
    model.validationMessages = {};
    model.viewModel.validationMessages={};
    return res.redirect(`/access-requests/subService-requests/${req.params.rid}/rejected`);
  }
  else if(model.selectedResponse === 'approve'){
    const request = await updateServiceRequest(req.params.rid,1,req.user.sub,model.reason);
    if (request.success){
      const isEmailAllowed = await isServiceEmailNotificationAllowed();
      if (isEmailAllowed) {
        const notificationClient = new NotificationClient({
          connectionString: config.notifications.connectionString,
        });
        
        await notificationClient.sendSubServiceRequestApproved(
          model.viewModel.endUsersEmail,
          model.viewModel.endUsersGivenName,
          model.viewModel.endUsersFamilyName,
          model.viewModel.org_name,
          model.viewModel.Service_name,
          model.viewModel.Role_name
        );
      }
      const approver = await Account.getById(model.viewModel.actioned_by);
        logger.audit({
          type: 'sub-service',
          subType: 'sub-service request Approved',
          userId: req.user.sub,
          userEmail: req.user.email,
          meta: {
            editedFields: [
              {
                name: 'Approved_Subservice',
                newValue: model.viewModel.role_ids,
              },
            ],
            editedUser: req.user.sub,
          },
          application: config.loggerSettings.applicationName,
          env: config.hostingEnvironment.env,
          message:  `${req.user.email} (approverId: ${
            approver.sub
          }) approved sub-service request for (serviceId: ${model.viewModel.service_id}) and sub-services (roleIds: ${JSON.stringify(
            model.viewModel.role_ids,
          )}) and organisation (orgId: ${model.viewModel.org_id}) for end user (endUserId: ${model.viewModel.user_id}) - requestId (reqId: ${req.params.rid})`,
        });

        res.flash('title', `Success`);
        res.flash('heading', `Sub Service amended: ${model.viewModel.Role_name}`);
        res.flash('message', `The user who raised the request will receive an email to tell them their sub-service access request has been approved`);
        return res.redirect(`/access-requests/requests`);
    }
  }
};

module.exports = {
  get,
  post,
};
