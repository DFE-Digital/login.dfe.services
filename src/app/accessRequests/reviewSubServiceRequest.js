const {updateServiceRequest} = require('../requestService/utils');
const { getAllRequestsForApproval,getNewRoleDetails, getSubServiceRequestVieModel } = require('./utils');
const { actions } = require('../constans/actions');
const logger = require('./../../infrastructure/logger');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');


const validate = async (req) => {
  const buildmodel = await getEveryPendingRequest(req);
  const viewModel = await getSubServiceRequestVieModel(buildmodel, req.params.rid, req.id);
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
const getEveryPendingRequest = async (req) => {
  const pagedRequests = await getAllRequestsForApproval(req);
  return {
    csrfToken: req.csrfToken(),
    title: 'Requests - DfE Sign-in',
    currentPage: 'requests',
    requests: pagedRequests.requests,
    page: pagedRequests.pageNumber,
    numberOfPages: pagedRequests.numberOfPages,
    totalNumberOfResults: pagedRequests.totalNumberOfResults,
  };
};

const get = async (req, res) => {
  const model = await getEveryPendingRequest(req);
  const viewModel = await getSubServiceRequestVieModel(model, req.params.rid, req.id, req);
  viewModel.backLink =  `/access-requests/requests`;
  req.session.rid = req.params.rid;
  if(req.session.roleId != undefined && req.session.roleId  !== viewModel.role_ids)
  {
    let allServiceRole = await getNewRoleDetails(viewModel.service_id, req.session.roleId);
    let roleDetails = allServiceRole.find(x => x.id === req.session.roleId);
    viewModel.role_ids = req.session.roleId;
    viewModel.Role_name = roleDetails.name;
    req.session.roleId =  undefined;
  }
  viewModel.subServiceAmendUrl = `/approvals/${viewModel.org_id}/users/${viewModel.user_id}/services/${viewModel.service_id}?actions=${actions.REVIEW_SUBSERVICE_REQUEST}`;
  if (viewModel.approverEmail) {
    //question this information to be displayed without approvers email
    res.flash('warn', `Request already actioned by ${viewModel.approverEmail}`);
    return res.redirect(`/access-requests/requests`);
  }
  return res.render('accessRequests/views/reviewSubServiceRequest', viewModel);
};
const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    model.viewModel.csrfToken = req.csrfToken();
    return res.render('accessRequests/views/reviewSubServiceRequest', model.viewModel);
  }

  if (model.selectedResponse === 'reject') {
    model.validationMessages = {};
    model.viewModel.validationMessages={};
    return res.redirect(`/access-requests/subService-requests/${req.params.rid}/rejected`);
  }
  else if(model.selectedResponse === 'approve'){
    const request = await updateServiceRequest(req.params.rid,1,req.user.sub,model.reason);
    if (request.success){
      const isEmailAllowed = await isServiceEmailNotificationAllowed();
      if (isEmailAllowed && config.hostingEnvironment.env !== 'dev') {
        const notificationClient = new NotificationClient({
          connectionString: config.notifications.connectionString,
        });
        let namearry = model.viewModel.userName.split(' ');
        await notificationClient.sendServiceRequestApproved(
          model.viewModel.usersEmail,
          namearry[0],
          namearry[1],
          model.viewModel.org_name,
          model.viewModel.Service_name,
          model.viewModel.Role_name,
          model.reason,
        );
      }
        logger.audit({
          type: 'approver',
          subType: 'user-Subservice-updated',
          userId: req.user.sub,
          userEmail: req.user.email,
          meta: {
            editedFields: [
              {
                name: 'update_Subservice',
                newValue: model.viewModel.role_ids,
              },
            ],
            editedUser: req.user.sub,
          },
          application: config.loggerSettings.applicationName,
          env: config.hostingEnvironment.env,
          message: `${req.user.email} (id: ${req.user.sub}) updated sub service ${model.viewModel.Role_name} for organisation ${model.viewModel.org_name} (id: ${model.viewModel.org_id}) for user ${req.session.user.email} (id: ${model.viewModel.user_id})`,
        });

        res.flash('title', `Success`);
        res.flash('heading', `Sub Service amended: ${model.viewModel.Role_name}`);
        res.flash('message', `The user who raised the request will receive an email to tell them their sub-service access request has been approved`);
        return res.redirect(`/access-requests/requests`);
    }else{
    model.viewModel.csrfToken = req.csrfToken();
    model.viewModel.validationMessages.selectedResponse = 'Ooops something went wrong!'
    return res.render('accessRequests/views/reviewSubServiceRequest', model.viewModel);
    }
  }
  else{
    
    model.viewModel.csrfToken = req.csrfToken();
    model.viewModel.validationMessages.selectedResponse = 'Ooops something went wrong!'
    return res.render('accessRequests/views/reviewSubServiceRequest', model.viewModel);
  }
};
module.exports = {
  get,
  post,
};
