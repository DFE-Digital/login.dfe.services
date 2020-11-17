'use strict';
const Account = require('./../../infrastructure/account');
const {
  getOrganisationAndServiceForUser,
  getOrganisationAndServiceForInvitation,
} = require('./../../infrastructure/organisations');
const { emailPolicy } = require('login.dfe.validation');

const get = (req, res) => {
  const model = {
    csrfToken: req.csrfToken(),
    firstName: '',
    lastName: '',
    email: '',
    validationMessages: {},
    backLink: './',
    currentPage: 'users',
    organisationId: req.params.orgId,
  };

  if (req.session.user) {
    model.firstName = req.session.user.firstName;
    model.lastName = req.session.user.lastName;
    model.email = req.session.user.email;
  }

  res.render('users/views/newUserDetails', model);
};

const validate = async (req) => {
  const model = {
    firstName: req.body.firstName || '',
    lastName: req.body.lastName || '',
    email: req.body.email || '',
    uid: '',
    validationMessages: {},
    backLink: './',
    currentPage: 'users',
    organisationId: req.params.orgId,
    isDSIUser: false,
  };

  if (!model.firstName) {
    model.validationMessages.firstName = 'Please enter a first name';
  }

  if (!model.lastName) {
    model.validationMessages.lastName = 'Please enter a last name';
  }

  if (!model.email) {
    model.validationMessages.email = 'Please enter an email address';
  } else if (!emailPolicy.doesEmailMeetPolicy(model.email)) {
    model.validationMessages.email = 'Please enter a valid email address';
  } else {
    const existingUser = await Account.getById(model.email, req.id);
    const existingInvitation = await Account.getInvitationByEmail(model.email);

    if (existingUser) {
      const userOrganisations = await getOrganisationAndServiceForUser(existingUser.claims.sub, req.id);
      const isUserInOrg = userOrganisations.find((x) => x.organisation.id === req.params.orgId);
      if (isUserInOrg) {
        model.validationMessages.email = `A DfE Sign-in user already exists with that email address for ${isUserInOrg.organisation.name}`;
      } else {
        model.isDSIUser = true;
        model.firstName = existingUser.claims.given_name;
        model.lastName = existingUser.claims.family_name;
        model.email = existingUser.claims.email;
        model.uid = existingUser.claims.sub;
      }
    } else if (existingInvitation) {
      const invitationOrganisations = await getOrganisationAndServiceForInvitation(existingInvitation.id);
      const isInvitationInOrg = invitationOrganisations.find((x) => x.organisation.id === req.params.orgId);
      if (isInvitationInOrg) {
        model.validationMessages.email = `A DfE Sign-in user already exists with that email address for ${isInvitationInOrg.organisation.name}`;
      } else {
        model.isDSIUser = true;
        model.firstName = existingInvitation.firstName;
        model.lastName = existingInvitation.lastName;
        model.email = existingInvitation.email;
        model.uid = `inv-${existingInvitation.id}`;
      }
    }
  }
  return model;
};

const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('users/views/newUserDetails', model);
  }

  if (!req.session.user) {
    req.session.user = {};
  }
  req.session.user.firstName = model.firstName;
  req.session.user.lastName = model.lastName;
  req.session.user.email = model.email;
  req.session.user.isInvite = true;

  if (model.isDSIUser) {
    req.session.user.uid = model.uid;
    return req.query.review
      ? res.redirect(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user?review=true`)
      : res.redirect(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user`);
  } else {
    return req.query.review ? res.redirect('confirm-new-user') : res.redirect('associate-services');
  }
};

module.exports = {
  get,
  post,
};
