const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const logger = require("../../infrastructure/logger");
const config = require("../../infrastructure/config");
const { checkForActiveRequests } = require("./utils");
const { v4: uuid } = require("uuid");
const { createServiceRequest } = require("./utils");
const { NotificationClient } = require("login.dfe.jobs-client");
const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const {
  checkCacheForAllServices,
} = require("../../infrastructure/helpers/allServicesAppCache");

const renderConfirmNewUserPage = (req, res, model) => {
  return res.render("requestService/views/confirmServiceRequest", model);
};

const buildBackLink = (req, services) => {
  let backRedirect = `/request-service/${req.session.user.organisation}/users/${req.user.sub}/services/${services[0].id}`;
  return backRedirect;
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  if (
    !Array.isArray(req.session.user.services) ||
    req.session.user.services.length === 0
  ) {
    logger.warn(
      `GET ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
    return res.redirect("/my-services");
  }

  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );
  const services = req.session.user.services.map((service) => ({
    id: service.serviceId,
    name: "",
    roles: service.roles,
  }));

  const allServices = await checkCacheForAllServices(req.id);
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const serviceDetails = allServices.services.find(
      (x) => x.id === service.id,
    );
    const allRolesOfServiceUnsorted = await getServiceRolesRaw({
      serviceId: service.id,
    });
    const allRolesOfService = allRolesOfServiceUnsorted.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const rotails = allRolesOfService.filter((x) =>
      service.roles.find((y) => y.toLowerCase() === x.id.toLowerCase()),
    );
    service.name = serviceDetails.name;
    service.roles = rotails;
  }

  const model = {
    backLink: buildBackLink(req, services),
    currentPage: "services",
    csrfToken: req.csrfToken(),
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
      isInvite: req.session.user.isInvite ? req.session.user.isInvite : false,
      uid: req.session.user.uid ? req.session.user.uid : "",
    },
    title: "Review new service - DfE Sign-in",
    services,
    organisationDetails,
  };

  return renderConfirmNewUserPage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  if (
    !Array.isArray(req.session.user.services) ||
    req.session.user.services.length === 0
  ) {
    logger.warn(
      `POST ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
    return res.redirect("/my-services");
  }

  if (!req.userOrganisations) {
    logger.warn("No req.userOrganisations on post of confirmNewUser");
    return res.redirect("/my-services");
  }
  const allServices = await checkCacheForAllServices();
  const serviceDetails = allServices.services.find(
    (x) => x.id === req.session.user.services[0].serviceId,
  );

  const allRolesOfServiceUnsorted = await getServiceRolesRaw({
    serviceId: serviceDetails.id,
  });
  const allRolesOfService = allRolesOfServiceUnsorted.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const roles = allRolesOfService.filter((x) =>
    req.session.user.services[0].roles.find(
      (y) => y.toLowerCase() === x.id.toLowerCase(),
    ),
  );

  const rolesIds = roles.map((i) => i.id) || [];
  const roleNames = roles.map((i) => i.name);
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );
  const senderName = `${req.session.user.firstName} ${req.session.user.lastName}`;
  const senderEmail = req.session.user.email;

  const baseUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`;

  const serviceRequestId = uuid();

  const approveUrl = `${baseUrl}/request-service/${organisationDetails.organisation.id}/users/${
    req.session.user.uid
  }/services/${serviceDetails.id}/roles/${encodeURIComponent(
    JSON.stringify(rolesIds),
  )}/approve?reqId=${serviceRequestId}`;
  const rejectUrl = `${baseUrl}/request-service/${organisationDetails.organisation.id}/users/${
    req.session.user.uid
  }/services/${serviceDetails.id}/roles/${encodeURIComponent(
    JSON.stringify(rolesIds),
  )}/reject?reqId=${serviceRequestId}`;

  const helpUrl = `${config.hostingEnvironment.helpUrl}/requests/can-end-user-request-service`;
  //// think about this something else need to happen to check this isn't already requested?
  const organisationId = organisationDetails.organisation.id;
  const serviceId = serviceDetails.id;
  const userId = req.session.user.uid;
  let isRequests = await checkForActiveRequests(
    organisationDetails,
    req.params.sid,
    req.params.orgId,
    req.session.user.uid,
    req.id,
    "subService",
  );
  if (isRequests !== undefined) {
    const place = config.hostingEnvironment.helpUrl;
    if (!Array.isArray(isRequests)) {
      res.csrfToken = req.csrfToken();
      res.flash("title", `Important`);
      res.flash(
        "heading",
        `Sub-service already requested: ${serviceDetails.name}`,
      );
      res.flash(
        "message",
        `Your request has been sent to Approvers at ${organisationDetails.organisation.name} on ${new Date(
          isRequests,
        ).toLocaleDateString(
          "EN-GB",
        )}. <br> You must wait for an Approver to action this request before you can send the request again. Please contact your Approver for more information. <br> <a href='${place}/services/request-access'>Help with requesting a service</a> `,
      );
    } else {
      res.csrfToken = req.csrfToken();
      res.flash("title", `Important`);
      res.flash(
        "heading",
        `Your request cannot be completed as you have no approvers at this organisation`,
      );
      res.flash(
        "message",
        `Please <a href='${place}/contact-us'>Contact us</a> for help.`,
      );
    }
    return res.redirect("/my-services");
  }

  await createServiceRequest(
    serviceRequestId,
    userId,
    serviceId,
    rolesIds,
    organisationId,
    0,
    "service",
  );

  await notificationClient.sendServiceRequestToApprovers(
    senderName,
    senderEmail,
    organisationDetails.organisation.id,
    organisationDetails.organisation.name,
    serviceDetails.name,
    roleNames,
    rejectUrl,
    approveUrl,
    helpUrl,
  );

  logger.audit({
    type: "services",
    subType: "access-request",
    userId: req.session.user.uid,
    userEmail: senderEmail,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${senderEmail} (userId: ${req.session.user.uid}) requested service (serviceId: ${
      serviceDetails.id
    }) and roles (roleIds: ${JSON.stringify(rolesIds)}) for organisation (orgId: ${
      organisationDetails.organisation.id
    }) - requestId (reqId: ${serviceRequestId})`,
  });

  res.flash("title", `Success`);
  res.flash("heading", `Service requested: ${serviceDetails.name}`);
  res.flash(
    "message",
    `Your request has been sent to all approvers at <b>${organisationDetails.organisation.name}</b>. Requests should be approved or rejected within 5 days of being raised.`,
  );

  res.redirect(`/my-services`);
};

module.exports = {
  get,
  post,
};
