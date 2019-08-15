import commands from '../../commands';
import Command, { CommandOption, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../../../Auth';
const command: Command = require('./groupsettingtemplate-list');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';

describe(commands.GROUPSETTINGTEMPLATE_LIST, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => {});
    auth.service.connected = true;
  });

  beforeEach(() => {
    vorpal = require('../../../../vorpal-init');
    log = [];
    cmdInstance = {
      commandWrapper: {
        command: command.name
      },
      action: command.action(),
      log: (msg: string) => {
        log.push(msg);
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
    (command as any).items = [];
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      request.get
    ]);
  });

  after(() => {
    Utils.restore([
      auth.restoreAuth,
      appInsights.trackEvent
    ]);
    auth.service.connected = false;
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.GROUPSETTINGTEMPLATE_LIST), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('lists group setting templates', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/groupSettingTemplates`) {
        return Promise.resolve({
          "value": [{"id":"62375ab9-6b52-47ed-826b-58e47e0e304b","deletedDateTime":null,"displayName":"Group.Unified","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for Unified Groups.\n      ","values":[{"name":"CustomBlockedWordsList","type":"System.String","defaultValue":"","description":"A comma-delimited list of blocked words for Unified Group displayName and mailNickName."},{"name":"EnableMSStandardBlockedWords","type":"System.Boolean","defaultValue":"false","description":"A flag indicating whether or not to enable the Microsoft Standard list of blocked words for Unified Group displayName and mailNickName."},{"name":"ClassificationDescriptions","type":"System.String","defaultValue":"","description":"A comma-delimited list of structured strings describing the classification values in the ClassificationList. The structure of the string is: Value: Description"},{"name":"DefaultClassification","type":"System.String","defaultValue":"","description":"The classification value to be used by default for Unified Group creation."},{"name":"PrefixSuffixNamingRequirement","type":"System.String","defaultValue":"","description":"A structured string describing how a Unified Group displayName and mailNickname should be structured. Please refer to docs to discover how to structure a valid requirement."},{"name":"AllowGuestsToBeGroupOwner","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if guests are allowed to be owner in any Unified Group."},{"name":"AllowGuestsToAccessGroups","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed to access any Unified Group resources."},{"name":"GuestUsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines for guests."},{"name":"GroupCreationAllowedGroupId","type":"System.Guid","defaultValue":"","description":"Guid of the security group that is always allowed to create Unified Groups."},{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in any Unified Group."},{"name":"UsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines."},{"name":"ClassificationList","type":"System.String","defaultValue":"","description":"A comma-delimited list of valid classification values that can be applied to Unified Groups."},{"name":"EnableGroupCreation","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if group creation feature is on."}]},{"id":"08d542b9-071f-4e16-94b0-74abb372e3d9","deletedDateTime":null,"displayName":"Group.Unified.Guest","description":"Settings for a specific Unified Group","values":[{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in a specific Unified Group."}]},{"id":"4bc7f740-180e-4586-adb6-38b2e9024e6b","deletedDateTime":null,"displayName":"Application","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide application behavior.\n      ","values":[{"name":"EnableAccessCheckForPrivilegedApplicationUpdates","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if access check for application privileged updates is turned on."}]},{"id":"898f1161-d651-43d1-805c-3b0b388a9fc2","deletedDateTime":null,"displayName":"Custom Policy Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide custom policy settings.\n      ","values":[{"name":"CustomConditionalAccessPolicyUrl","type":"System.String","defaultValue":"","description":"Custom conditional access policy url."}]},{"id":"5cf42378-d67d-4f36-ba46-e8b86229381d","deletedDateTime":null,"displayName":"Password Rule Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide password rule settings.\n      ","values":[{"name":"LockoutDurationInSeconds","type":"System.Int32","defaultValue":"60","description":"The duration in seconds of the initial lockout period."},{"name":"LockoutThreshold","type":"System.Int32","defaultValue":"10","description":"The number of failed login attempts before the first lockout period begins."},{"name":"BannedPasswordList","type":"System.String","defaultValue":"","description":"A tab-delimited banned password list."},{"name":"EnableBannedPasswordCheck","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if the banned password check is turned on."}]},{"id":"80661d51-be2f-4d46-9713-98a2fcaec5bc","deletedDateTime":null,"displayName":"Prohibited Names Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names settings.\n      ","values":[{"name":"CustomBlockedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to block for application display names."},{"name":"CustomBlockedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of reserved words to block for application display names."}]},{"id":"aad3907d-1d1a-448b-b3ef-7bf7f63db63b","deletedDateTime":null,"displayName":"Prohibited Names Restricted Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names restricted settings.\n      ","values":[{"name":"CustomAllowedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to allow for application display names."},{"name":"CustomAllowedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of whole reserved words to allow for application display names."},{"name":"DoNotValidateAgainstTrademark","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if prohibited names validation against trademark global list is disabled."}]}]});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([
          {
            "id": "62375ab9-6b52-47ed-826b-58e47e0e304b",
            "displayName": "Group.Unified"
          },
          {
            "id": "08d542b9-071f-4e16-94b0-74abb372e3d9",
            "displayName": "Group.Unified.Guest",
          },
          {
            "id": "4bc7f740-180e-4586-adb6-38b2e9024e6b",
            "displayName": "Application"
          },
          {
            "id": "898f1161-d651-43d1-805c-3b0b388a9fc2",
            "displayName": "Custom Policy Settings"
          },
          {
            "id": "5cf42378-d67d-4f36-ba46-e8b86229381d",
            "displayName": "Password Rule Settings"
          },
          {
            "id": "80661d51-be2f-4d46-9713-98a2fcaec5bc",
            "displayName": "Prohibited Names Settings"
          },
          {
            "id": "aad3907d-1d1a-448b-b3ef-7bf7f63db63b",
            "displayName": "Prohibited Names Restricted Settings"
          }
        ]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('lists group setting templates (debug)', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/groupSettingTemplates`) {
        return Promise.resolve({
          "value": [{"id":"62375ab9-6b52-47ed-826b-58e47e0e304b","deletedDateTime":null,"displayName":"Group.Unified","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for Unified Groups.\n      ","values":[{"name":"CustomBlockedWordsList","type":"System.String","defaultValue":"","description":"A comma-delimited list of blocked words for Unified Group displayName and mailNickName."},{"name":"EnableMSStandardBlockedWords","type":"System.Boolean","defaultValue":"false","description":"A flag indicating whether or not to enable the Microsoft Standard list of blocked words for Unified Group displayName and mailNickName."},{"name":"ClassificationDescriptions","type":"System.String","defaultValue":"","description":"A comma-delimited list of structured strings describing the classification values in the ClassificationList. The structure of the string is: Value: Description"},{"name":"DefaultClassification","type":"System.String","defaultValue":"","description":"The classification value to be used by default for Unified Group creation."},{"name":"PrefixSuffixNamingRequirement","type":"System.String","defaultValue":"","description":"A structured string describing how a Unified Group displayName and mailNickname should be structured. Please refer to docs to discover how to structure a valid requirement."},{"name":"AllowGuestsToBeGroupOwner","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if guests are allowed to be owner in any Unified Group."},{"name":"AllowGuestsToAccessGroups","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed to access any Unified Group resources."},{"name":"GuestUsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines for guests."},{"name":"GroupCreationAllowedGroupId","type":"System.Guid","defaultValue":"","description":"Guid of the security group that is always allowed to create Unified Groups."},{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in any Unified Group."},{"name":"UsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines."},{"name":"ClassificationList","type":"System.String","defaultValue":"","description":"A comma-delimited list of valid classification values that can be applied to Unified Groups."},{"name":"EnableGroupCreation","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if group creation feature is on."}]},{"id":"08d542b9-071f-4e16-94b0-74abb372e3d9","deletedDateTime":null,"displayName":"Group.Unified.Guest","description":"Settings for a specific Unified Group","values":[{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in a specific Unified Group."}]},{"id":"4bc7f740-180e-4586-adb6-38b2e9024e6b","deletedDateTime":null,"displayName":"Application","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide application behavior.\n      ","values":[{"name":"EnableAccessCheckForPrivilegedApplicationUpdates","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if access check for application privileged updates is turned on."}]},{"id":"898f1161-d651-43d1-805c-3b0b388a9fc2","deletedDateTime":null,"displayName":"Custom Policy Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide custom policy settings.\n      ","values":[{"name":"CustomConditionalAccessPolicyUrl","type":"System.String","defaultValue":"","description":"Custom conditional access policy url."}]},{"id":"5cf42378-d67d-4f36-ba46-e8b86229381d","deletedDateTime":null,"displayName":"Password Rule Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide password rule settings.\n      ","values":[{"name":"LockoutDurationInSeconds","type":"System.Int32","defaultValue":"60","description":"The duration in seconds of the initial lockout period."},{"name":"LockoutThreshold","type":"System.Int32","defaultValue":"10","description":"The number of failed login attempts before the first lockout period begins."},{"name":"BannedPasswordList","type":"System.String","defaultValue":"","description":"A tab-delimited banned password list."},{"name":"EnableBannedPasswordCheck","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if the banned password check is turned on."}]},{"id":"80661d51-be2f-4d46-9713-98a2fcaec5bc","deletedDateTime":null,"displayName":"Prohibited Names Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names settings.\n      ","values":[{"name":"CustomBlockedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to block for application display names."},{"name":"CustomBlockedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of reserved words to block for application display names."}]},{"id":"aad3907d-1d1a-448b-b3ef-7bf7f63db63b","deletedDateTime":null,"displayName":"Prohibited Names Restricted Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names restricted settings.\n      ","values":[{"name":"CustomAllowedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to allow for application display names."},{"name":"CustomAllowedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of whole reserved words to allow for application display names."},{"name":"DoNotValidateAgainstTrademark","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if prohibited names validation against trademark global list is disabled."}]}]});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([
          {
            "id": "62375ab9-6b52-47ed-826b-58e47e0e304b",
            "displayName": "Group.Unified"
          },
          {
            "id": "08d542b9-071f-4e16-94b0-74abb372e3d9",
            "displayName": "Group.Unified.Guest",
          },
          {
            "id": "4bc7f740-180e-4586-adb6-38b2e9024e6b",
            "displayName": "Application"
          },
          {
            "id": "898f1161-d651-43d1-805c-3b0b388a9fc2",
            "displayName": "Custom Policy Settings"
          },
          {
            "id": "5cf42378-d67d-4f36-ba46-e8b86229381d",
            "displayName": "Password Rule Settings"
          },
          {
            "id": "80661d51-be2f-4d46-9713-98a2fcaec5bc",
            "displayName": "Prohibited Names Settings"
          },
          {
            "id": "aad3907d-1d1a-448b-b3ef-7bf7f63db63b",
            "displayName": "Prohibited Names Restricted Settings"
          }
        ]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('includes all properties in output type json', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/groupSettingTemplates`) {
        return Promise.resolve({
          "value": [{"id":"62375ab9-6b52-47ed-826b-58e47e0e304b","deletedDateTime":null,"displayName":"Group.Unified","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for Unified Groups.\n      ","values":[{"name":"CustomBlockedWordsList","type":"System.String","defaultValue":"","description":"A comma-delimited list of blocked words for Unified Group displayName and mailNickName."},{"name":"EnableMSStandardBlockedWords","type":"System.Boolean","defaultValue":"false","description":"A flag indicating whether or not to enable the Microsoft Standard list of blocked words for Unified Group displayName and mailNickName."},{"name":"ClassificationDescriptions","type":"System.String","defaultValue":"","description":"A comma-delimited list of structured strings describing the classification values in the ClassificationList. The structure of the string is: Value: Description"},{"name":"DefaultClassification","type":"System.String","defaultValue":"","description":"The classification value to be used by default for Unified Group creation."},{"name":"PrefixSuffixNamingRequirement","type":"System.String","defaultValue":"","description":"A structured string describing how a Unified Group displayName and mailNickname should be structured. Please refer to docs to discover how to structure a valid requirement."},{"name":"AllowGuestsToBeGroupOwner","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if guests are allowed to be owner in any Unified Group."},{"name":"AllowGuestsToAccessGroups","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed to access any Unified Group resources."},{"name":"GuestUsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines for guests."},{"name":"GroupCreationAllowedGroupId","type":"System.Guid","defaultValue":"","description":"Guid of the security group that is always allowed to create Unified Groups."},{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in any Unified Group."},{"name":"UsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines."},{"name":"ClassificationList","type":"System.String","defaultValue":"","description":"A comma-delimited list of valid classification values that can be applied to Unified Groups."},{"name":"EnableGroupCreation","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if group creation feature is on."}]},{"id":"08d542b9-071f-4e16-94b0-74abb372e3d9","deletedDateTime":null,"displayName":"Group.Unified.Guest","description":"Settings for a specific Unified Group","values":[{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in a specific Unified Group."}]},{"id":"4bc7f740-180e-4586-adb6-38b2e9024e6b","deletedDateTime":null,"displayName":"Application","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide application behavior.\n      ","values":[{"name":"EnableAccessCheckForPrivilegedApplicationUpdates","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if access check for application privileged updates is turned on."}]},{"id":"898f1161-d651-43d1-805c-3b0b388a9fc2","deletedDateTime":null,"displayName":"Custom Policy Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide custom policy settings.\n      ","values":[{"name":"CustomConditionalAccessPolicyUrl","type":"System.String","defaultValue":"","description":"Custom conditional access policy url."}]},{"id":"5cf42378-d67d-4f36-ba46-e8b86229381d","deletedDateTime":null,"displayName":"Password Rule Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide password rule settings.\n      ","values":[{"name":"LockoutDurationInSeconds","type":"System.Int32","defaultValue":"60","description":"The duration in seconds of the initial lockout period."},{"name":"LockoutThreshold","type":"System.Int32","defaultValue":"10","description":"The number of failed login attempts before the first lockout period begins."},{"name":"BannedPasswordList","type":"System.String","defaultValue":"","description":"A tab-delimited banned password list."},{"name":"EnableBannedPasswordCheck","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if the banned password check is turned on."}]},{"id":"80661d51-be2f-4d46-9713-98a2fcaec5bc","deletedDateTime":null,"displayName":"Prohibited Names Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names settings.\n      ","values":[{"name":"CustomBlockedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to block for application display names."},{"name":"CustomBlockedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of reserved words to block for application display names."}]},{"id":"aad3907d-1d1a-448b-b3ef-7bf7f63db63b","deletedDateTime":null,"displayName":"Prohibited Names Restricted Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names restricted settings.\n      ","values":[{"name":"CustomAllowedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to allow for application display names."},{"name":"CustomAllowedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of whole reserved words to allow for application display names."},{"name":"DoNotValidateAgainstTrademark","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if prohibited names validation against trademark global list is disabled."}]}]});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, output: 'json' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([{"id":"62375ab9-6b52-47ed-826b-58e47e0e304b","deletedDateTime":null,"displayName":"Group.Unified","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for Unified Groups.\n      ","values":[{"name":"CustomBlockedWordsList","type":"System.String","defaultValue":"","description":"A comma-delimited list of blocked words for Unified Group displayName and mailNickName."},{"name":"EnableMSStandardBlockedWords","type":"System.Boolean","defaultValue":"false","description":"A flag indicating whether or not to enable the Microsoft Standard list of blocked words for Unified Group displayName and mailNickName."},{"name":"ClassificationDescriptions","type":"System.String","defaultValue":"","description":"A comma-delimited list of structured strings describing the classification values in the ClassificationList. The structure of the string is: Value: Description"},{"name":"DefaultClassification","type":"System.String","defaultValue":"","description":"The classification value to be used by default for Unified Group creation."},{"name":"PrefixSuffixNamingRequirement","type":"System.String","defaultValue":"","description":"A structured string describing how a Unified Group displayName and mailNickname should be structured. Please refer to docs to discover how to structure a valid requirement."},{"name":"AllowGuestsToBeGroupOwner","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if guests are allowed to be owner in any Unified Group."},{"name":"AllowGuestsToAccessGroups","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed to access any Unified Group resources."},{"name":"GuestUsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines for guests."},{"name":"GroupCreationAllowedGroupId","type":"System.Guid","defaultValue":"","description":"Guid of the security group that is always allowed to create Unified Groups."},{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in any Unified Group."},{"name":"UsageGuidelinesUrl","type":"System.String","defaultValue":"","description":"A link to the Group Usage Guidelines."},{"name":"ClassificationList","type":"System.String","defaultValue":"","description":"A comma-delimited list of valid classification values that can be applied to Unified Groups."},{"name":"EnableGroupCreation","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if group creation feature is on."}]},{"id":"08d542b9-071f-4e16-94b0-74abb372e3d9","deletedDateTime":null,"displayName":"Group.Unified.Guest","description":"Settings for a specific Unified Group","values":[{"name":"AllowToAddGuests","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if guests are allowed in a specific Unified Group."}]},{"id":"4bc7f740-180e-4586-adb6-38b2e9024e6b","deletedDateTime":null,"displayName":"Application","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide application behavior.\n      ","values":[{"name":"EnableAccessCheckForPrivilegedApplicationUpdates","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if access check for application privileged updates is turned on."}]},{"id":"898f1161-d651-43d1-805c-3b0b388a9fc2","deletedDateTime":null,"displayName":"Custom Policy Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide custom policy settings.\n      ","values":[{"name":"CustomConditionalAccessPolicyUrl","type":"System.String","defaultValue":"","description":"Custom conditional access policy url."}]},{"id":"5cf42378-d67d-4f36-ba46-e8b86229381d","deletedDateTime":null,"displayName":"Password Rule Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide password rule settings.\n      ","values":[{"name":"LockoutDurationInSeconds","type":"System.Int32","defaultValue":"60","description":"The duration in seconds of the initial lockout period."},{"name":"LockoutThreshold","type":"System.Int32","defaultValue":"10","description":"The number of failed login attempts before the first lockout period begins."},{"name":"BannedPasswordList","type":"System.String","defaultValue":"","description":"A tab-delimited banned password list."},{"name":"EnableBannedPasswordCheck","type":"System.Boolean","defaultValue":"true","description":"Flag indicating if the banned password check is turned on."}]},{"id":"80661d51-be2f-4d46-9713-98a2fcaec5bc","deletedDateTime":null,"displayName":"Prohibited Names Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names settings.\n      ","values":[{"name":"CustomBlockedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to block for application display names."},{"name":"CustomBlockedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of reserved words to block for application display names."}]},{"id":"aad3907d-1d1a-448b-b3ef-7bf7f63db63b","deletedDateTime":null,"displayName":"Prohibited Names Restricted Settings","description":"\n        Setting templates define the different settings that can be used for the associated ObjectSettings. This template defines\n        settings that can be used for managing tenant-wide prohibited names restricted settings.\n      ","values":[{"name":"CustomAllowedSubStringsList","type":"System.String","defaultValue":"","description":"A comma delimited list of substring reserved words to allow for application display names."},{"name":"CustomAllowedWholeWordsList","type":"System.String","defaultValue":"","description":"A comma delimited list of whole reserved words to allow for application display names."},{"name":"DoNotValidateAgainstTrademark","type":"System.Boolean","defaultValue":"false","description":"Flag indicating if prohibited names validation against trademark global list is disabled."}]}]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('handles error correctly', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      return Promise.reject('An error has occurred');
    });

    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('supports debug mode', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option === '--debug') {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('has help referring to the right command', () => {
    const cmd: any = {
      log: (msg: string) => { },
      prompt: () => { },
      helpInformation: () => { }
    };
    const find = sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => { });
    assert(find.calledWith(commands.GROUPSETTINGTEMPLATE_LIST));
  });

  it('has help with examples', () => {
    const _log: string[] = [];
    const cmd: any = {
      log: (msg: string) => {
        _log.push(msg);
      },
      prompt: () => { },
      helpInformation: () => { }
    };
    sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => { });
    let containsExamples: boolean = false;
    _log.forEach(l => {
      if (l && l.indexOf('Examples:') > -1) {
        containsExamples = true;
      }
    });
    Utils.restore(vorpal.find);
    assert(containsExamples);
  });
});