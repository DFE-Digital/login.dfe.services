const { directories } = require("login.dfe.dao");
const Account = require("../account");
const flatten = require("lodash/flatten");
const uniq = require("lodash/uniq");

exports.getApproversDetails = async (organisations) => {
  const allApproverIds = flatten(organisations.map((org) => org.approvers));
  const approverIds = allApproverIds.map((approver) => approver.user_id);
  const distinctApproverIds = uniq(approverIds);
  if (distinctApproverIds.length === 0) {
    return [];
  }
  return Account.getUsersById(distinctApproverIds);
};

exports.recordRequestServiceBannerAck = async (userId) => {
  //1: "request a service" feature notification banner
  const useBanner = await directories.fetchUserBanners(userId, 1);
  if (!useBanner) {
    await directories.createUserBanners({
      userId,
      bannerId: 1,
    });
  }
};
