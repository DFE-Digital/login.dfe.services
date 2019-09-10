const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');

const { getOrganisationById, createUserOrganisationRequest } = require('./../../infrastructure/organisations');

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

const post = async (req, res) => {
  if (req.body.reason.length > 1000) {
    const organisation = await getOrganisationById(req.session.organisationId, req.id);
    return res.render('requestOrganisation/views/review', {
      csrfToken: req.csrfToken(),
      title: 'Confirm Request - DfE Sign-in',
      organisation,
      reason: req.body.reason,
      currentPage: 'organisations',
      validationMessages: {reason: 'Reason cannot be longer than 1000 characters'},
    })
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
