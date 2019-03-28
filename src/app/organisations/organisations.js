'use strict';

const { getOrganisationAndServiceForUser } = require('./../../infrastructure/organisations');
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');

const getApproversDetails = async (organisations) => {
  const allApproverIds = flatten(organisations.map((org) => org.approvers));
  const distinctApproverIds = uniq(allApproverIds);
  if (distinctApproverIds.length === 0) {
    return [];
  }
  return Account.getUsersByIdV2(distinctApproverIds);
};

const mapRole = (role) => {
  let id = role.id;
  if (id === 0) {
    id = 'end-user';
  }
  if (id === 10000) {
    id = 'approver';
  }
  return {
    id,
    name: role.name,
  };
};

const getAndMapOrganisationsAndServices = async (account, correlationId) => {
  const organisations = await getOrganisationAndServiceForUser(account.id, correlationId);
  const allApprovers = await getApproversDetails(organisations, correlationId);

  return organisations.map((organisation) => {
    const approvers = organisation.approvers.map((approverId) => {
      return allApprovers.find(x => x.id.toLowerCase() === approverId.toLowerCase());
    }).filter(x => x);
    return {
      id: organisation.organisation.id,
      name: organisation.organisation.name,
      urn: organisation.organisation.urn,
      uid: organisation.organisation.uid,
      role: mapRole(organisation.role),
      approvers,
    };
  })
};

const organisations = async (req, res) => {
  const account = Account.fromContext(req.user);
  const organisations = await getAndMapOrganisationsAndServices(account, req.id);

  return res.render('organisations/views/organisations', {
    title: 'Organisations',
    user: account,
    organisations,
    currentPage: 'organisations'
  });
};

module.exports = organisations;
