const Account = require("./../../infrastructure/account");
const { updateUserServiceRoles } = require("login.dfe.api-client/users");
const { updateServiceRequest } = require("../requestService/utils");
const {
  getSubServiceRequestVieModel,
  getAndMapServiceRequest,
  generateFlashMessages,
  getRoleAndServiceNames,
  getOrganisationPermissionLevel,
} = require("./utils");
const { dateFormat } = require("../helpers/dateFormatterHelper");
const { createSubServiceAddedBanners } = require("../home/userBannersHandlers");
const {
  isServiceEmailNotificationAllowed,
} = require("../../../src/infrastructure/applications");
const { actions } = require("../constants/actions");
const logger = require("./../../infrastructure/logger");
const config = require("./../../infrastructure/config");
const { NotificationClient } = require("login.dfe.jobs-client");

const validate = async (req) => {
  const buildmodel = await getAndMapServiceRequest(req.params.rid);
  const viewModel = await getSubServiceRequestVieModel(buildmodel, req);
  viewModel.selectedResponse = req.body.selectedResponse;

  if (req.session.roleIds !== undefined) {
    if (req.session.roleIds !== viewModel.role_ids) {
      viewModel.role_ids = req.session.roleIds;
      let submodel = await getRoleAndServiceNames(
        viewModel,
        req.params.rid,
        req,
      );
      viewModel.roles = submodel.roles
        .filter((x) => x !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name));
      req.session.roles = viewModel.roles;
    } else {
      req.session.roles = viewModel.roles;
    }
  }
  const model = {
    title: "Review request",
    backLink: "/access-requests/requests",
    cancelLink: "/access-requests/requests",
    viewModel,
    selectedResponse: req.body.selectedResponse,
    validationMessages: {},
    currentPage: "requests",
  };
  if (model.selectedResponse === undefined || model.selectedResponse === null) {
    model.validationMessages.selectedResponse =
      "Approve or Reject must be selected";
    model.viewModel.validationMessages.selectedResponse =
      "Approve or Reject must be selected";
  } else if (model.viewModel.approverEmail) {
    model.validationMessages.selectedResponse = `Request already actioned by ${model.viewModel.approverEmail}`;
    model.viewModel.validationMessages.selectedResponse = `Request already actioned by ${model.viewModel.approverEmail}`;
  }
  return model;
};

const get = async (req, res) => {
  const model = await getAndMapServiceRequest(req.params.rid);
  const viewModel = await getSubServiceRequestVieModel(model, req.id, req);
  ((viewModel.title = "Review sub-service request"),
    (req.session.rid = req.params.rid));
  if (req.session.roleIds !== undefined) {
    if (req.session.roleIds !== viewModel.role_ids) {
      viewModel.role_ids = req.session.roleIds;
      let submodel = await getRoleAndServiceNames(
        viewModel,
        req.params.rid,
        req,
      );
      viewModel.roles = submodel.roles.filter((x) => x !== undefined);
      req.session.roles = viewModel.roles;
    } else {
      req.session.roles = viewModel.roles;
    }
  }

  viewModel.csrfToken = req.csrfToken();
  viewModel.formattedCreatedDate = viewModel.created_date
    ? dateFormat(viewModel.created_date, "longDateFormat")
    : "";
  viewModel.subServiceAmendUrl = `/approvals/${viewModel.org_id}/users/${viewModel.user_id}/services/${viewModel.service_id}?actions=${actions.REVIEW_SUBSERVICE_REQUEST}`;
  if (viewModel.actioned_by && (viewModel.status === -1 || 1)) {
    const user = await Account.getById(viewModel.actioned_by);
    const { title, heading, message } = generateFlashMessages(
      "service",
      viewModel.status,
      user.claims.email,
      viewModel.endUsersGivenName,
      viewModel.endUsersFamilyName,
      viewModel.roles.map((i) => i?.name),
      res,
    );
    res.flash("title", `${title}`);
    res.flash("heading", `${heading}`);
    res.flash("message", `${message}`);
    return res.redirect(`/access-requests/requests`);
  }
  return res.render("accessRequests/views/reviewSubServiceRequest", viewModel);
};

const post = async (req, res) => {
  const correlationId = req.id;
  const model = await validate(req);
  const request = await getAndMapServiceRequest(req.params.rid);
  if (request.dataValues.status === -1 || request.dataValues.status === 1) {
    const alreadyActioned = await getSubServiceRequestVieModel(
      request,
      correlationId,
      req,
    );
    if (alreadyActioned.actioned_by) {
      model.viewModel.validationMessages.alreadyActioned = `Request already actioned by ${alreadyActioned.actioned_by}`;
      const user = await Account.getById(alreadyActioned.actioned_by);
      const { title, heading, message } = generateFlashMessages(
        "service",
        request.dataValues.status,
        alreadyActioned.endUsersGivenName,
        user.claims.email,
        alreadyActioned.endUsersFamilyName,
        alreadyActioned.roles.map((i) => i.name),
        res,
      );
      res.flash("title", `${title}`);
      res.flash("heading", `${heading}`);
      res.flash("message", `${message}`);
      return res.redirect(`/access-requests/requests`);
    }
  }

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    model.viewModel.csrfToken = req.csrfToken();
    return res.render(
      "accessRequests/views/reviewSubServiceRequest",
      model.viewModel,
    );
  }

  if (model.selectedResponse === "reject") {
    model.csrfToken = req.csrfToken();
    model.viewModel.csrfToken = req.csrfToken();
    model.validationMessages = {};
    model.viewModel.validationMessages = {};

    return res.redirect(
      `/access-requests/subService-requests/${req.params.rid}/rejected`,
    );
  } else if (model.selectedResponse === "approve") {
    const request = await updateServiceRequest(
      req.params.rid,
      1,
      req.user.sub,
      model.reason,
    );
    let requestedIds = [];
    model.viewModel.role_ids.forEach((element) => {
      requestedIds.push(element.id);
    });
    await updateUserServiceRoles({
      userId: model.viewModel.user_id,
      serviceId: model.viewModel.service_id,
      organisationId: model.viewModel.org_id,
      serviceRoleIds: requestedIds,
    });
    if (request.success) {
      const rolesName = model.viewModel.roles.map((i) => i?.name);
      const serviceName = model.viewModel.Service_name;
      const endUserId = model.viewModel.user_id;

      await createSubServiceAddedBanners(endUserId, serviceName, rolesName);

      const isEmailAllowed = await isServiceEmailNotificationAllowed();
      if (isEmailAllowed) {
        const notificationClient = new NotificationClient({
          connectionString: config.notifications.connectionString,
        });

        const permissionLevel = await getOrganisationPermissionLevel(
          model.viewModel.user_id,
          model.viewModel.org_id,
          req.params.rid,
        );

        await notificationClient.sendSubServiceRequestApproved(
          model.viewModel.endUsersEmail,
          model.viewModel.endUsersGivenName,
          model.viewModel.endUsersFamilyName,
          model.viewModel.org_name,
          serviceName,
          rolesName,
          permissionLevel,
        );

        const account = Account.fromContext(req.user);
        const endUsersName =
          model.viewModel.endUsersGivenName +
          " " +
          model.viewModel.endUsersFamilyName;
        await notificationClient.sendSubServiceRequestOutcomeToApprovers(
          account.id,
          model.viewModel.endUsersEmail,
          endUsersName,
          model.viewModel.org_id,
          model.viewModel.org_name,
          model.viewModel.Service_name,
          model.viewModel.roles.map((i) => i.name),
          true,
          null,
        );
      }

      logger.audit({
        type: "sub-service",
        subType: "sub-service request Approved",
        userId: req.user.sub,
        userEmail: req.user.email,
        meta: {
          editedFields: [
            {
              name: "Approved_Subservice",
              newValue: model.viewModel.role_ids,
            },
          ],
          editedUser: req.user.sub,
        },
        application: config.loggerSettings.applicationName,
        env: config.hostingEnvironment.env,
        message: `${req.user.email} (approverId: ${req.user.sub}) approved sub-service request for (serviceId: ${
          model.viewModel.service_id
        }) and sub-services (roleIds: ${JSON.stringify(model.viewModel.role_ids)}) and organisation (orgId: ${
          model.viewModel.org_id
        }) for end user (endUserId: ${model.viewModel.user_id}) - requestId (reqId: ${req.params.rid})`,
      });
      res.flash("title", `Success`);
      res.flash("heading", "Sub-service changes approved");
      res.flash(
        "message",
        `${model.viewModel.endUsersGivenName} ${model.viewModel.endUsersFamilyName} will receive an email to tell them their sub-service access has changed.`,
      );
      return res.redirect(`/access-requests/requests`);
    }
  }
};

module.exports = {
  get,
  post,
};
