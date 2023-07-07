const _ = require('lodash');
const config = require('./../../infrastructure/config');
const { getSingleServiceForUser } = require('../../../src/app/users/utils');
const { getApplication } = require('./../../infrastructure/applications');
const { actions } = require('../constans/actions');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);
const { checkForActiveRequests, getLastRequestDate } = require('./utils');
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
  const application = await getApplication(req.params.sid, req.id);
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
    roleMessage:
      application.relyingParty && application.relyingParty.params && application.relyingParty.params.serviceRoleMessage
        ? application.relyingParty.params.serviceRoleMessage
        : undefined,
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
  ///add the test method here
  const model = await getViewModel(req);
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
  if (isRequests !== undefined) {
    if (Array.isArray(isRequests)) {
      if (isRequests.length > 0) {
        let roles = {};
        model.service.roles = selectedRoles.map((x) => (roles[x] = { id: x }));
        let displayroles = [];
        if (model.serviceRoles.length !== isRequests.length) {
          isRequests.forEach((item) => {
            let name = model.serviceRoles.filter((x) => x.id === item);
            displayroles.push(name[0].name);
          });
          model.validationMessages.roles = `You have selected [${displayroles.map(
            (x) => x,
          )}] which are currently awaiting approval. Deselect [${displayroles.map(
            (x) => x,
          )}] which have already been requested to continue with your request`;
          return renderRequestEditRoles(res, model);
        } else {
          res.csrfToken = req.csrfToken();
          //get date for the last request here
          let lastRequestDate = await getLastRequestDate(
            orgdetails,
            selectServiceID,
            req.params.orgId,
            req.session.user.uid,
            req.id,
            'subservice',
            selectedRoles,
          );
          const place = config.hostingEnvironment.helpUrl;
          res.flash('title', `Important`);
          res.flash('heading', `Sub-service already requested: ${model.service.name}`);
          res.flash(
            'message',
            `Your request has been sent to Approvers at ${model.organisationDetails.organisation.name} on ${new Date(
              lastRequestDate,
            ).toLocaleDateString(
              'EN-GB',
            )}. <br> You must wait for an Approver to action this request before you can send the request again. Please contact your Approver for more information. <br> <a href='${place}/services/request-access'>Help with requesting a service</a> `,
          );
          return res.redirect('/my-services');
        }
      }
    }
  }
  const policyValidationResult = await policyEngine.validate(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    selectedRoles,
    req.id,
  );

  if (policyValidationResult.length > 0) {
    const model = await getViewModel(req);
    let roles = {};
    model.service.roles = selectedRoles.map((x) => (roles[x] = { id: x }));
    model.validationMessages.roles = policyValidationResult.map((x) => x.message);
    return renderRequestEditRoles(res, model);
  } else {
    saveRoleInSession(req, selectedRoles);

    return res.redirect(`${req.params.sid}/confirm-edit-roles-request`);
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
