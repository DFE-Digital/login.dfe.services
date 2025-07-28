const {
  putUserInOrganisation,
  updateRequestById,
  getOrganisationById,
} = require("./../../infrastructure/organisations");
const logger = require("./../../infrastructure/logger");
const config = require("./../../infrastructure/config");
const { updateIndex } = require("./../../infrastructure/search");
const { searchUserByIdRaw } = require("login.dfe.api-client/users");
const { waitForIndexToUpdate } = require("../users/utils");
const { dateFormat } = require("../helpers/dateFormatterHelper");
const { getAndMapOrgRequest } = require("./utils");
const { NotificationClient } = require("login.dfe.jobs-client");

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const get = async (req, res) => {
  const request = await getAndMapOrgRequest(req);

  request.formattedCreatedDate = request.createdAt
    ? dateFormat(request.createdAt, "longDateFormat")
    : "";

  if (request.approverEmail) {
    res.flash("warn", `Request already actioned by ${request.approverEmail}`);
    return res.redirect(`/access-requests/requests`);
  }
  return res.render("accessRequests/views/reviewOrganisationRequest", {
    csrfToken: req.csrfToken(),
    title: "Review request - DfE Sign-in",
    backLink: `/access-requests/requests`,
    cancelLink: `/access-requests/requests`,
    request,
    selectedResponse: null,
    validationMessages: {},
    currentPage: "requests",
  });
};

const validate = async (req) => {
  const request = await getAndMapOrgRequest(req);
  const model = {
    title: "Review request - DfE Sign-in",
    backLink: `/access-requests/requests`,
    cancelLink: `/access-requests/requests`,
    request,
    selectedResponse: req.body.selectedResponse,
    validationMessages: {},
    currentPage: "requests",
  };
  if (model.selectedResponse === undefined || model.selectedResponse === null) {
    model.validationMessages.selectedResponse =
      "Approve or Reject must be selected";
  } else if (model.request.approverEmail) {
    model.validationMessages.selectedResponse = `Request already actioned by ${model.request.approverEmail}`;
  }
  return model;
};

const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render("accessRequests/views/reviewOrganisationRequest", model);
  }

  if (model.selectedResponse === "reject") {
    model.validationMessages = {};
    return res.redirect(`${model.request.id}/rejected`);
  }

  const actionedDate = Date.now();
  await putUserInOrganisation(
    model.request.user_id,
    model.request.org_id,
    0,
    null,
    req.id,
  );
  await updateRequestById(
    model.request.id,
    1,
    req.user.sub,
    null,
    actionedDate,
    req.id,
  );

  // patch search index with organisation added to user
  const getAllUserDetails = await searchUserByIdRaw({
    userId: model.request.user_id,
  });

  const organisation = await getOrganisationById(model.request.org_id, req.id);
  if (!getAllUserDetails) {
    logger.error(
      `Failed to find user ${model.request.user_id} when confirming change of organisations`,
      {
        correlationId: req.id,
      },
    );
  } else if (!organisation) {
    logger.error(
      `Failed to find organisation ${model.request.org_id} when confirming change of organisations`,
      {
        correlationId: req.id,
      },
    );
  } else {
    const currentOrganisationDetails = getAllUserDetails.organisations;
    const newOrgDetails = {
      id: organisation.id,
      name: organisation.name,
      urn: organisation.urn || undefined,
      uid: organisation.uid || undefined,
      establishmentNumber: organisation.establishmentNumber || undefined,
      laNumber: organisation.localAuthority
        ? organisation.localAuthority.code
        : undefined,
      categoryId: organisation.category.id,
      statusId: organisation.status.id,
      roleId: 0,
    };
    currentOrganisationDetails.push(newOrgDetails);
    await updateIndex(
      model.request.user_id,
      currentOrganisationDetails,
      null,
      req.id,
    );
    await waitForIndexToUpdate(
      model.request.user_id,
      (updated) =>
        updated.organisations.length === currentOrganisationDetails.length,
    );
  }

  //send approved email
  await notificationClient.sendAccessRequest(
    model.request.usersEmail,
    model.request.usersName,
    organisation.name,
    true,
    null,
  );

  //audit organisation approved
  logger.audit({
    type: "approver",
    subType: "approved-org",
    userId: req.user.sub,
    meta: {
      editedFields: [
        {
          name: "new_organisation",
          oldValue: undefined,
          newValue: model.request.org_id,
        },
      ],
      editedUser: model.request.user_id,
    },
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) approved organisation request for ${model.request.org_id})`,
  });

  res.flash("title", `Success`);
  res.flash("heading", `Request approved: Organisation access`);
  res.flash(
    "message",
    `${model.request.usersName} has been added to your organisation.`,
  );

  return res.redirect(`/access-requests/requests`);
};

module.exports = {
  get,
  post,
};
