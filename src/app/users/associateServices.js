'use strict';
const { getAllServices } = require('./../../infrastructure/applications');

const get = async (req, res) => {
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  const allServices = await getAllServices(req.id);
  const externalServices = allServices.services.filter(x => x.isExternalService === true);
  const model = {
    csrfToken: req.csrfToken(),
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    validationMessages: {},
    backLink: 'new-user-details',
    currentPage: 'users',
    organisationDetails,
    services: externalServices,
    selectedServices: req.session.user.services ? req.session.user.services : [],
  };

  res.render('users/views/associateServices', model);
};

const validate = async(req) => {
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  const allServices = await getAllServices(req.id);
  const externalServices = allServices.services.filter(x => x.isExternalService === true);
  const model = {
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    backLink: 'new-user-details',
    currentPage: 'users',
    organisationDetails,
    services: externalServices,
    selectedServices: req.body.service,
    validationMessages: {},
  };
  if (!model.selectedServices) {
    model.validationMessages.services = 'At least one service must be selected';
  }
  return model;
};

const post = async (req, res) => {
  const model = await validate(req);
  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('users/views/associateServices', model);
  }

  let selectedServices = req.body.service;
  if(!(selectedServices instanceof Array)){
    selectedServices = [req.body.service];
  }
  req.session.user.services = selectedServices.map(serviceId=>({serviceId, roles:[]}));

  const service = req.session.user.services[0].serviceId;
  return res.redirect(`associate-services/${service}`)
};

module.exports = {
  get,
  post
};
