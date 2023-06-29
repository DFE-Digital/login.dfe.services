# DfE Services
[![Build Status](https://travis-ci.org/DFE-Digital/login.dfe.services.svg?branch=master)](https://travis-ci.org/DFE-Digital/login.dfe.services)
[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)


## Prerequisite
---
1. Add service Bus topic to keyvault with name `auditServiceBusTopicName` - added
2. Add service Bus subscription name to keyvault with name `auditServiceBusSubscriptionName` - added
3. Add audit sql host name to keyvault with name `auditSqlHostName` - added
4. Add audit sql db name to keyvault with name `auditSqlDbName` - added
5. Add request verification cert to keyvault with name `requestVerificationCert` - not needed for now
9. Add app insights instrumentation Key to keyvault with name `appInsightsInstrumentationKey` - added
10. Add User Feedback Url to keyvault with name `platformGlobalUserFeedbackUrl` - added
11. Add secure Key of oidc connection to interactions to keyvault with name `secureKey` - not needed for now
12. Add tenant Url to keyvault with name `tenantUrl` - added
13. Add aad shd app id to keyvault with name `aadshdappid` - added
14. Add cdn Host Name to keyvault with name `cdnHostName` - added
15. Add cdn Assets Version to keyvault with name `cdnAssetsVersion` - added
16. Add pirean Services to keyvault with name `pireanServices` - added also in azure devops variable group
17. Add Directories host name to keyvault with name `standaloneDirectoriesHostName` - added
18. Add support host name to keyvault with name `standaloneSupportHostName` - added
19. Add Devices host name to keyvault with name `standaloneDevicesHostName` - added
20. Add Organisations host name to keyvault with name `standaloneOrganisationsHostName` - added
21. Add Applications host name to keyvault with name `standaloneApplicationsHostName` - added
22. Add Access host name to keyvault with name `standaloneAccessHostName` - added
23. Add profile host name to keyvault with name `standaloneProfileHostName` - added
24. Add services host name to keyvault with name `standaloneServicesHostName` - added
25. Add Oidc host name to keyvault with name `standaloneOidcHostName` - added
26. Add help host name to keyvault with name `standaloneHelpHostName` - added
27. Add Interactions host name to keyvault with name `standaloneInteractionsHostName` - added
28. Add service Id to keyvault with name `serviceId` - added