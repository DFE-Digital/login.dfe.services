"use strict";

const {
  getOrganisationAndServiceForUser,
  getPendingRequestsAssociatedWithUser,
  getAllRequestsTypesForApprover,
} = require("./../../infrastructure/organisations");
const Account = require("./../../infrastructure/account");
const flatten = require("lodash/flatten");
const uniq = require("lodash/uniq");
const sortBy = require("lodash/sortBy");
const config = require("./../../infrastructure/config");

const getApproversDetails = async (organisations) => {
  const allApproverIds = flatten(organisations.map((org) => org.approvers));
  const approverIds = allApproverIds.map((approver) => approver.user_id);
  const distinctApproverIds = uniq(approverIds);
  if (distinctApproverIds.length === 0) {
    return [];
  }
  return Account.getUsersById(distinctApproverIds);
};

const getAndMapOrganisationsAndServices = async (account, correlationId) => {
  const organisations = await getOrganisationAndServiceForUser(
    account.id,
    correlationId,
  );
  const allApprovers = await getApproversDetails(organisations, correlationId);

  return organisations.map((organisation) => {
    const approvers = organisation.approvers
      .map((approverId) => {
        return allApprovers.find(
          (x) =>
            x.claims.sub.toLowerCase() === approverId.user_id.toLowerCase(),
        );
      })
      .filter((x) => x);

    return {
      id: organisation.organisation.id,
      name: organisation.organisation.name,
      LegalName: organisation.organisation.LegalName,
      urn: organisation.organisation.urn,
      uid: organisation.organisation.uid,
      upin: organisation.organisation.upin,
      ukprn: organisation.organisation.ukprn,
      status: organisation.organisation.status,
      role: organisation.role,
      approvers,
    };
  });
};

const getAndMapPendingRequests = async (account, correlationId) => {
  const pendingUserRequests = await getPendingRequestsAssociatedWithUser(
    account.id,
    correlationId,
  );
  return pendingUserRequests.map((org) => ({
    id: org.org_id,
    name: org.org_name,
    LegalName: org.LegalName,
    urn: org.urn,
    uid: org.uid,
    upin: org.upin,
    ukprn: org.ukprn,
    status: org.org_status,
    requestDate: org.created_date,
    requestStatus: org.status.id,
  }));
};

const disableRequestOrgLink = async (orgRequests, organisations) => {
  if (
    organisations &&
    organisations.length <= 0 &&
    orgRequests &&
    orgRequests.length > 0
  ) {
    return true;
  }
  return false;
};

const organisations = async (req, res) => {
  const account = Account.fromContext(req.user);
  const organisations = await getAndMapOrganisationsAndServices(
    account,
    req.id,
  );
  const organisationRequests = await getAndMapPendingRequests(account, req.id);
  const allOrgs = organisations.concat(organisationRequests);
  const sortedOrgs = sortBy(allOrgs, "name");
  const approverRequests = req.organisationRequests || [];
  const disableReqOrgLink = await disableRequestOrgLink(
    organisationRequests,
    organisations,
  );
  const { totalNumberOfRecords } = await getAllRequestsTypesForApprover(
    req.user.sub,
    req.id,
  );
  const totalNumberOfAccessRequests = totalNumberOfRecords;

  return res.render("organisations/views/organisations", {
    title: "Organisations",
    user: account,
    organisations: sortedOrgs,
    currentPage: "organisations",
    approverRequests,
    disableReqOrgLink,
    totalNumberOfAccessRequests,
  });
};

module.exports = organisations;
