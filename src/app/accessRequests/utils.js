const { getRequestById} = require('./../../infrastructure/organisations');
const { listRolesOfService } = require('../../infrastructure/access');
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const { getNonPagedRequestsTypesForApprover } = require('../../infrastructure/organisations/api');

const getSubServiceRequestVieModel= async (model, rid, requestId, req) => {
  let viewModel = model.requests.find(x => x.id === rid);
  viewModel.csrfToken = model.csrfToken;
  viewModel.selectedResponse= null;
  viewModel.validationMessages= {};
  viewModel.currentPage= 'requests';
  viewModel = await getRoleAndServiceNames(viewModel, requestId, req);
  return viewModel;
};

const getNewRoleDetails = async (serviceId, roleId) => {
  return await listRolesOfService(serviceId, roleId);
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

const getAllRequestsForApproval = async (req) => {
  const allRequestsForApprover = await getNonPagedRequestsTypesForApprover(req.user.sub, req.id);
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
    numberOfPages: allRequestsForApprover.totalNumberOfPages,
    totalNumberOfResults: allRequestsForApprover.totalNumberOfRecords,
  };
};
const getAndMapOrgRequest = async (req) => {
  const request = await getRequestById(req.params.rid, req.id);
  let mappedRequest;
  if (request) {
    const approver = request.actioned_by ? await Account.getById(request.actioned_by) : null;
    const user = await Account.getById(request.user_id);
    const usersName = user ? `${user.claims.given_name} ${user.claims.family_name}` : '';
    const usersEmail = user ? user.claims.email : '';
    const approverName = approver ? `${approver.given_name} ${approver.family_name}` : '';
    const approverEmail = approver ? approver.email : '';
    mappedRequest = Object.assign({ usersName, usersEmail, approverName, approverEmail }, request);
  }
  return mappedRequest;
};
const getUserDetails = async (usersForApproval) => {
  const allUserId = flatten(usersForApproval.map((user) => user.user_id));
  if (allUserId.length === 0) {
    return [];
  }
  const distinctUserIds = uniq(allUserId);
  return await Account.getUsersById(distinctUserIds);
};

module.exports = {
  getAndMapOrgRequest,
  getUserDetails,
  getAllRequestsForApproval,
  getRoleAndServiceNames,
  getNewRoleDetails,
  getSubServiceRequestVieModel,
};
