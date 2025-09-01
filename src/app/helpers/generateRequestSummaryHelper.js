/**
 * Generates a summary string based on request_type.name and relevant fields.
 *
 * @param {Object} request - The request object.
 * @param {number} index - The index of the request in the array (for error messages).
 * @returns {string} - The summary string or an error message.
 */
function generateRequestSummary(request, index = 0) {
  const typeName = request?.request_type?.name?.toLowerCase();
  const { Service_name, org_name, subserviceName } = request;

  switch (typeName) {
    case "service access":
      if (Service_name && org_name) {
        return `Service request for ${Service_name} for ${org_name}`;
      }
      return `Error in request ${index + 1}: Missing serviceName or organisationName`;

    case "organisation access":
      if (org_name) {
        return `Organisation request for ${org_name}`;
      }
      return `Error in request ${index + 1}: Missing organisationName`;

    case "sub-service access":
      if (subserviceName && Service_name && org_name) {
        return `Subservice request for ${subserviceName} for ${Service_name} for ${org_name}`;
      }
      return `Error in request ${index + 1}: Missing subserviceName, serviceName, or organisationName`;

    default:
      return `Error in request ${index + 1}: Invalid request type`;
  }
}

module.exports = {
  generateRequestSummary,
};
