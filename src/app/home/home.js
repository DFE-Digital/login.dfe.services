'use strict';

const { getServicesForUser } = require('./../../infrastructure/services');
const Account = require('./../../infrastructure/account');
const { groupBy, keys } = require('lodash');

const home = async (req, res) => {
  const myServices = await getServicesForUser(req.user.sub);
  const account = Account.fromContext(req.user);

  await Promise.all(myServices.map(async service => Object.assign(service, { myApproversForService: await account.getUsersById(service.approvers) })));

  const myServicesByOrganisations = groupBy(myServices, s => s.organisation.id);
  const myOrganisations = keys(myServicesByOrganisations);
  res.render('home/views/home', {
    title: 'Access DfE services',
    myServicesByOrganisations,
    myOrganisations,
  });
};

module.exports = home;
