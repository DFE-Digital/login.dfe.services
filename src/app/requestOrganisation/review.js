const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');

const { getOrganisationById, createUserOrganisationRequest, getRequestsForOrganisation, getPendingRequestsAssociatedWithUser } = require('./../../infrastructure/organisations');

const NotificationClient = require('login.dfe.notifications.client');

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});
const get = async (req, res) => {
  const organisationId = req.session.organisationId;
  if (!organisationId) {
    return res.redirect('search');
  }
  const organisation = await getOrganisationById(organisationId, req.id);
  return res.render('requestOrganisation/views/review', {
    csrfToken: req.csrfToken(),
    title: 'Confirm Request - DfE Sign-in',
    organisation,
    reason: '',
    currentPage: 'organisations',
    validationMessages: {},
  });
};

const validate = async (req) => {
  const organisation = await getOrganisationById(req.session.organisationId, req.id);
  const requestLimit = config.organisationRequests.requestLimit || 10;
  const model = {
    title: 'Confirm Request - DfE Sign-in',
    organisation,
    reason: req.body.reason,
    currentPage: 'organisations',
    validationMessages: {},
  };
  if (model.reason.length > 1000) {
    model.validationMessages.reason = 'Reason cannot be longer than 1000 characters';
  }
  if ((await getRequestsForOrganisation(req.session.organisationId, req.id)).length > requestLimit) {
    model.validationMessages.limitOrg = 'Organisation has reached the limit for requests'
  }
  if ((await getPendingRequestsAssociatedWithUser(req.user.sub, req.id)).length > requestLimit) {
    model.validationMessages.limitUser = 'You have reached your limit for requests'
  }
  if (model.validationMessages.limitOrg || model.validationMessages.limitUser) {
    model.validationMessages.limit = 'A current request needs to be actioned before new requests can be made'
  }
  return model;
};

const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('requestOrganisation/views/review', model);
  }

  const request = await createUserOrganisationRequest(req.user.sub, req.body.organisationId, req.body.reason, req.id);

  await notificationClient.sendUserOrganisationRequest(request);
  req.session.organisationId = undefined;

  logger.audit(`${req.user.email} (id: ${req.user.sub}) requested organisation (id: ${req.body.organisationId})`, {
    type: 'organisation',
    subType: 'access-request',
    userId: req.user.sub,
    userEmail: req.user.email,
    organisationId: req.body.organisationId,
  });

  res.flash('info', `Your request has been sent to approvers at ${req.body.organisationName}`);
  return res.redirect('/organisations')
};

module.exports = {
  get,
  post,
};
