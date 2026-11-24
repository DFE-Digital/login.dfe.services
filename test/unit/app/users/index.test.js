jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.dao", () => ({
  directories: {},
  organisation: {},
  invitation: {},
  services: {},
}));
jest.mock("login.dfe.policy-engine");

const users = require("./../../../../src/app/users");
const {
  isApprover,
  isTargetUserInOrganisation,
} = require("./../../../../src/infrastructure/utils");

// The users router is a module-level singleton, so build it once.
const router = users((req, res, next) => next());

const handlersFor = (method, path) => {
  const layer = router.stack.find(
    (x) => x.route && x.route.path === path && x.route.methods[method],
  );
  if (!layer) {
    throw new Error(`No ${method.toUpperCase()} route registered for ${path}`);
  }
  return layer.route.stack.map((x) => x.handle);
};

const orgScopedActionPaths = [
  "/:orgId/users/:uid/services/:sid",
  "/:orgId/users/:uid/services/:sid/confirm-edit-service",
  "/:orgId/users/:uid/services/:sid/remove-service",
  "/:orgId/users/:uid/remove-organisation",
  "/:orgId/users/:uid/edit-permission",
  "/:orgId/users/:uid/resend-invitation",
];

// In the invite-existing-user journey the target is not yet a member of the
// organisation, so these routes must not require membership.
const inviteJourneyPaths = [
  "/:orgId/users/:uid/confirm-user",
  "/:orgId/users/:uid/organisation-permissions",
  "/:orgId/users/:uid/associate-services",
  "/:orgId/users/:uid/associate-services/:sid",
  "/:orgId/users/:uid/confirm-details",
];

describe.each(["get", "post"])("users router %s routes", (method) => {
  it.each(orgScopedActionPaths)(
    "%s checks target membership after isApprover",
    (path) => {
      const handlers = handlersFor(method, path);
      const approverIndex = handlers.indexOf(isApprover);

      expect(approverIndex).toBeGreaterThan(-1);
      expect(handlers[approverIndex + 1]).toBe(isTargetUserInOrganisation);
    },
  );

  it.each(inviteJourneyPaths)("%s does not check target membership", (path) => {
    expect(handlersFor(method, path)).not.toContain(isTargetUserInOrganisation);
  });
});

it("classifies every org-scoped :uid route as guarded or invite journey", () => {
  const classifiedPaths = [...orgScopedActionPaths, ...inviteJourneyPaths];
  const uidRoutePaths = router.stack
    .filter((x) => x.route && x.route.path.startsWith("/:orgId/users/:uid"))
    .map((x) => x.route.path);

  expect(uidRoutePaths.length).toBeGreaterThan(0);
  uidRoutePaths.forEach((path) => {
    expect(classifiedPaths).toContain(path);
  });
});
