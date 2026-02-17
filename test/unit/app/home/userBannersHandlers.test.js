const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");

const mockDeleteUserBanner = jest.fn();

jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      fetchUserBanners: jest.fn(),
      deleteUserBanner: mockDeleteUserBanner,
    },
  };
});

const {
  closeServiceAddedBanner,
  closeSubServiceAddedBanner,
  jobTitleBannerHandler,
} = require("../../../../src/app/home/userBannersHandlers");

jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
const res = mockResponse();

describe("userBannersHandlers", () => {
  describe("userBannersHandlers.jobTitleBannerHandler", () => {
    let req;

    beforeEach(() => {
      req = mockRequest({
        user: {
          sub: "user1",
        },
      });

      res.mockResetAll();
      res.sendStatus = jest.fn().mockReturnValue({
        end: jest.fn(),
        send: jest.fn().mockReturnValue({ end: jest.fn() }),
      });

      mockDeleteUserBanner.mockReset();
    });

    it("should redirect if there is no user in session", async () => {
      await jobTitleBannerHandler(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
    });
  });

  describe("userBannersHandlers.closeSubServiceAddedBanner", () => {
    let req;

    beforeEach(() => {
      req = mockRequest({
        user: {
          sub: "user1",
        },
        params: {
          bannerId: "banner1",
        },
      });

      res.mockResetAll();
      res.status = jest.fn().mockReturnValue({
        end: jest.fn(),
        send: jest.fn().mockReturnValue({ end: jest.fn() }),
      });

      mockDeleteUserBanner.mockReset();
    });

    it("should redirect if there is bannerId in params", async () => {
      req = mockRequest({
        user: {
          sub: "user1",
        },
      });
      await closeSubServiceAddedBanner(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
    });

    it("should call status with 200 when provided with a bannerId", async () => {
      await closeSubServiceAddedBanner(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().send).toHaveBeenCalledWith(
        "'Sub-service added' user banner with ID: banner1 successfully removed.",
      );
    });

    it("should return an exception if there is a failure", async () => {
      mockDeleteUserBanner.mockRejectedValue(new Error("Failed delete banner"));

      await expect(closeSubServiceAddedBanner(req, res)).rejects.toThrow(
        "Error removing 'Sub-service added' banner with id banner1 - Error: Failed delete banner.",
      );

      expect(res.status).toHaveBeenCalledTimes(0);
    });
  });

  describe("userBannersHandlers.closeServiceAddedBanner", () => {
    let req;

    beforeEach(() => {
      req = mockRequest({
        user: {
          sub: "user1",
        },
        params: {
          bannerId: "banner1",
        },
      });

      res.mockResetAll();
      res.sendStatus = jest.fn().mockReturnValue({
        end: jest.fn(),
        send: jest.fn().mockReturnValue({ end: jest.fn() }),
      });

      mockDeleteUserBanner.mockReset();
    });

    it("should call sendStatus with 200 when provided with a bannerId", async () => {
      await closeServiceAddedBanner(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    it("should return an exception if there is a failure", async () => {
      mockDeleteUserBanner.mockRejectedValue(new Error("Failed delete banner"));

      await expect(closeServiceAddedBanner(req, res)).rejects.toThrow(
        "Error removing 'Service added' banner with id 5 - Error: Failed delete banner.",
      );

      expect(res.sendStatus).toHaveBeenCalledTimes(0);
    });
  });
});
