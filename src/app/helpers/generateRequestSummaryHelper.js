/**
 * Generates a summary string based on request_type.name and relevant fields.
 *
 * @param {Object} request - The request object.
 * @param {number} index - The index of the request in the array (for error messages).
 * @returns {string} - The summary string or an error message.
 */
function generateRequestSummary(request, index = 0) {
  const typeName = request?.request_type?.name?.toLowerCase();
  const { serviceName, organisationName, subserviceName } = request;

  switch (typeName) {
    case "service access":
      if (serviceName && organisationName) {
        return `Service request for ${serviceName} for ${organisationName}`;
      }
      return `Error in request ${index + 1}: Missing serviceName or organisationName`;

    case "organisation access":
      if (organisationName) {
        return `Organisation request for ${organisationName}`;
      }
      return `Error in request ${index + 1}: Missing organisationName`;

    case "sub-service access":
      if (subserviceName && serviceName && organisationName) {
        return `Subservice request for ${subserviceName} for ${serviceName} for ${organisationName}`;
      }
      return `Error in request ${index + 1}: Missing subserviceName, serviceName, or organisationName`;

    default:
      return `Error in request ${index + 1}: Invalid request type`;
  }
}

module.exports = generateRequestSummary;
