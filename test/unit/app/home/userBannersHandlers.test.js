const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");

const mockCreateUserBanners = jest.fn();
const mockDeleteUserBanner = jest.fn();
const mockFetchMultipleUserBanners = jest.fn();
const mockFetchUserBanners = jest.fn();
const mockUpdateUserBanners = jest.fn();

jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      createUserBanners: mockCreateUserBanners,
      deleteUserBanner: mockDeleteUserBanner,
      fetchMultipleUserBanners: mockFetchMultipleUserBanners,
      fetchUserBanners: mockFetchUserBanners,
      updateUserBanners: mockUpdateUserBanners,
    },
  };
});

const {
  closeServiceAddedBanner,
  closeSubServiceAddedBanner,
  jobTitleBannerHandler,
  passwordChangeBannerHandler,
  createUserBanners,
  createSubServiceAddedBanners,
  createServiceAddedBanners,
  fetchNewServiceBanners,
  fetchSubServiceAddedBanners,
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
        session: {
          user: {
            uid: "user1",
          },
        },
      });

      res.mockResetAll();
      res.status = jest.fn().mockReturnValue({
        end: jest.fn(),
        send: jest.fn().mockReturnValue({ end: jest.fn() }),
      });

      mockCreateUserBanners.mockReset();
      mockDeleteUserBanner.mockReset();
      mockFetchUserBanners.mockReset().mockReturnValue(undefined);
      mockUpdateUserBanners.mockReset();
    });

    it("should redirect if there is no user in session", async () => {
      req = mockRequest();
      await jobTitleBannerHandler(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
    });

    it("should not call createUserBanners if a banner is found", async () => {
      mockFetchUserBanners.mockReset().mockReturnValue({ id: "banner1" });

      await jobTitleBannerHandler(req, res);

      expect(mockCreateUserBanners).toHaveBeenCalledTimes(0);
      expect(res.status).toHaveBeenCalledTimes(0);
    });

    it("should call createUserBanners and return 200 if a banner is not found and inflight is false or not set", async () => {
      mockFetchUserBanners.mockReset().mockReturnValue(undefined);
      await jobTitleBannerHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockCreateUserBanners).toHaveBeenCalledTimes(1);
    });

    it("should return 200 but and call createUserBanners if a banner is not found", async () => {
      mockFetchUserBanners.mockReset().mockReturnValue(undefined);
      await jobTitleBannerHandler(req, res, true);

      expect(res.status).toHaveBeenCalledTimes(0);
      expect(mockCreateUserBanners).toHaveBeenCalledTimes(1);
    });
  });

  describe("userBannersHandlers.passwordChangeBannerHandler", () => {
    let req;

    beforeEach(() => {
      req = mockRequest({
        session: {
          user: {
            uid: "user1",
          },
        },
      });

      res.mockResetAll();
      res.status = jest.fn().mockReturnValue({
        end: jest.fn(),
        send: jest.fn().mockReturnValue({ end: jest.fn() }),
      });

      mockCreateUserBanners.mockReset();
      mockDeleteUserBanner.mockReset();
      mockFetchUserBanners.mockReset().mockReturnValue({ id: "banner1" });
      mockUpdateUserBanners.mockReset();
    });

    it("should redirect if there is no user in session", async () => {
      req = mockRequest();
      await passwordChangeBannerHandler(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
    });

    it("should not call updateUserBanners if a banner is not found", async () => {
      mockFetchUserBanners.mockReset().mockReturnValue(undefined);

      await passwordChangeBannerHandler(req, res);

      expect(mockUpdateUserBanners).toHaveBeenCalledTimes(0);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should call updateUserBanners if a banner is found", async () => {
      await passwordChangeBannerHandler(req, res);

      expect(mockUpdateUserBanners).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status().send).toHaveBeenCalledWith(
        "User banner acknowledgement received",
      );
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

      mockCreateUserBanners.mockReset();
      mockDeleteUserBanner.mockReset();
      mockFetchUserBanners.mockReset();
      mockUpdateUserBanners.mockReset();
    });

    it("should redirect if there is no bannerId in params", async () => {
      req = mockRequest();
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
      mockFetchUserBanners.mockReset();
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

  describe("userBannersHandlers.createUserBanners", () => {
    const userId = "user1";
    const bannerId = "banner1";

    beforeEach(() => {
      mockCreateUserBanners.mockReset();
    });

    it("should have null banner data if none provided", async () => {
      const bannerData = null;
      await createUserBanners(userId, bannerId, bannerData);

      expect(mockCreateUserBanners).toHaveBeenCalledWith({
        userId,
        bannerId,
        bannerData: null,
      });
    });

    it("should have banner data if provided", async () => {
      const bannerData = {
        serviceName: "My Test Service",
      };
      await createUserBanners(userId, bannerId, bannerData);

      expect(mockCreateUserBanners).toHaveBeenCalledWith({
        userId,
        bannerId,
        bannerData: {
          serviceName: "My Test Service",
        },
      });
    });
  });

  describe("userBannersHandlers.createSubServiceAddedBanners", () => {
    const endUserId = "user1";
    const serviceName = "My Test Service";
    const rolesName = ["My Role Name"];

    beforeEach(() => {
      mockCreateUserBanners.mockReset();
    });

    it("should create the user banner with the data", async () => {
      await createSubServiceAddedBanners(endUserId, serviceName, rolesName);

      expect(mockCreateUserBanners).toHaveBeenCalledWith({
        bannerData:
          '{"bannerType":"Sub-service added","subServiceName":["My Role Name"],"serviceName":"My Test Service"}',
        bannerId: 4,
        userId: "user1",
      });
    });

    it("should raise an exception on error", async () => {
      mockCreateUserBanners.mockRejectedValue(
        new Error("Failed create banner"),
      );

      await expect(
        createSubServiceAddedBanners(endUserId, serviceName, rolesName),
      ).rejects.toThrow(
        "Failed to create the 'Sub-service added' banner for the user with ID [user1], service [My Test Service], and sub-services: My Role Name - Error: Failed create banner.",
      );
    });
  });

  describe("userBannersHandlers.createServiceAddedBanners", () => {
    const endUserId = "user1";
    const serviceName = "My Test Service";

    beforeEach(() => {
      mockCreateUserBanners.mockReset();
    });

    it("should create the user banner with the data", async () => {
      await createServiceAddedBanners(endUserId, serviceName);

      expect(mockCreateUserBanners).toHaveBeenCalledWith({
        bannerData:
          '{"bannerType":"Service added","serviceName":"My Test Service"}',
        bannerId: 5,
        userId: "user1",
      });
    });

    it("should raise an exception on error", async () => {
      mockCreateUserBanners.mockRejectedValue(
        new Error("Failed create banner"),
      );

      await expect(
        createServiceAddedBanners(endUserId, serviceName),
      ).rejects.toThrow(
        "Failed to create the 'Service added' banner for the user with ID [user1], service [My Test Service] - Error: Failed create banner.",
      );
    });
  });

  describe("userBannersHandlers.fetchNewServiceBanners", () => {
    const userId = "user1";
    const id = "banner1";
    const bannerData = JSON.stringify({ serviceName: "My Test Service" });

    beforeEach(() => {
      mockFetchMultipleUserBanners
        .mockReset()
        .mockReturnValue([{ id, userId, bannerData }]);
    });

    it("should return banner data if banners are found", async () => {
      const result = await fetchNewServiceBanners(userId);

      expect(result).toStrictEqual([
        { id: "banner1", serviceName: "My Test Service", userId: "user1" },
      ]);
    });

    it("should include null service name if there is no bannerData", async () => {
      mockFetchMultipleUserBanners
        .mockReset()
        .mockReturnValue([{ id, userId }]);
      const result = await fetchNewServiceBanners(userId);

      expect(result).toStrictEqual([
        { id: "banner1", serviceName: null, userId: "user1" },
      ]);
    });

    it("should include null service name if there is bannerData but no service name present", async () => {
      mockFetchMultipleUserBanners
        .mockReset()
        .mockReturnValue([{ id, userId, bannerData: JSON.stringify({}) }]);
      const result = await fetchNewServiceBanners(userId);

      expect(result).toStrictEqual([
        { id: "banner1", serviceName: null, userId: "user1" },
      ]);
    });

    it("should raise an exception on error", async () => {
      mockFetchMultipleUserBanners.mockRejectedValue(
        new Error("Failed create banner"),
      );

      await expect(fetchNewServiceBanners(userId)).rejects.toThrow(
        "Error fetching 'Service added' banners for user user1 - Error: Failed create banner.",
      );
    });
  });

  describe("userBannersHandlers.fetchSubServiceAddedBanners", () => {
    const userId = "user1";
    const id = "banner1";
    const bannerData = JSON.stringify({
      serviceName: "My Test Service",
      subServiceName: "My Sub Service",
    });

    beforeEach(() => {
      mockFetchMultipleUserBanners
        .mockReset()
        .mockReturnValue([{ id, userId, bannerData }]);
    });

    it("should return banner data if banners are found", async () => {
      const result = await fetchSubServiceAddedBanners(userId);

      expect(result).toStrictEqual([
        {
          id: "banner1",
          serviceName: "My Test Service",
          subServiceName: "My Sub Service",
          userId: "user1",
        },
      ]);
    });

    it("should include null service and sub-service names if there is no bannerData", async () => {
      mockFetchMultipleUserBanners
        .mockReset()
        .mockReturnValue([{ id, userId }]);
      const result = await fetchSubServiceAddedBanners(userId);

      expect(result).toStrictEqual([
        {
          id: "banner1",
          serviceName: null,
          subServiceName: null,
          userId: "user1",
        },
      ]);
    });

    it("should include null service and sub-service names if there is bannerData but names are not present", async () => {
      mockFetchMultipleUserBanners
        .mockReset()
        .mockReturnValue([{ id, userId, bannerData: JSON.stringify({}) }]);
      const result = await fetchSubServiceAddedBanners(userId);

      expect(result).toStrictEqual([
        {
          id: "banner1",
          serviceName: null,
          subServiceName: null,
          userId: "user1",
        },
      ]);
    });

    it("should raise an exception on error", async () => {
      mockFetchMultipleUserBanners.mockRejectedValue(
        new Error("Failed create banner"),
      );

      await expect(fetchSubServiceAddedBanners(userId)).rejects.toThrow(
        "Error fetching 'Sub-service added' banners for user user1 - Error: Failed create banner.",
      );
    });
  });
});
