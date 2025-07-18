# DfE Services

[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)

## Getting Started

Install deps

```
npm install
```

### Run application

This application requires redis to run. If running locally, the easiest way is to create an instance of redis using docker:

```
docker run -d -p 6379:6379 redis
```

Once redis is running, start it with:

```
npm run dev
```

Once the application has started, you can view it in the browser by going to:

```
https://localhost:41012/
```

### Run tests

```
npm run test
```

## Prerequisite

---

1. Add service Bus topic to keyvault with name `auditServiceBusTopicName` - added
2. Add service Bus subscription name to keyvault with name `auditServiceBusSubscriptionName` - added
3. Add audit sql host name to keyvault with name `auditSqlHostName` - added
4. Add audit sql db name to keyvault with name `auditSqlDbName` - added
5. Add request verification cert to keyvault with name `requestVerificationCert` - added
6. Add app insights connection string to keyvault with name `appInsightsConnectionString` - added
7. Add User Feedback Url to keyvault with name `platformGlobalUserFeedbackUrl` - added
8. Add secure Key of oidc connection to interactions to keyvault with name `secureKey` - not needed for now
9. Add tenant Url to keyvault with name `tenantUrl` - added
10. Add aad shd app id to keyvault with name `aadshdappid` - added
11. Add cdn Host Name to keyvault with name `cdnHostName` - added
12. Add cdn Assets Version to keyvault with name `cdnAssetsVersion` - added
13. Add Directories host name to keyvault with name `standaloneDirectoriesHostName` - added
14. Add support host name to keyvault with name `standaloneSupportHostName` - added
15. Add Devices host name to keyvault with name `standaloneDevicesHostName` - added
16. Add Organisations host name to keyvault with name `standaloneOrganisationsHostName` - added
17. Add Applications host name to keyvault with name `standaloneApplicationsHostName` - added
18. Add Access host name to keyvault with name `standaloneAccessHostName` - added
19. Add profile host name to keyvault with name `standaloneProfileHostName` - added
20. Add services host name to keyvault with name `standaloneServicesHostName` - added
21. Add Oidc host name to keyvault with name `standaloneOidcHostName` - added
22. Add help host name to keyvault with name `standaloneHelpHostName` - added
23. Add Interactions host name to keyvault with name `standaloneInteractionsHostName` - added
24. Add service Id to keyvault with name `serviceId` - added
