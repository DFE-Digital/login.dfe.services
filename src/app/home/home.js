const uniqBy = require("lodash/uniqBy");
const sortBy = require("lodash/sortBy");
const config = require("../../infrastructure/config");
const {
  checkCacheForAllServices,
} = require("../../infrastructure/helpers/allServicesAppCache");

const isTruthy = (v) => v === true || v === 1 || v === "true" || v === "1";

const getAndMapExternalServices = async (correlationId) => {
  const allServices = await checkCacheForAllServices(correlationId);

  const nonHiddenServices = allServices.services.filter(
    (service) =>
      (!service.isIdOnlyService &&
        !isTruthy(service.relyingParty?.params?.hideApprover)) ||
      (service.isIdOnlyService && !isTruthy(service.isHiddenService)),
  );
  return sortBy(nonHiddenServices, "name");
};

const displayEsfa = (externalServices) => {
  externalServices.map((service) => {
    if (service.name === "Digital Forms service") {
      service.name = "ESFA Digital Forms Service";
    }
    if (service.name === "OPAFastForm") {
      service.name = "ESFA Digital Forms Service";
    }
  });

  externalServices = sortBy(externalServices, "name");
  externalServices = uniqBy(externalServices, (obj) => obj.name);
  return externalServices;
};

const home = async (req, res) => {
  let services = await getAndMapExternalServices(req.id);

  services = displayEsfa(services);

  return res.render("home/views/landingPage", {
    title: "DfE Sign-in",
    services,
    loggedOut: true,
    helpUrl: config.hostingEnvironment.helpUrl,
    helpAssistantUrl: config.hostingEnvironment.helpAssistantUrl,
  });
};

module.exports = home;
