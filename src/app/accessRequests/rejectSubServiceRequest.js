const { updateRequestById } = require('./../../infrastructure/organisations');
const { getAllRequestsTypesForApprover, updateSubServiceRequestById} = require('../../infrastructure/organisations');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const { listRolesOfService} = require('../../infrastructure/access');
const logger = require('./../../infrastructure/logger');
const { getUserDetails } = require('./utils');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});
const getRoleAndServiceNames = async(subModel, requestId, req) => {
    let serviceId = subModel.service_id;
    let roleIds = subModel.role_ids;
    const allServices = await checkCacheForAllServices(requestId);
    const serviceDetails = allServices.services.find((x) => x.id === serviceId);
    const allRolesOfService = await getNewRoleDetails(serviceId, subModel.role_ids);
    let roleDetails = allRolesOfService.find(x => x.id === roleIds);
    if(req !== undefined){
      req.session.role = roleDetails;
    }
    
    if(roleDetails.name)
    subModel.Role_name = roleDetails.name;
    if(serviceDetails.name)
    subModel.Service_name = serviceDetails.name;
    return subModel;
    }
    const getNewRoleDetails = async (serviceId, roleId) => {
      return await listRolesOfService(serviceId, roleId);
    };
    const extractVieModel= async (model, rid, requestId, req) => {
      let viewModel = model.requests.find(x => x.id === rid);
      viewModel.csrfToken = model.csrfToken;
      viewModel.selectedResponse= null;
      viewModel.validationMessages= {};
      viewModel.currentPage= 'requests';
      viewModel = await getRoleAndServiceNames(viewModel, requestId, req);
      return viewModel;
    };
const getAllRequestsForApproval = async (req) => {
    const pageSize = 5;
    const paramsSource = req.method.toUpperCase() === 'POST' ? req.body : req.query;
    let pageNumber = parseInt(paramsSource.page, 10) || 1;
    if (isNaN(pageNumber)) {
      pageNumber = 1;
    }
  
    const allRequestsForApprover = await getAllRequestsTypesForApprover(req.user.sub, pageSize, pageNumber, req.id);
    let { requests } = allRequestsForApprover;
    if (requests) {
      const userList = (await getUserDetails(requests)) || [];
  
      requests = requests.map((user) => {
        const userFound = userList.find((c) => c.claims.sub.toLowerCase() === user.user_id.toLowerCase());
        const usersEmail = userFound ? userFound.claims.email : '';
        const userName = userFound ? `${userFound.claims.given_name} ${userFound.claims.family_name}` : '';
        return Object.assign({ usersEmail, userName }, user);
      });
    }
  
    return {
      csrfToken: req.csrfToken(),
      title: 'Requests - DfE Sign-in',
      currentPage: 'requests',
      requests,
      pageNumber,
      numberOfPages: allRequestsForApprover.totalNumberOfPages,
      totalNumberOfResults: allRequestsForApprover.totalNumberOfRecords,
    };
  };
const buildModel = async (req) => {
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
    const model = await buildModel(req);
    const viewModel = await extractVieModel(model, req.params.rid, req.id, req);
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

const validate = async (req) => {
    const buildmodel = await buildModel(req);
    const viewModel = await extractVieModel(buildmodel, req.params.rid, req.id);
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
    model.validationMessages.reason = `Request already actioned by ${model.request.approverEmail}`;
  }
  return model;
};

const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.viewModel.validationMessages).length > 0) {
    model.viewModel.csrfToken = req.csrfToken();
    return res.render('accessRequests/views/rejectSubServiceRequest', model.viewModel);
  }

  // patch request with rejection
  const actionedDate = Date.now();
  const updateServiceReq =  await updateSubServiceRequestById(req.user.sub, model.viewModel.service_id, model.viewModel.org_id, model.viewModel.role_ids, req.id);
  //await updateRequestById(req.params.rid, -1, req.user.sub, model.reason, actionedDate, req.id);

  //send rejected email
  await notificationClient.sendAccessRequest(
    model.viewModel.usersEmail,
    model.viewModel.usersName,
    model.viewModel.org_name,
    false,
    model.reason,
  );

  //audit organisation rejected
  logger.audit({
    type: 'approver',
    subType: 'rejected-org',
    userId: req.user.sub,
    editedUser: model.viewModel.user_id,
    reason: model.reason,
    currentPage: 'requests',
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) rejected organisation request for ${model.viewModel.org_id})`,
  });

  res.flash('title', `Success`);
  res.flash('heading', `Request rejected: Organisation access`);
  res.flash('message', `${model.viewModel.userName} cannot access your organisation.`);

  return res.redirect(`/access-requests/requests`);
};

module.exports = {
  get,
  post,
};
