'use strict';

const { getOrganisationAndServiceForUser } = require('./../../infrastructure/organisations');
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');

const getApproversDetails = async (organisations) => {
  const allApproverIds = flatten(organisations.map((org) => org.approvers));
  const distinctApproverIds = uniq(allApproverIds);
  return Account.getUsersById(distinctApproverIds);
};
const getAndMapOrganisationsAndServices = async (account) => {
  const organisations = await getOrganisationAndServiceForUser(account.id);
  const allApprovers = await getApproversDetails(organisations);

  return organisations.map((organisation) => {
    const approvers = organisation.approvers.map((approverId) => {
      return allApprovers.find(x => x.id.toLowerCase() === approverId.toLowerCase());
    }).filter(x => x);
    return {
      id: organisation.organisation.id,
      name: organisation.organisation.name,
      urn: organisation.organisation.urn,
      uid: organisation.organisation.uid,
      role: organisation.role,
      approvers,
      services: organisation.services,
    };
  })
};

const home = async (req, res) => {
  const account = Account.fromContext(req.user);
  const organisations = await getAndMapOrganisationsAndServices(account);

  return res.render('home/views/home', {
    title: 'Access DfE services',
    user: account,
    organisations,
  });
};

module.exports = home;
