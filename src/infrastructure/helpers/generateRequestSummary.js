function generateRequestSummary(request, index = 0) {
  const { type, serviceName, organisationName, subserviceName } = request;

  switch (type) {
    case "service":
      if (serviceName && organisationName) {
        return `Service request for ${serviceName} for ${organisationName}`;
      }
      return `Error in request ${index + 1}: Missing serviceName or organisationName`;

    case "organisation":
      if (organisationName) {
        return `Organisation request for ${organisationName}`;
      }
      return `Error in request ${index + 1}: Missing organisationName`;

    case "subservice":
      if (subserviceName && serviceName && organisationName) {
        return `Subservice request for ${subserviceName} for ${serviceName} for ${organisationName}`;
      }
      return `Error in request ${index + 1}: Missing subserviceName, serviceName, or organisationName`;

    default:
      return `Error in request ${index + 1}: Invalid request type`;
  }
}

module.exports = generateRequestSummary;
