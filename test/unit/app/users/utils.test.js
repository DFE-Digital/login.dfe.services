  const getOrgNaturalIdentifiers = require('../../../../src/app/users/utils');
  
  describe('getOrgNaturalIdentifiers', () => {
    it('should return an array of natural identifiers for the organization', () => {
      // Test case 1: All identifiers present
      const org1 = {
        URN: 'urn123',
        UID: 'uid123',
        UKPRN: 'ukprn123',
        UPIN: 'upin123'
      };
      expect(getOrgNaturalIdentifiers(org1)).toEqual([
        'URN: urn123',
        'UID: uid123',
        'UKPRN: ukprn123',
        'UPIN: upin123'
      ]);
  
      // Test case 2: Only URN and UKPRN identifiers present
      const org2 = {
        URN: 'urn123',
        UKPRN: 'ukprn123'
      };
      expect(getOrgNaturalIdentifiers(org2)).toEqual([
        'URN: urn123',
        'UKPRN: ukprn123'
      ]);
  
      // Test case 3: Only UID and UPIN identifiers present
      const org3 = {
        UID: 'uid123',
        UPIN: 'upin123'
      };
      expect(getOrgNaturalIdentifiers(org3)).toEqual([
        'UID: uid123',
        'UPIN: upin123'
      ]);

      // Test case 4: No identifiers present
      const org4 = {};
      expect(getOrgNaturalIdentifiers(org4)).toEqual([]);
    });
  });