'use strict';
const { mapUserStatus } = require('./../../infrastructure/utils');
const { getAllUsersForOrg, searchForUsers } = require('../../infrastructure/search');
const { getById } = require('../../infrastructure/account');
const { getApproverOrgsFromReq } = require('./utils');
const { actions } = require('../constans/actions');

const clearUserSessionData = (req) => {
  if (req.session.user) {
    req.session.user = undefined;
  }
};

const search = async (req) => {
  const paramsSource = req.method === 'POST' ? req.body : req.query;
  let page = paramsSource.page ? parseInt(paramsSource.page) : 1;
  if (isNaN(page)) {
    page = 1;
  }
  
  let sortBy = paramsSource.sort ? paramsSource.sort : 'searchableName';
  let sortAsc = (paramsSource.sortdir ? paramsSource.sortdir : 'asc').toLowerCase() === 'asc';

  const approverOrgs = getApproverOrgsFromReq(req);

  let approverOrgIds = []
  for(let i= 0; i < approverOrgs.length; i++) {
    const org = approverOrgs[i]
    const orgId = org.organisation.id
    approverOrgIds.push(orgId)
  }

  let selectedOrganisations = []
  let filteredOrgIds = []

  if(req.body && req.body.selectedOrganisation) {
    const selectedOrgIds = req.body.selectedOrganisation
    selectedOrganisations = (typeof selectedOrgIds === 'string') ? selectedOrgIds.split(',') : selectedOrgIds
    filteredOrgIds = selectedOrganisations
  }
  else {
    filteredOrgIds = approverOrgIds
  }

  let usersForOrganisation;
  if (paramsSource.searchCriteria && paramsSource.searchCriteria.length >= 3) {
    usersForOrganisation = await searchForUsers(
      paramsSource.searchCriteria.replace(' ', '*&*').trim() + '*',
      page,
      sortBy,
      sortAsc ? 'asc' : 'desc',
      {
        filter_organisations: filteredOrgIds,
      },
      ['firstName', 'lastName'],
      req.id,
    );
  } else {
    usersForOrganisation = await getAllUsersForOrg(page, filteredOrgIds, sortBy, sortAsc ? 'asc' : 'desc', req.id)
  }

  for (let i = 0; i < usersForOrganisation.users.length; i++) {
    const user = usersForOrganisation.users[i];
    if (req.user.sub === user.id) {
      const me = await getById(req.user.sub);
      user.email = me.claims.email;
    }

    const approverUserOrgs = user.organisations.filter((x) => filteredOrgIds.includes(x.id));
    user.statusId = mapUserStatus(user.statusId);
    user.organisations = approverUserOrgs.sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    page,
    sortBy,
    sortOrder: sortAsc ? 'asc' : 'desc',
    usersForOrganisation,
    approverOrgIds,
    filteredOrgIds,
    selectedOrganisations,
    approverOrgs,
    numberOfPages: usersForOrganisation.numberOfPages,
    totalNumberOfResults: usersForOrganisation.totalNumberOfResults,
    sort: {
      searchableName: {
        nextDirection: sortBy === 'searchableName' ? (sortAsc ? 'desc' : 'asc') : 'asc',
        applied: sortBy === 'searchableName',
      },
      searchableEmail: {
        nextDirection: sortBy === 'searchableEmail' ? (sortAsc ? 'desc' : 'asc') : 'asc',
        applied: sortBy === 'searchableEmail',
      },
      lastLogin: {
        nextDirection: sortBy === 'lastLogin' ? (sortAsc ? 'desc' : 'asc') : 'asc',
        applied: sortBy === 'lastLogin',
      },
      statusId: {
        nextDirection: sortBy === 'statusId' ? (sortAsc ? 'desc' : 'asc') : 'asc',
        applied: sortBy === 'statusId',
      },
    },
  };
};

const buildInviteUserLink = (orgIds) => {
  if (orgIds && orgIds.length === 1) {
    return `/approvals/${orgIds[0]}/users/new-user`;
  }
  return `/approvals/select-organisation?action=${actions.ORG_INVITE}`;
};

const buildRequestsLink = (orgIds) => {
  if (orgIds && orgIds.length === 1) {
    return `/access-requests/${orgIds[0]}/requests`;
  }
  return `/approvals/select-organisation?action=${actions.VIEW_ORG_REQUESTS}`;
};

const get = async (req, res) => {
  clearUserSessionData(req);

  const result = await search(req);
  const inviteUserUrl = buildInviteUserLink(result.approverOrgIds);
  const requestsUrl = buildRequestsLink(result.approverOrgIds);

  return res.render('users/views/usersList', {
    title: 'Manage users',
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    approverOrgs: result.approverOrgs,
    selectedOrganisations: [],
    usersForOrganisation: result.usersForOrganisation,
    page: result.page,
    sort: result.sort,
    sortBy: result.sortBy,
    sortOrder: result.sortOrder,
    numberOfPages: result.numberOfPages,
    totalNumberOfResults: result.totalNumberOfResults,
    inviteUserUrl,
    requestsUrl,
    validations: {},
    showFilter: false,
    searchCriteria: ''
  });
};

const validateOrgSelection = (req, model) => {
  const selectedOrg = req.body.selectedOrganisation
  if (selectedOrg === undefined || selectedOrg === null) {
    model.validations.selectedOrganisation = 'Select at least one organisation';
  }
};

const validateSearch = (req, model) => {
  const searchCriteria = req.body.searchCriteria
  if (searchCriteria === undefined || searchCriteria === null || searchCriteria.length < 3) {
    model.validations.searchUser = 'Enter at least three characters to search users';
  }
}

const post = async (req, res) => {
  const reqBody = req.body

  let model = {
    validations: {},
    showFilter: reqBody.showFilter || (reqBody.isFilterToggle === "true")
  };

  if(reqBody.showFilter) {
    model.showFilter = !(model.showFilter === "true")
  }

  if(reqBody.searchUser) {
    validateSearch(req, model)
  }

  if (reqBody.applyFilter) {
    validateOrgSelection(req, model)
  }

  if(reqBody.removeFilter) {
    req.body.selectedOrganisation = null
    req.body.searchCriteria = ""
  }

  model.searchCriteria = req.body.searchCriteria || ""

  const result = await search(req);
  const inviteUserUrl = buildInviteUserLink(result.approverOrgIds)
  const requestsUrl = buildRequestsLink(result.approverOrgIds)

  return res.render('users/views/usersList', {
    ...model,
    title: 'Manage users',
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    approverOrgs: result.approverOrgs,
    selectedOrganisations: result.selectedOrganisations,
    usersForOrganisation: result.usersForOrganisation,
    page: result.page,
    sort: result.sort,
    sortBy: result.sortBy,
    sortOrder: result.sortOrder,
    numberOfPages: result.numberOfPages,
    totalNumberOfResults: result.totalNumberOfResults,
    inviteUserUrl,
    requestsUrl,
  });
};

module.exports = {
  get,
  post
};
