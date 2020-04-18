import commands from '../../commands';
import Command, { CommandOption, CommandValidate, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
const command: Command = require('./sitedesign-rights-list');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';
import auth from '../../../../Auth';

describe(commands.SITEDESIGN_RIGHTS_LIST, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => {});
    sinon.stub(command as any, 'getRequestDigest').callsFake(() => Promise.resolve({ FormDigestValue: 'ABC' }));
    auth.service.connected = true;
    auth.service.spoUrl = 'https://contoso.sharepoint.com';
  });

  beforeEach(() => {
    vorpal = require('../../../../vorpal-init');
    log = [];
    cmdInstance = {
      commandWrapper: {
        command: command.name
      },
      action: command.action(),
      log: (msg: any) => {
        log.push(msg);
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      request.post
    ]);
  });

  after(() => {
    Utils.restore([
      auth.restoreAuth,
      (command as any).getRequestDigest,
      appInsights.trackEvent
    ]);
    auth.service.connected = false;
    auth.service.spoUrl = undefined;
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.SITEDESIGN_RIGHTS_LIST), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('gets information about permissions granted for the specified site design', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/Microsoft.Sharepoint.Utilities.WebTemplateExtensions.SiteScriptUtility.GetSiteDesignRights`) > -1 &&
        JSON.stringify(opts.body) === JSON.stringify({
          id: '0f27a016-d277-4bb4-b3c3-b5b040c9559b'
        })) {
        return Promise.resolve({
          "value": [
            {
              "DisplayName": "MOD Administrator",
              "PrincipalName": "i:0#.f|membership|admin@contoso.onmicrosoft.com",
              "Rights": "1"
            },
            {
              "DisplayName": "Patti Fernandez",
              "PrincipalName": "i:0#.f|membership|pattif@contoso.onmicrosoft.com",
              "Rights": "1"
            }
          ]
        }
        );
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, id: '0f27a016-d277-4bb4-b3c3-b5b040c9559b' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([
          {
            "DisplayName": "MOD Administrator",
            "PrincipalName": "i:0#.f|membership|admin@contoso.onmicrosoft.com",
            "Rights": "View"
          },
          {
            "DisplayName": "Patti Fernandez",
            "PrincipalName": "i:0#.f|membership|pattif@contoso.onmicrosoft.com",
            "Rights": "View"
          }
        ]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('gets information about permissions granted for the specified site design (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/Microsoft.Sharepoint.Utilities.WebTemplateExtensions.SiteScriptUtility.GetSiteDesignRights`) > -1 &&
        JSON.stringify(opts.body) === JSON.stringify({
          id: '0f27a016-d277-4bb4-b3c3-b5b040c9559b'
        })) {
        return Promise.resolve({
          "value": [
            {
              "DisplayName": "MOD Administrator",
              "PrincipalName": "i:0#.f|membership|admin@contoso.onmicrosoft.com",
              "Rights": "1"
            },
            {
              "DisplayName": "Patti Fernandez",
              "PrincipalName": "i:0#.f|membership|pattif@contoso.onmicrosoft.com",
              "Rights": "1"
            }
          ]
        }
        );
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: true, id: '0f27a016-d277-4bb4-b3c3-b5b040c9559b' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([
          {
            "DisplayName": "MOD Administrator",
            "PrincipalName": "i:0#.f|membership|admin@contoso.onmicrosoft.com",
            "Rights": "View"
          },
          {
            "DisplayName": "Patti Fernandez",
            "PrincipalName": "i:0#.f|membership|pattif@contoso.onmicrosoft.com",
            "Rights": "View"
          }
        ]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('returns original value for unknown permissions', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/Microsoft.Sharepoint.Utilities.WebTemplateExtensions.SiteScriptUtility.GetSiteDesignRights`) > -1 &&
        JSON.stringify(opts.body) === JSON.stringify({
          id: '0f27a016-d277-4bb4-b3c3-b5b040c9559b'
        })) {
        return Promise.resolve({
          "value": [
            {
              "DisplayName": "MOD Administrator",
              "PrincipalName": "i:0#.f|membership|admin@contoso.onmicrosoft.com",
              "Rights": "1"
            },
            {
              "DisplayName": "Patti Fernandez",
              "PrincipalName": "i:0#.f|membership|pattif@contoso.onmicrosoft.com",
              "Rights": "2"
            }
          ]
        }
        );
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, id: '0f27a016-d277-4bb4-b3c3-b5b040c9559b' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith([
          {
            "DisplayName": "MOD Administrator",
            "PrincipalName": "i:0#.f|membership|admin@contoso.onmicrosoft.com",
            "Rights": "View"
          },
          {
            "DisplayName": "Patti Fernandez",
            "PrincipalName": "i:0#.f|membership|pattif@contoso.onmicrosoft.com",
            "Rights": "2"
          }
        ]));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles error when site script not found', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      return Promise.reject({ error: { 'odata.error': { message: { value: 'File Not Found.' } } } });
    });

    cmdInstance.action({ options: { debug: false, id: '0f27a016-d277-4bb4-b3c3-b5b040c9559b' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('File Not Found.')));
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

  it('supports specifying id', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--id') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('fails validation if id not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: {} });
    assert.notEqual(actual, true);
  });

  it('fails validation if the id is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { id: 'abc' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when the id is a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { id: '2c1ba4c4-cd9b-4417-832f-92a34bc34b2a' } });
    assert.equal(actual, true);
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
    assert(find.calledWith(commands.SITEDESIGN_RIGHTS_LIST));
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