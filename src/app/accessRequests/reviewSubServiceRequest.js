const { getAllRequestsTypesForApprover ,getApproversForOrganisation} = require('../../infrastructure/organisations');
const { listRolesOfService, updateUserService, updateServiceRequest} = require('../../infrastructure/access');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const { getUserDetails } = require('./utils');
const { actions } = require('../constans/actions');
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
const validate = async (req) => {
  const buildmodel = await buildModel(req);
  const viewModel = await extractVieModel(buildmodel, req.params.rid, req.id);
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
//get approver for org based of orgid

viewModel = await getRoleAndServiceNames(viewModel, requestId, req);
  return viewModel;
};

const get = async (req, res) => {
  const model = await buildModel(req);
  const viewModel = await extractVieModel(model, req.params.rid, req.id, req);
 // viewModel.backLink = model.backLink;
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
//approvals/3DE9D503-6609-4239-BA55-14F8EBD69F56/users/A76A1DC8-0A38-459B-B2B2-E07767C6438B/services/DF2AE7F3-917A-4489-8A62-8B9B536A71CC
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

  const actionedDate = Date.now();
  const aprover = await getApproversForOrganisation(viewModel.org_id);
  //update the request check this 
  const updateServiceReq = await updateServiceRequest( req.params.rid, 1, aprover);
  // update user serviuce with new roleid
  await updateUserService(viewModel.user_id, viewModel.service_id, viewModel.org_id, viewModel.role_ids, req.id);

  logger.audit({
    type: 'approver',
    subType: 'user-Subservice-updated',
    userId: req.user.sub,
    userEmail: req.user.email,
    meta: {
      editedFields: [
        {
          name: 'update_Subservice',
          newValue: viewModel.role_ids,
        },
      ],
      editedUser: uid,
    },
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) updated sub service ${viewModel.Role_name} for organisation ${viewModel.org_name} (id: ${viewModel.org_id}) for user ${req.session.user.email} (id: ${viewModel.user_id})`,
  });

  res.flash('title', `Success`);
  res.flash('heading', `Sub Service amended: ${viewModel.Role_name}`);
  res.flash('message', `The user can now access its edited functions and features.`);
    //return res.redirect(`/approvals/users/${uid}`);
  

  return res.redirect(`/access-requests/requests`);
};

module.exports = {
  get,
  post,
};
