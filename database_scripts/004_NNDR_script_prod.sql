DECLARE @serviceId UNIQUEIDENTIFIER
DECLARE @establishmentPolicyId UNIQUEIDENTIFIER
DECLARE @matPolicyId UNIQUEIDENTIFIER
DECLARE @academyPolicyId UNIQUEIDENTIFIER
DECLARE @satPolicyId UNIQUEIDENTIFIER

DECLARE @matRoleId UNIQUEIDENTIFIER
DECLARE @satRoleId UNIQUEIDENTIFIER
DECLARE @academyRoleId UNIQUEIDENTIFIER

BEGIN TRAN INSERTNNDR
--Check if service exists if not create one
IF (select count(*)
from [service]
where [Name] = 'Academy national non-domestic rates (NNDR) claims')  = 0
        BEGIN
    SET @serviceId = newid();
    INSERT INTO service
        (id, name, description, clientId, clientSecret, apiSecret, tokenEndpointAuthMethod, serviceHome, postResetUrl, isExternalService, isMigrated, parentId, isChildService)
    VALUES
        (@serviceId, 'Academy national non-domestic rates (NNDR) claims', null, 'NNDR', 'cat-automobile-tornado', 'arbalest-tenet-encircle-otis', 'client_secret_post', null, null, 1, 0, null, 0);

    INSERT INTO serviceGrantTypes
        (serviceId, grantType)
    VALUES
        (@serviceId, 'authorization_code');

    INSERT INTO serviceGrantTypes
        (serviceId, grantType)
    VALUES
        (@serviceId, 'refresh_token');


    INSERT INTO serviceRedirectUris
        (serviceId, redirectUrl)
    VALUES
        (@serviceId, 'https://nndrclaims.education.gov.uk/auth/cb');

    INSERT INTO servicePostLogoutRedirectUris
        (serviceId, redirectUrl)
    VALUES
        (@serviceId, 'https://nndrclaims.education.gov.uk/signout/complete');

    INSERT INTO serviceParams
        (serviceId, paramName, paramValue)
    VALUES
        (@serviceId, 'allowManageInvite', 'true');

    INSERT INTO serviceParams
        (serviceId, paramName, paramValue)
    VALUES
        (@serviceId, 'minimumRolesRequired', 1);
END
    ELSE
        BEGIN
    Set @serviceId = (select id
    from service
    where clientId = 'NNDR')
END

--Roles
SET @matRoleId = newid();
INSERT INTO Role
    (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
VALUES
    (@matRoleId, 'MAT', @serviceId, 1, getdate(), getdate(), 'NNDR_MAT', (SELECT MAX(NumericId)
        FROM Role) + 1, null);

SET @satRoleId = newid();
INSERT INTO Role
    (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
VALUES
    (@satRoleId, 'SAT', @serviceId, 1, getdate(), getdate(), 'NNDR_SAT', (SELECT MAX(NumericId)
        FROM Role) + 1, null);

SET @academyRoleId = newid();
INSERT INTO Role
    (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
VALUES
    (@academyRoleId, 'Academy', @serviceId, 1, getdate(), getdate(), 'NNDR_Academy', (SELECT MAX(NumericId)
        FROM Role) + 1, null);



--Establishment Policy
SET @establishmentPolicyId = NEWID()
INSERT INTO Policy
    (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
VALUES
    (@establishmentPolicyId, 'NNDR Establishment Access', @serviceId, 1, getdate(), getdate());


--Establishment Policy Conditions
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.category.id', 'is', '001', getdate(), getdate());

INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.status.id', 'is', '1', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.status.id', 'is', '3', getdate(), getdate());


INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '06', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '28', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '33', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '34', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '35', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '36', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '38', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '39', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '40', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '41', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '42', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '43', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '44', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '45', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @establishmentPolicyId, 'organisation.type.id', 'is', '46', getdate(), getdate());

--Associate Establishment Policy with RoleIds
INSERT INTO PolicyRole
    (PolicyId, RoleId, CreatedAt, UpdatedAt)
VALUES
    (@establishmentPolicyId, @academyRoleId, GETDATE(), GETDATE());


--MAT Policy
SET @matPolicyId = NEWID()
INSERT INTO Policy
    (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
VALUES
    (@matPolicyId, 'NNDR Multi-Academy Trusts Access', @serviceId, 1, getdate(), getdate());

--MAT Policy Conditions
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @matPolicyId, 'organisation.category.id', 'is', '010', getdate(), getdate());

INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @matPolicyId, 'organisation.status.id', 'is', '1', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @matPolicyId, 'organisation.status.id', 'is', '3', getdate(), getdate());

--MAT Policy with RoleIds
INSERT INTO PolicyRole
    (PolicyId, RoleId, CreatedAt, UpdatedAt)
VALUES
    (@matPolicyId, @matRoleId, GETDATE(), GETDATE());


--SAT Policy
SET @satPolicyId = NEWID()
INSERT INTO Policy
    (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
VALUES
    (@satPolicyId, 'NNDR Single Academy Trust Access', @serviceId, 1, getdate(), getdate());

--SAT Policy Conditions
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @satPolicyId, 'organisation.category.id', 'is', '013', getdate(), getdate());

INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @satPolicyId, 'organisation.status.id', 'is', '1', getdate(), getdate());
INSERT INTO PolicyCondition
    (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
VALUES
    (newid(), @satPolicyId, 'organisation.status.id', 'is', '3', getdate(), getdate());

--SAT Policy with RoleIds

INSERT INTO PolicyRole
    (PolicyId, RoleId, CreatedAt, UpdatedAt)
VALUES
    (@satPolicyId, @satRoleId, GETDATE(), GETDATE());


--Manage
DECLARE @manageid uniqueidentifier
Set @serviceId = (select id
from service
where clientId = 'NNDR')

SET @manageid = (SELECT id
FROM service
WHERE clientId = 'manage')

INSERT INTO Role
    (Id, Name, ApplicationId, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
SELECT NEWID(),
    'Academy national non-domestic rates (NNDR) claims - Service Configuration',
    @manageid,
    GETDATE(),
    GETDATE(),
    UPPER(cast(id as varchar(40))) + '_serviceconfig',
    ROW_NUMBER() over (ORDER BY id),
    NULL
FROM service
WHERE id = @serviceId

--service banner

SET @manageid = (SELECT id
FROM service
WHERE clientId = 'manage')

INSERT INTO Role
    (Id, Name, ApplicationId, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
SELECT NEWID(),
    'Academy national non-domestic rates (NNDR) claims - Service Banner',
    @manageid,
    GETDATE(),
    GETDATE(),
    UPPER(cast(id as varchar(40))) + '_serviceBanner',
    ROW_NUMBER() over (ORDER BY id),
    NULL
FROM service
WHERE id = @serviceId

--service access management
SET @manageid = (SELECT id
FROM service
WHERE clientId = 'manage')

INSERT INTO Role
    (Id, Name, ApplicationId, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
SELECT NEWID(),
    'Academy national non-domestic rates (NNDR) claims - Service Access Management',
    @manageid,
    GETDATE(),
    GETDATE(),
    UPPER(cast(id as varchar(40))) + '_accessManage',
    ROW_NUMBER() over (ORDER BY id),
    NULL
FROM service
WHERE id = @serviceId

--service support
SET @manageid = (SELECT id
FROM service
WHERE clientId = 'manage')

INSERT INTO Role
    (Id, Name, ApplicationId, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
SELECT NEWID(),
    'Academy national non-domestic rates (NNDR) claims - Service Support',
    @manageid,
    GETDATE(),
    GETDATE(),
    UPPER(cast(id as varchar(40))) + '_serviceSup',
    ROW_NUMBER() over (ORDER BY id),
    NULL
FROM service
WHERE id = @serviceId

ROLLBACK TRAN INSERTNNDR
