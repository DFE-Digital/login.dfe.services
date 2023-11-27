'use strict';
const { mapUserStatus } = require('./../../infrastructure/utils');
const { getAllUsersForOrg, searchForUsers } = require('../../infrastructure/search');
const { getById } = require('../../infrastructure/account');
const { getApproverOrgsFromReq } = require('./utils');
const { actions } = require('../constans/actions');
const he = require('he');

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
  const approverOrgIds = approverOrgs.map((org) => org.organisation.id);

  let selectedOrganisations = [];
  let filteredOrgIds = [];

  if (paramsSource && paramsSource.selectedOrganisation) {
    const selectedOrgIds = paramsSource.selectedOrganisation;
    selectedOrganisations = typeof selectedOrgIds === 'string' ? selectedOrgIds.split(',') : selectedOrgIds;
    filteredOrgIds = selectedOrganisations;
  } else {
    filteredOrgIds = approverOrgIds;
  }

  let usersForOrganisation;
  if (paramsSource.searchCriteria && paramsSource.searchCriteria.length >= 3) {
    usersForOrganisation = await searchForUsers(
      `${paramsSource.searchCriteria}*`,
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
    usersForOrganisation = await getAllUsersForOrg(page, filteredOrgIds, sortBy, sortAsc ? 'asc' : 'desc', req.id);
  }

  if (usersForOrganisation.users.length) {
    const users = usersForOrganisation.users.filter((item) => item.id !== req.user.sub);
    if (users.length == 0) {
      usersForOrganisation.numberOfPages = 0;
      usersForOrganisation.totalNumberOfResults = 0;
    }
    usersForOrganisation.users = users;
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
    user.primaryOrganisation = [...user.organisations].shift().name;
  }

  if (sortBy === 'primaryOrganisation') {
    if (sortAsc) {
      usersForOrganisation.users.sort((a, b) => (a.primaryOrganisation > b.primaryOrganisation ? 1 : -1));
    } else {
      usersForOrganisation.users.sort((a, b) => (a.primaryOrganisation > b.primaryOrganisation ? -1 : 1));
    }
  }

  usersForOrganisation.users = filterDuplicateUsers(usersForOrganisation.users);

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
    searchCriteria: paramsSource.searchCriteria || '',
    sort: {
      searchableName: {
        nextDirection: sortBy === 'searchableName' ? (sortAsc ? 'desc' : 'asc') : 'asc',
        applied: sortBy === 'searchableName',
      },
      primaryOrganisation: {
        nextDirection: sortBy === 'primaryOrganisation' ? (sortAsc ? 'desc' : 'asc') : 'asc',
        applied: sortBy === 'primaryOrganisation',
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

const filterDuplicateUsers = (users) => {
  if(!users || users.length == 0) {
    return users;
  }

  users.forEach((item, index, object) => {
    if (item.statusId.description.toLowerCase() == 'invited') {
      const activeUser = users.find(u => u.email == item.email && u.statusId.description.toLowerCase() == 'active');
      if (activeUser) {
        object.splice(index, 1);
      }
    }
  });

  return users;
}

const buildInviteUserLink = (orgIds) => {
  if (orgIds && orgIds.length === 1) {
    return `/approvals/${orgIds[0]}/users/new-user`;
  }
  return `/approvals/select-organisation?action=${actions.ORG_INVITE}`;
};

const get = async (req, res) => {
  clearUserSessionData(req);

  const result = await search(req);
  const inviteUserUrl = buildInviteUserLink(result.approverOrgIds);
  const requestsUrl = `/access-requests/requests`;
  const showFilter = req.query.showFilter?.toLowerCase() === 'true';

  return res.render('users/views/usersList', {
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
    validations: {},
    showFilter,
    searchCriteria: result.searchCriteria,
  });
};

const validateOrgSelection = (req, model) => {
  const selectedOrg = req.body.selectedOrganisation;
  if (selectedOrg === undefined || selectedOrg === null) {
    model.validations.selectedOrganisation = 'Select at least one organisation';
  }
};

const validateSearch = (req, model) => {
  const searchCriteria = req.body.searchCriteria;
  if (searchCriteria === undefined || searchCriteria === null || searchCriteria.length < 3) {
    model.validations.searchUser = 'Enter at least three characters to search users';
  }
};

const post = async (req, res) => {
  const reqBody = req.body;

  let model = {
    validations: {},
    showFilter: reqBody.showFilter || reqBody.isFilterToggle === 'true',
  };

  if (reqBody.showFilter) {
    model.showFilter = !(model.showFilter === 'true');
  }

  if (reqBody.searchUser) {
    validateSearch(req, model);
  }

  if (reqBody.applyFilter) {
    validateOrgSelection(req, model);
  }

  if (reqBody.removeFilter) {
    req.body.selectedOrganisation = null;
  }

  model.searchCriteria = req.body.searchCriteria || '';

  const result = await search(req);
  const inviteUserUrl = buildInviteUserLink(result.approverOrgIds);
  const requestsUrl = `/access-requests/requests`;
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
    searchCriteria: he.decode(result.searchCriteria),
  });
};

module.exports = {
  get,
  post,
};
