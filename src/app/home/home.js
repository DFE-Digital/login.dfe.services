'use strict';

const { getOrganisationAndServiceForUser } = require('./../../infrastructure/organisations');
const { getOidcClients } = require('./../../infrastructure/hotConfig');
const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');

const getApproversDetails = async (organisations) => {
  const allApproverIds = flatten(organisations.map((org) => org.approvers));
  const distinctApproverIds = uniq(allApproverIds);
  if (distinctApproverIds.length === 0) {
    return [];
  }
  return Account.getUsersById(distinctApproverIds);
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
  const oidcClients = await getOidcClients(correlationId);

  return organisations.map((organisation) => {
    const approvers = organisation.approvers.map((approverId) => {
      return allApprovers.find(x => x.id.toLowerCase() === approverId.toLowerCase());
    }).filter(x => x);
    const services = organisation.services ? organisation.services.map((service) => {
      const oidcClient = oidcClients.find(c => c.params && c.params.serviceId && c.params.serviceId.toLowerCase() === service.id.toLowerCase());
      const serviceUrl = oidcClient ? oidcClient.redirect_uris[0] : '#';
      return Object.assign({ serviceUrl }, service);
    }) : [];
    return {
      id: organisation.organisation.id,
      name: organisation.organisation.name,
      urn: organisation.organisation.urn,
      uid: organisation.organisation.uid,
      role: mapRole(organisation.role),
      approvers,
      services,
    };
  })
};

const home = async (req, res) => {
  const account = Account.fromContext(req.user);
  const organisations = await getAndMapOrganisationsAndServices(account, req.id);

  return res.render('home/views/home', {
    title: 'Access DfE services',
    user: account,
    organisations,
  });
};

module.exports = home;
