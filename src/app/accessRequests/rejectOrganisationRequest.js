const { getAndMapOrgRequest } = require("./utils");
const { updateRequestById } = require("./../../infrastructure/organisations");
const Account = require("./../../infrastructure/account");
const logger = require("./../../infrastructure/logger");
const config = require("./../../infrastructure/config");
const { NotificationClient } = require("login.dfe.jobs-client");

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const get = async (req, res) => {
  return res.render("accessRequests/views/rejectOrganisationRequest", {
    csrfToken: req.csrfToken(),
    title: "Reason for rejection",
    backLink: `/access-requests/organisation-requests/${req.params.rid}`,
    cancelLink: `/access-requests/requests`,
    reason: "",
    validationMessages: {},
    currentPage: "requests",
  });
};

const validate = async (req) => {
  const request = await getAndMapOrgRequest(req);
  const model = {
    title: "Reason for rejection",
    backLink: `/access-requests/organisation-requests/${req.params.rid}`,
    cancelLink: `/access-requests/requests`,
    reason: req.body.reason,
    request,
    validationMessages: {},
  };
  if (model.reason.length > 1000) {
    model.validationMessages.reason =
      "Reason cannot be longer than 1000 characters";
  } else if (model.request.approverEmail) {
    model.validationMessages.reason = `Request already actioned by ${model.request.approverEmail}`;
  }
  return model;
};

const post = async (req, res) => {
  const correlationId = req.id;
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render("accessRequests/views/rejectOrganisationRequest", model);
  }

  // patch request with rejection
  const actionedDate = Date.now();
  await updateRequestById(
    model.request.id,
    -1,
    req.user.sub,
    model.reason,
    actionedDate,
    correlationId,
  );

  //send rejected email
  await notificationClient.sendAccessRequest(
    model.request.usersEmail,
    model.request.usersName,
    model.request.org_name,
    false,
    model.reason,
  );

  const account = Account.fromContext(req.user);
  await notificationClient.sendOrganisationRequestOutcomeToApprovers(
    account.id,
    model.request.usersEmail,
    model.request.usersName,
    model.request.organisation_id,
    model.request.org_name,
    false,
    model.reason,
  );

  //audit organisation rejected
  logger.audit({
    type: "approver",
    subType: "rejected-org",
    userId: req.user.sub,
    editedUser: model.request.user_id,
    reason: model.reason,
    currentPage: "requests",
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) rejected organisation request for ${model.request.org_id})`,
  });

  res.flash("title", `Success`);
  res.flash("heading", `Request rejected: Organisation access`);
  res.flash(
    "message",
    `${model.request.usersName} cannot access your organisation.`,
  );

  return res.redirect(`/access-requests/requests`);
};

module.exports = {
  get,
  post,
};
