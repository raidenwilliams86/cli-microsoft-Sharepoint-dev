import commands from '../../commands';
import Command, { CommandOption, CommandValidate, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../../../Auth';
const command: Command = require('./hubsite-unregister');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';

describe(commands.HUBSITE_UNREGISTER, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let requests: any[];
  let promptOptions: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => {});
    sinon.stub(command as any, 'getRequestDigest').callsFake(() => Promise.resolve({ FormDigestValue: 'ABC' }));
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
      },
      prompt: (options: any, cb: (result: { continue: boolean }) => void) => {
        promptOptions = options;
        cb({ continue: false });
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
    requests = [];
    promptOptions = undefined;
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
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.HUBSITE_UNREGISTER), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('unregisters the specified hub site without prompting with confirmation argument (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url === 'https://contoso.sharepoint.com/sites/sales/_api/site/UnregisterHubSite' &&
        opts.headers &&
        opts.headers.accept &&
        opts.headers.accept.indexOf('application/json') === 0) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: true, url: 'https://contoso.sharepoint.com/sites/sales', confirm: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('unregisters the specified hub site without prompting with confirmation argument', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url === 'https://contoso.sharepoint.com/sites/sales/_api/site/UnregisterHubSite' &&
        opts.headers &&
        opts.headers.accept &&
        opts.headers.accept.indexOf('application/json') === 0) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/sales', confirm: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('prompts before unregistering the hub site when confirmation argument not passed', (done) => {
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/sales' } }, () => {
      let promptIssued = false;

      if (promptOptions && promptOptions.type === 'confirm') {
        promptIssued = true;
      }

      try {
        assert(promptIssued);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts unregistering hub site when prompt not confirmed', (done) => {
    cmdInstance.prompt = (options: any, cb: (result: { continue: boolean }) => void) => {
      cb({ continue: false });
    };
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/sales' } }, () => {
      try {
        assert(requests.length === 0);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('unregisters hub site when prompt confirmed', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url === 'https://contoso.sharepoint.com/sites/sales/_api/site/UnregisterHubSite' &&
        opts.headers &&
        opts.headers.accept &&
        opts.headers.accept.indexOf('application/json') === 0) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.prompt = (options: any, cb: (result: { continue: boolean }) => void) => {
      cb({ continue: true });
    };
    cmdInstance.action({ options: { debug: true, url: 'https://contoso.sharepoint.com/sites/sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles failure when the specified site is not a hub site', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/sales/_api/site/UnregisterHubSite') {
        return Promise.reject({
          error: {
            "odata.error": {
              "code": "-2147024809, System.ArgumentException",
              "message": {
                "lang": "en-US",
                "value": "hubSiteId"
              }
            }
          }
        });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/sales', confirm: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError("hubSiteId")));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('fails validation if the url option not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { } });
    assert.notEqual(actual, true);
  });

  it('fails validation if the url option is not a valid SharePoint site URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'foo' } });
    assert.notEqual(actual, true);
  });

  it('passes validation when the url is a valid SharePoint URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com' } });
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

  it('has help referring to the right command', () => {
    const cmd: any = {
      log: (msg: string) => { },
      prompt: () => { },
      helpInformation: () => { }
    };
    const find = sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => { });
    assert(find.calledWith(commands.HUBSITE_UNREGISTER));
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