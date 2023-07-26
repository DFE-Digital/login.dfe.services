const _ = require('lodash');
const config = require('./../../infrastructure/config');
const { getSingleServiceForUser, isMultipleRolesAllowed } = require('../users/utils');
const { getApplication } = require('./../../infrastructure/applications');
const { actions } = require('../constans/actions');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);
const { checkForActiveRequests } = require('./utils');
const renderRequestEditRoles = (res, model) => {
  res.render('requestService/views/requestEditRoles', { ...model });
};

const getViewModel = async (req) => {
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const policyResult = await policyEngine.getPolicyApplicationResultsForUser(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    req.id,
  );
  const serviceRoles = policyResult.rolesAvailableToUser;
  const numberOfRolesAvailable = serviceRoles.length;
  const application = await getApplication(req.params.sid, req.id);

  const maximumRolesAllowed = application?.relyingParty?.params?.maximumRolesAllowed;
  const minimumRolesRequired = application?.relyingParty?.params?.minimumRolesRequired;

  const allowedToSelectMoreThanOneRole = isMultipleRolesAllowed(
    maximumRolesAllowed,
    minimumRolesRequired,
    numberOfRolesAvailable,
  );

  const backLink = `/approvals/select-organisation-service?action=${actions.EDIT_SERVICE}`;

  return {
    backLink,
    cancelLink: '/my-services',
    currentPage: 'services',
    csrfToken: req.csrfToken(),
    organisationDetails,
    service: {
      name: userService.name,
      id: userService.id,
    },
    validationMessages: {},
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    serviceRoles,
    serviceDetails: application,
    userService,
    maxAllowedMessage:
      application.relyingParty && application.relyingParty.params && application.relyingParty.params.maximumRolesAllowed
        ? application.relyingParty.params.maximumRolesAllowed
        : undefined,
    roleMessage:
      application.relyingParty && application.relyingParty.params && application.relyingParty.params.serviceRoleMessage
        ? application.relyingParty.params.serviceRoleMessage
        : undefined,
    allowedToSelectMoreThanOneRole,
  };
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const model = await getViewModel(req);
  if (req.session?.service?.roles) {
    const sessionRoles = req.session.service.roles;
    model.service.roles = sessionRoles.map((x) => ({ id: x }));
  } else {
    model.service.roles = model.userService.roles;
  }

  saveRoleInSession(req, model.service.roles);
  renderRequestEditRoles(res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  let selectedRoles = req.body.role ? req.body.role : [];
  if (!(selectedRoles instanceof Array)) {
    selectedRoles = [req.body.role];
  }
  const policyValidationResult = await policyEngine.validate(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    selectedRoles,
    req.id,
  );
  const model = await getViewModel(req);
  if (policyValidationResult.length > 0) {
    let roles = {};
    model.service.roles = selectedRoles.map((x) => (roles[x] = { id: x }));
    model.validationMessages.roles = policyValidationResult.map((x) => x.message);
    return renderRequestEditRoles(res, model);
  } else {
    let selectServiceID = req.params.sid;
    let orgdetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
    let isRequests = await checkForActiveRequests(
      orgdetails,
      selectServiceID,
      req.params.orgId,
      req.session.user.uid,
      req.id,
      'subservice',
      selectedRoles,
      model.serviceRoles.length,
    );
    //need to check what services they currently
    ///have and make sure they aren't re-requesting them
    if (isRequests !== undefined) {
      let displayroles = [];
      if (Array.isArray(isRequests)) {
        if (isRequests.length > 0) {
          let roles = {};
          model.service.roles = selectedRoles.map((x) => (roles[x] = { id: x }));
          if (model.serviceRoles.length !== isRequests.length) {
            isRequests.forEach((item) => {
              let name = model.serviceRoles.filter((x) => x.id === item);
              displayroles.push(name[0].name);
            });
            if (displayroles.length > 1) {
              model.validationMessages.roles = `You have selected sub-services which are currently awaiting approval.</br> Deselect the following sub-services which have already been requested: <ul class="govuk-list--bullet">${displayroles
                .map((x) => {
                  return '<li>' + x + '</li>';
                })
                .join('')}</ul>`;
            } else {
              model.validationMessages.roles = `You have selected a sub-service that is currently awaiting approval.</br>Deselect ${displayroles.map(
                (x) => x,
              )} which has already been requested.`;
            }
            return renderRequestEditRoles(res, model);
          } else {
            res.csrfToken = req.csrfToken();
            isRequests.forEach((item) => {
              let name = model.serviceRoles.filter((x) => x.id === item);
              displayroles.push(name[0].name);
            });
            const place = config.hostingEnvironment.helpUrl;
            res.flash('title', `Important`);
            res.flash('heading', `Sub-service already requested`);
            if (displayroles.length > 0 && displayroles.length === 1) {
              res.flash(
                'message',
                `You have already requested access to  ${displayroles.map((x) => {
                  return x.toString();
                })}.<br>You must wait for an approver at ${
                  model.organisationDetails.organisation.name
                } to respond to this request before you can send another request. <br><br> <a href='${place}/services/request-access'>Help with requesting a service</a> `,
              );
            } else {
              res.flash(
                'message',
                `You have already requested access to all sub-services you've selected for ${model.service.name}.<br>
                 You must wait for an approver at ${model.organisationDetails.organisation.name} to respond to these requests before you can send another. <br><br> <a href='${place}/services/request-access'>Help with requesting a service</a> `,
              );
            }
            return res.redirect('/my-services');
          }
        } else {
          saveRoleInSession(req, selectedRoles);
          return res.redirect(`${req.params.sid}/confirm-edit-roles-request`);
        }
      }
    } else {
      saveRoleInSession(req, selectedRoles);

      return res.redirect(`${req.params.sid}/confirm-edit-roles-request`);
    }
  }
};

const saveRoleInSession = (req, selectedRoles) => {
  req.session.service = {
    roles: selectedRoles,
  };
};

module.exports = {
  get,
  post,
};
