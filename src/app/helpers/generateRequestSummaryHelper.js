/**
 * Generates a summary string based on request_type.name and relevant fields.
 *
 * @param {Object} request - The request object.
 * @param {number} index - The index of the request in the array (for error messages).
 * @returns {string} - The summary string or an error message.
 */
function generateRequestSummary(request, index = 0) {
  const typeName = request?.request_type?.name?.toLowerCase();
  const { serviceName, org_name, subServiceNames } = request;

  switch (typeName) {
    case "service access":
      if (serviceName && org_name) {
        return `Service request for ${serviceName} for ${org_name}`;
      }
      return `Error in request ${index + 1}: Missing serviceName or organisationName`;

    case "organisation access":
      if (org_name) {
        return `Organisation request for ${org_name}`;
      }
      return `Error in request ${index + 1}: Missing organisationName`;

    case "sub-service access":
      if (subServiceNames && serviceName && org_name) {
        return `Subservice request for ${subServiceNames} for ${serviceName} for ${org_name}`;
      }
      if (serviceName && org_name) {
        // Handle infrequent, but possible, case where a user requests to go to 0 sub-services
        return `Subservice request for ${serviceName} for ${org_name}`;
      }
      return `Error in sub-service request ${index + 1}: Missing serviceName or organisationName`;

    default:
      return `Error in request ${index + 1}: Invalid request type`;
  }
}

module.exports = {
  generateRequestSummary,
};
