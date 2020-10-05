'use strict';
const { emailPolicy } = require('login.dfe.validation');
const Account = require('./../../infrastructure/account');
const logger = require('./../../infrastructure/logger');
const { updateIndex } = require('./../../infrastructure/search');
const { waitForIndexToUpdate } = require('./utils');
const config = require('./../../infrastructure/config');

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`);
  }
  return res.render('users/views/confirmResendInvitation', {
    backLink: true,
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    user: {
      name: `${req.session.user.firstName} ${req.session.user.lastName}`,
    },
    email: req.session.user.email,
    uid: req.params.uid,
    validationMessages: {},
  });
};

const validate = async (req) => {
  const model = {
    backLink: true,
    currentPage: 'users',
    email: req.body.email.trim() || '',
    user: {
      name: `${req.session.user.firstName} ${req.session.user.lastName}`,
    },
    uid: req.params.uid,
    noChangedEmail: false,
    validationMessages: {},
  };

  if (model.email === req.session.user.email) {
    model.noChangedEmail = true;
    return model;
  }

  if (!model.email) {
    model.validationMessages.email = 'Please enter an email address';
  } else if (!emailPolicy.doesEmailMeetPolicy(model.email)) {
    model.validationMessages.email = 'Please enter a valid email address';
  } else {
    const existingUser = await Account.getById(model.email, req.id);
    const existingInvitation = await Account.getInvitationByEmail(model.email);

    if (existingUser || existingInvitation) {
      model.validationMessages.email = `A DfE Sign-in user already exists with that email address`;
    }
  }
  return model;
};

const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('users/views/confirmResendInvitation', model);
  }

  req.session.user.email = model.email;

  if (model.noChangedEmail) {
    await Account.resendInvitation(req.params.uid.substr(4));
  } else {
    await Account.updateInvite(req.params.uid.substr(4), req.session.user.email);
    await updateIndex(req.params.uid, null, req.session.user.email, null, req.id);
    await waitForIndexToUpdate(req.params.uid, (updated) => updated.email === req.session.user.email);
  }

  logger.audit(
    {
      type: 'approver',
      subType: 'resent-invitation',
      userId: req.user.sub,
      userEmail: req.user.email,
      invitedUserEmail: req.session.user.email,
      invitedUser: req.session.user.uid,
      application: config.loggerSettings.applicationName,
      env: config.hostingEnvironment.env,
      message:  `${req.user.email} (id: ${req.user.sub}) resent invitation email to ${req.session.user.email} (id: ${req.session.user.uid})`,
    },
  );
  res.flash('info', `Invitation email sent to ${req.session.user.email}`);
  return res.redirect('services');
};

module.exports = {
  get,
  post,
};
