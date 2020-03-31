BEGIN TRAN toolServiceProd
DECLARE @serviceId UNIQUEIDENTIFIER;
SET @serviceId = newid();
	INSERT INTO service (id, name, description, clientId, clientSecret, apiSecret, tokenEndpointAuthMethod, serviceHome, postResetUrl, isExternalService, isMigrated, parentId, isChildService)
	VALUES (@serviceId, 'das-tool-service', 'das-tool-service', 'dastools', 'skoaling-lacunal-reach-tithe', 'oslo-spuriously-justifier-loused', 'client_secret_post', 'https://dfe-apprenticeships.eu.auth0.com', null, 1, 0, null, 0);

	INSERT INTO serviceRedirectUris (serviceId, redirectUrl)
	VALUES (@serviceId, 'https://dfe-apprenticeships.eu.auth0.com/login/callback');

	INSERT INTO servicePostLogoutRedirectUris (serviceId, redirectUrl)
	VALUES (@serviceId, 'https://dfe-apprenticeships.eu.auth0.com/');

	INSERT INTO serviceParams (serviceId, paramName, paramValue)
	VALUES (@serviceId, 'allowManageInvite', 'true');

    INSERT INTO serviceParams (serviceId, paramName, paramValue)
	VALUES (@serviceId, 'hideApprover', 'true');
ROLLBACK TRAN toolServiceProd
