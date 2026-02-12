const { mockRequest, mockResponse } = require("../../../utils/jestMocks");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);

jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      fetchUserBanners: async () => {
        return null;
      },
      createUserBanners: async () => {
        return Promise.resolve(true);
      },
      deleteUserBanner: async () => {
        return Promise.resolve(true);
      },
    },
  };
});

const {
  closeServiceAddedBanner,
  closeSubServiceAddedBanner,
  jobTitleBannerHandler,
  passwordChangeBannerHandler,
} = require("../../../../src/app/home/userBannersHandlers");

describe("userBannersHandlers", () => {
  describe("jobTitleBannerHandler", () => {
    let req;
    let res;

    beforeEach(() => {
      req = mockRequest();
      res = mockResponse();
    });

    it("should redirect to my-services if there is no user in the session", async () => {
      await jobTitleBannerHandler(req, res);

      expect(res.render.mock.calls.length).toBe(0);
      expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
    });
  });

  describe("passwordChangeBannerHandler", () => {
    let req;
    let res;

    beforeEach(() => {
      req = mockRequest();
      res = mockResponse();
    });

    it("should redirect to my-services if there is no bannerId in params", async () => {
      await passwordChangeBannerHandler(req, res);

      expect(res.render.mock.calls.length).toBe(0);
      expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
    });
  });

  describe("closeSubServiceAddedBanner", () => {
    let req;
    let res;

    beforeEach(() => {
      req = mockRequest();
      res = mockResponse();
    });

    it("should redirect to my-services if there is no user in the session", async () => {
      await closeSubServiceAddedBanner(req, res);

      expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
    });
  });

  describe("closeServiceAddedBanner", () => {
    let req;
    let res;

    beforeEach(() => {
      req = mockRequest();
      res = mockResponse();
    });

    it("should succed with status 200", async () => {
      await closeServiceAddedBanner(req, res);

      expect(res.sendStatus.mock.calls[0][0]).toBe(200);
    });
  });
});
