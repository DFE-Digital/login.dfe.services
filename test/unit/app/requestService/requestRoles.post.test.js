jest.mock("login.dfe.policy-engine");
jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/infrastructure/applications");

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const logger = require("./../../../../src/infrastructure/logger");
const postRequestRoles =
  require("./../../../../src/app/requestService/requestRoles").post;

describe("when submitting the chosen sub-services", () => {
  let req;
  const res = mockResponse();

  beforeEach(() => {
    req = mockRequest({
      session: {
        user: {},
      },
    });
    res.mockResetAll();
  });

  it("then it should redirect the user to /my-services and log a warning message if user services do not exist in the session", async () => {
    req.session.user.services = undefined;
    req.originalUrl = "test/foo";
    await postRequestRoles(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith("/my-services");
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `POST ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
  });

  it("then it should redirect the user to /my-services and log a warning message if user services are empty in the session", async () => {
    req.session.user.services = [];
    req.originalUrl = "test/foo";
    await postRequestRoles(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith("/my-services");
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `POST ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
  });
});
