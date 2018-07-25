'use strict';

const Account = require('./../../infrastructure/account');
const getAndMapOrganisationsAndServices = require('./../home/home');

const organisations = async (req, res) => {
  const account = Account.fromContext(req.user);
  const organisations = await getAndMapOrganisationsAndServices(account, req.id);

  return res.render('organisations/views/organisations',{
    title: 'Organisations',
    user: account,
    organisations,
    currentPage: 'organisations'
  });
};

module.exports = organisations;
