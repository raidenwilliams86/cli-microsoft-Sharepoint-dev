import commands from '../../commands';
import Command, { CommandOption, CommandValidate, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../../../Auth';
const command: Command = require('./environment-get');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';

describe(commands.FLOW_ENVIRONMENT_GET, () => {
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
    assert.equal(command.name.startsWith(commands.FLOW_ENVIRONMENT_GET), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('retrieves information about the specified environment (debug)', (done) => {
    const env: any = {"name":"Default-d87a7535-dd31-4437-bfe1-95340acd55c5","location":"europe","type":"Microsoft.ProcessSimple/environments","id":"/providers/Microsoft.ProcessSimple/environments/Default-d87a7535-dd31-4437-bfe1-95340acd55c5","properties":{"displayName":"Contoso (default)","createdTime":"2018-03-22T20:20:46.08653Z","createdBy":{"id":"SYSTEM","displayName":"SYSTEM","type":"NotSpecified"},"provisioningState":"Succeeded","creationType":"DefaultTenant","environmentSku":"Default","environmentType":"Production","isDefault":true,"azureRegionHint":"westeurope","runtimeEndpoints":{"microsoft.BusinessAppPlatform":"https://europe.api.bap.microsoft.com","microsoft.CommonDataModel":"https://europe.api.cds.microsoft.com","microsoft.PowerApps":"https://europe.api.powerapps.com","microsoft.Flow":"https://europe.api.flow.microsoft.com"}}};

    sinon.stub(request, 'get').callsFake((opts) => {
      if ((opts.url as string).indexOf(`providers/Microsoft.ProcessSimple/environments/Default-d87a7535-dd31-4437-bfe1-95340acd55c5?api-version=2016-11-01`) > -1) {
        if (opts.headers &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve(env);
        }
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: true, name: 'Default-d87a7535-dd31-4437-bfe1-95340acd55c5' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(env));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('retrieves information about the specified environment', (done) => {
    const env: any = {"name":"Default-d87a7535-dd31-4437-bfe1-95340acd55c5","location":"europe","type":"Microsoft.ProcessSimple/environments","id":"/providers/Microsoft.ProcessSimple/environments/Default-d87a7535-dd31-4437-bfe1-95340acd55c5","properties":{"displayName":"Contoso (default)","createdTime":"2018-03-22T20:20:46.08653Z","createdBy":{"id":"SYSTEM","displayName":"SYSTEM","type":"NotSpecified"},"provisioningState":"Succeeded","creationType":"DefaultTenant","environmentSku":"Default","environmentType":"Production","isDefault":true,"azureRegionHint":"westeurope","runtimeEndpoints":{"microsoft.BusinessAppPlatform":"https://europe.api.bap.microsoft.com","microsoft.CommonDataModel":"https://europe.api.cds.microsoft.com","microsoft.PowerApps":"https://europe.api.powerapps.com","microsoft.Flow":"https://europe.api.flow.microsoft.com"}}};

    sinon.stub(request, 'get').callsFake((opts) => {
      if ((opts.url as string).indexOf(`providers/Microsoft.ProcessSimple/environments/Default-d87a7535-dd31-4437-bfe1-95340acd55c5?api-version=2016-11-01`) > -1) {
        if (opts.headers &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0) {
          return Promise.resolve(env);
        }
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, name: 'Default-d87a7535-dd31-4437-bfe1-95340acd55c5' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(env));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles no environment found', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      return Promise.reject({
        "error": {
          "code": "EnvironmentAccessDenied",
          "message": "Access to the environment 'Default-d87a7535-dd31-4437-bfe1-95340acd55c6' is denied."
        }
      });
    });

    cmdInstance.action({ options: { debug: false, name: 'Default-d87a7535-dd31-4437-bfe1-95340acd55c6' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`Access to the environment 'Default-d87a7535-dd31-4437-bfe1-95340acd55c6' is denied.`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles API OData error', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      return Promise.reject({
        error: {
          'odata.error': {
            code: '-1, InvalidOperationException',
            message: {
              value: 'An error has occurred'
            }
          }
        }
      });
    });

    cmdInstance.action({ options: { debug: false, name: 'Default-d87a7535-dd31-4437-bfe1-95340acd55c5' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('fails validation if the name is not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: {} });
    assert.notEqual(actual, true);
  });

  it('passes validation when the name option specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { name: 'Default-d87a7535-dd31-4437-bfe1-95340acd55c5' } });
    assert.equal(actual, true);
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

  it('supports specifying name', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--name') > -1) {
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
    assert(find.calledWith(commands.FLOW_ENVIRONMENT_GET));
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