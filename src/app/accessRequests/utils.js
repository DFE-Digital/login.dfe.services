
const { listRolesOfService } = require('../../infrastructure/access');
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const { getNonPagedRequestsTypesForApprover } = require('../../infrastructure/organisations/api');
const {
  getRequestById,
  getOrganisationById
} = require('./../../infrastructure/organisations');

const { services } = require('login.dfe.dao');

const getSubServiceRequestVieModel= async (model,requestId, req) => {
  let viewModel = {};
  viewModel.endUser = model.endUser;
  viewModel.endUsersEmail = model.endUsersEmail;
  viewModel.endUsersFamilyName = model.endUsersFamilyName;
  viewModel.endUsersGivenName = model.endUsersGivenName;
  viewModel.org_name = model.organisation.name;
  viewModel.org_id = model.organisation.id;
  viewModel.user_id = model.dataValues.user_id;
  viewModel.role_ids = model.dataValues.role_ids;
  viewModel.service_id = model.dataValues.service_id;
  viewModel.status = model.dataValues.status;
  viewModel.actioned_reason = model.dataValues.actioned_reason;
  viewModel.action_by = model.dataValues.actioned_by;
  viewModel.reason = model.dataValues.reason;
  viewModel.csrfToken = null;
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

const getAndMapServiceRequest = async (serviceReqId) => {
  const userServiceRequest = await services.getUserServiceRequest(serviceReqId);
  let mappedServiceRequest;
  if (userServiceRequest) {
    const approver = userServiceRequest.actioned_by ? await Account.getById(userServiceRequest.actioned_by) : null;
    const endUser = await Account.getById(userServiceRequest.user_id);
    const endUsersGivenName = endUser ? `${endUser.claims.given_name}` : '';
    const endUsersFamilyName = endUser ? `${endUser.claims.family_name}` : '';
    const endUsersEmail = endUser ? endUser.claims.email : '';
    const approverName = approver ? `${approver.given_name} ${approver.family_name}` : '';
    const approverEmail = approver ? approver.email : '';
    const organisation = await getOrganisationById(userServiceRequest.organisation_id, serviceReqId);
    mappedServiceRequest = Object.assign(
      { endUsersGivenName, endUsersFamilyName, endUsersEmail, approverName, approverEmail },
      { organisation },
      userServiceRequest,
    );
  }
  return mappedServiceRequest;
};

module.exports = {
  getAndMapOrgRequest,
  getUserDetails,
  getRoleAndServiceNames,
  getNewRoleDetails,
  getSubServiceRequestVieModel,
  getAndMapServiceRequest,
};
