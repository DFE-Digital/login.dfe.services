const { getAllRequestsTypesForApprover ,getApproversForOrganisation} = require('../../infrastructure/organisations');
const { listRolesOfService } = require('../../infrastructure/access');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const { getUserDetails } = require('./utils');

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
    model.viewModel.selectedResponse =  'Approve or Reject must be selected';
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
const getRoleAndServiceNames = async(subModel, requestId) => {
let serviceId = subModel.service_id;
let roleIds = subModel.role_ids;
const allServices = await checkCacheForAllServices(requestId);
const serviceDetails = allServices.services.find((x) => x.id === serviceId);
const allRolesOfService = await listRolesOfService(serviceId, subModel.role_ids);
let roleDetails = allRolesOfService.find(x => x.id === roleIds);
if(roleDetails.name)
subModel.Role_name = roleDetails.name;
if(serviceDetails.name)
subModel.Service_name = serviceDetails.name;
return subModel;
}

const extractVieModel= async (model, rid, requestId) => {
  let viewModel = model.requests.find(x => x.id === rid);
  viewModel.csrfToken = model.csrfToken;
  viewModel.selectedResponse= null;
  viewModel.validationMessages= {};
  viewModel.currentPage= 'requests';
//get approver for org based of orgid
const aprover = await getApproversForOrganisation(viewModel.org_id);
console.log(aprover);
viewModel = await getRoleAndServiceNames(viewModel, requestId);
  return viewModel;
};

const get = async (req, res) => {
  const model = await buildModel(req);
  const viewModel = await extractVieModel(model, req.params.rid, req.id);

  if (viewModel.approverEmail) {
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
    return res.redirect(`${model.id}/rejected`);
  }

  const actionedDate = Date.now();
  //user in org put user in sub service
  //await putUserInOrganisation(model.user_id, model.org_id, 0, null, req.id);

  //update the request check this 
  await updateRequestById(model.id, 1, req.user.sub, null, actionedDate, req.id);

  // patch search index with organisation added to user
  const getAllUserDetails = await getById(model.user_id, req.id);
  const organisation = await getOrganisationById(model.org_id, req.id);
  if (!getAllUserDetails) {
    logger.error(`Failed to find user ${model.user_id} when confirming change of organisations`, {
      correlationId: req.id,
    });
  } else if (!organisation) {
    logger.error(`Failed to find organisation ${model.org_id} when confirming change of organisations`, {
      correlationId: req.id,
    });
  } else {
    const currentOrganisationDetails = getAllUserDetails.organisations;
    const newOrgDetails = {
      id: organisation.id,
      name: organisation.name,
      urn: organisation.urn || undefined,
      uid: organisation.uid || undefined,
      establishmentNumber: organisation.establishmentNumber || undefined,
      laNumber: organisation.localAuthority ? organisation.localAuthority.code : undefined,
      categoryId: organisation.category.id,
      statusId: organisation.status.id,
      roleId: 0,
    };
    currentOrganisationDetails.push(newOrgDetails);
    await updateIndex(model.user_id, currentOrganisationDetails, null, req.id);
    await waitForIndexToUpdate(
      model.user_id,
      (updated) => updated.organisations.length === currentOrganisationDetails.length,
    );
  }

  //send approved email
  await notificationClient.sendAccessRequest(
    model.usersEmail,
    model.usersName,
    organisation.name,
    true,
    null,
  );

  //audit organisation approved
  logger.audit({
    type: 'approver',
    subType: 'approved-org',
    userId: req.user.sub,
    meta: {
      editedFields: [
        {
          name: 'new_organisation',
          oldValue: undefined,
          newValue: model.org_id,
        },
      ],
      editedUser: model.user_id,
    },
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) approved organisation request for ${model.org_id})`,
  });

  res.flash('title', `Success`);
  res.flash('heading', `Request approved: Sub Service access`);
  res.flash('message', `${model.usersName} has been added to your organisation.`);

  return res.redirect(`/access-requests/requests`);
};

module.exports = {
  get,
  post,
};
