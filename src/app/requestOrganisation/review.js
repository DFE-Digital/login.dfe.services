const config = require("./../../infrastructure/config");
const logger = require("./../../infrastructure/logger");

const {
  getOrganisationById,
  getPendingRequestsAssociatedWithUser,
} = require("./../../infrastructure/organisations");

const {
  createUserOrganisationRequestRaw,
} = require("login.dfe.api-client/users");

const {
  getOrganisationApprovers,
  getRequestsForOrganisationRaw,
} = require("login.dfe.api-client/organisations");

const { NotificationClient } = require("login.dfe.jobs-client");

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});
const get = async (req, res) => {
  const organisationId = req.session.organisationId;
  if (!organisationId) {
    return res.redirect("search");
  }
  const organisation = await getOrganisationById(organisationId, req.id);
  return res.render("requestOrganisation/views/review", {
    csrfToken: req.csrfToken(),
    title: "Confirm Request - DfE Sign-in",
    organisation,
    reason: "",
    currentPage: "organisations",
    validationMessages: {},
    backLink: "/request-organisation/search",
  });
};

const validate = async (req) => {
  const organisation = await getOrganisationById(
    req.session.organisationId,
    req.id,
  );
  const requestLimit = config.organisationRequests
    ? config.organisationRequests.requestLimit
    : 10;
  const model = {
    title: "Confirm Request - DfE Sign-in",
    organisation,
    reason: req.body.reason,
    currentPage: "organisations",
    validationMessages: {},
    backLink: "/request-organisation/search",
  };
  if (model.reason.trim().length === 0) {
    model.validationMessages.reason = "Enter a reason for request";
  } else if (model.reason.length > 200) {
    model.validationMessages.reason =
      "Reason cannot be longer than 200 characters";
  }

  if (
    (
      await getRequestsForOrganisationRaw({
        organisationId: req.session.organisationId,
      })
    ).length > requestLimit
  ) {
    model.validationMessages.limitOrg =
      "Organisation has reached the limit for requests";
  }
  if (
    (await getPendingRequestsAssociatedWithUser(req.user.sub)).length >
    requestLimit
  ) {
    model.validationMessages.limitUser =
      "You have reached your limit for requests";
  }
  if (model.validationMessages.limitOrg || model.validationMessages.limitUser) {
    model.validationMessages.limit =
      "A current request needs to be actioned before new requests can be made";
  }
  return model;
};

const post = async (req, res) => {
  if (!req.session.organisationId) {
    return res.redirect("search");
  }
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render("requestOrganisation/views/review", model);
  }

  const requestId = await createUserOrganisationRequestRaw({
    userId: req.user.sub,
    organisationId: req.body.organisationId,
    reason: req.body.reason,
  });

  await notificationClient.sendUserOrganisationRequest(requestId);
  req.session.organisationId = undefined;

  logger.audit({
    type: "organisation",
    subType: "access-request",
    userId: req.user.sub,
    userEmail: req.user.email,
    organisationid: req.body.organisationId,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) requested organisation (id: ${req.body.organisationId})`,
  });
  if (
    (
      await getOrganisationApprovers({
        organisationId: req.body.organisationId,
      })
    ).length > 0
  ) {
    res.flash("title", `Success`);
    res.flash(
      "heading",
      `Your request has been sent to approvers at ${req.body.organisationName}`,
    );
    res.flash(
      "message",
      `You should receive a response within the next 5 working days.`,
    );
  } else {
    res.flash("title", `Success`);
    res.flash(
      "heading",
      `Your request has been sent to the DfE Sign-in Helpdesk.`,
    );
    res.flash(
      "message",
      `There are no approvers at ${req.body.organisationName} so your request has been forwarded to the DfE Sign-in Helpdesk.`,
    );
  }
  return res.sessionRedirect("/organisations");
};

module.exports = {
  get,
  post,
};
