'use strict';
const { mapUserStatus } = require('./../../infrastructure/utils');
const { getAllUsersForOrg } = require('../../infrastructure/search');
const { getById } = require('../../infrastructure/account');
const { getApproverOrgsFromReq } = require('./utils');
const { actions } = require('../constans/actions');

const clearUserSessionData = (req) => {
  if (req.session.user) {
    req.session.user = undefined;
  }
};

const search = async (req) => {
  const approverOrgs = getApproverOrgsFromReq(req);
  const paramsSource = req.method === 'POST' ? req.body : req.query;
  let page = paramsSource.page ? parseInt(paramsSource.page) : 1;
  if (isNaN(page)) {
    page = 1;
  }
  let sortBy = paramsSource.sort ? paramsSource.sort : 'searchableName';
  let sortAsc = (paramsSource.sortdir ? paramsSource.sortdir : 'asc').toLowerCase() === 'asc';

  let approverOrgIds = [];
  for (let i = 0; i < approverOrgs.length; i++) {
    const org = approverOrgs[i];
    const orgId = org.organisation.id;
    approverOrgIds.push(orgId);
  }

  const usersForOrganisation = await getAllUsersForOrg(page, approverOrgIds, sortBy, sortAsc ? 'asc' : 'desc', req.id);

  for (let i = 0; i < usersForOrganisation.users.length; i++) {
    const user = usersForOrganisation.users[i];
    if (req.user.sub === user.id) {
      const me = await getById(req.user.sub);
      user.email = me.claims.email;
    }

    const approverUserOrgs = user.organisations.filter((x) => approverOrgIds.includes(x.id));
    user.statusId = mapUserStatus(user.statusId);
    user.organisations = approverUserOrgs;
  }

  return {
    page,
    sortBy,
    sortOrder: sortAsc ? 'asc' : 'desc',
    usersForOrganisation,
    approverOrgIds,
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

const post = async (req, res) => {
  const result = await search(req);
  return res.render('users/views/usersList', {
    title: 'Manage users',
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    usersForOrganisation: result.usersForOrganisation,
    page: result.page,
    sort: result.sort,
    sortBy: result.sortBy,
    sortOrder: result.sortOrder,
    numberOfPages: result.numberOfPages,
    totalNumberOfResults: result.totalNumberOfResults,
  });
};

module.exports = {
  get,
  post,
};
