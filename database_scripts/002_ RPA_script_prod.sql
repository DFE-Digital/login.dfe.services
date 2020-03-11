BEGIN TRAN RPAFORM
    DECLARE @roleid uniqueidentifier;
    DECLARE @policyid uniqueidentifier;
    SET @roleid = newid();
    INSERT INTO Role (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
    VALUES (@roleid, 'Risk Protection Arrangement', 'b45616a1-19a7-4a2e-966d-9e28c99bc6c6', 1, getdate(), getdate(), 'RPA_FORM_ACCESS', (SELECT MAX(NumericId) FROM Role) + 1, null);

    INSERT INTO serviceParams (serviceId, paramName, paramValue)
    VALUES ('b45616a1-19a7-4a2e-966d-9e28c99bc6c6', 'RPA_FORM_ACCESS', 'https://form-sso.education.gov.uk/service/rpa');

    -- T Levels LA access
    SET @policyid = newid();
    INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
    VALUES (@policyid, 'RPA - LA', 'b45616a1-19a7-4a2e-966d-9e28c99bc6c6', 1,
getdate(), getdate());
    INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
    VALUES (@policyid, @roleid, getdate(), getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.status.id', 'is', '1', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.category.id', 'is', '002', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.status.id', 'is', '4', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.status.id', 'is', '3', getdate(),
getdate());

    -- T Levels estab access
    SET @policyid = newid();
    INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
    VALUES (@policyid, 'RPA - Establishment', 'b45616a1-19a7-4a2e-966d-9e28c99bc6c6', 1, getdate(), getdate());
    INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
    VALUES (@policyid, @roleid, getdate(), getdate());

    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.category.id', 'is', '001', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '01', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '02', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '03', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '05', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '06', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '07', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '12', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '14', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '15', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '28', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '33', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '34', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '35', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '36', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '38', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '39', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '40', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '41', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '42', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '43', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '44', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '45', getdate(),
getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.type.id', 'is', '46', getdate(),
getdate());

ROLLBACK TRAN RPAFORM
