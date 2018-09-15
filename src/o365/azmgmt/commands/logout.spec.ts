import commands from '../commands';
import Command from '../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../appInsights';
import auth from '../AzmgmtAuth';
const command: Command = require('./logout');
import * as assert from 'assert';
import Utils from '../../../Utils';
import { Service } from '../../../Auth';

describe(commands.LOGOUT, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let trackEvent: any;
  let telemetry: any;
  let authClearConnectionInfoStub: sinon.SinonStub;

  before(() => {
    authClearConnectionInfoStub = sinon.stub(auth, 'clearConnectionInfo').callsFake(() => Promise.resolve());
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });
  });

  beforeEach(() => {
    vorpal = require('../../../vorpal-init');
    log = [];
    cmdInstance = {
      commandWrapper: {
        command: 'azmgmt logout'
      },
      log: (msg: string) => {
        log.push(msg);
      }
    };
    auth.service = new Service('https://management.azure.com/');
    sinon.stub(auth.service, 'logout').callsFake(() => { });
    telemetry = null;
  });

  afterEach(() => {
    Utils.restore(vorpal.find);
  });

  after(() => {
    Utils.restore(appInsights.trackEvent);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.LOGOUT), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('calls telemetry', (done) => {
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {} }, () => {
      try {
        assert(trackEvent.called);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs correct telemetry event', (done) => {
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {} }, () => {
      try {
        assert.equal(telemetry.name, commands.LOGOUT);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs out from Azure Management Service when logged in', (done) => {
    auth.service = new Service('https://management.azure.com/');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(!auth.service.connected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs out from Azure Management Service when not logged in', (done) => {
    auth.service = new Service('https://management.azure.com/');
    auth.service.connected = false;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(!auth.service.connected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('clears persisted connection info when logging out', (done) => {
    auth.service = new Service('https://management.azure.com/');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(authClearConnectionInfoStub.called);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('defines alias', () => {
    const alias = command.alias();
    assert.notEqual(typeof alias, 'undefined');
  });

  it('has help referring to the right command', () => {
    const cmd: any = {
      log: (msg: string) => {},
      prompt: () => {},
      helpInformation: () => {}
    };
    const find = sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => {});
    assert(find.calledWith(commands.LOGOUT));
  });

  it('has help with examples', () => {
    const _log: string[] = [];
    const cmd: any = {
      log: (msg: string) => {
        _log.push(msg);
      },
      prompt: () => {},
      helpInformation: () => {}
    };
    sinon.stub(vorpal, 'find').callsFake(() => cmd);
    cmd.help = command.help();
    cmd.help({}, () => {});
    let containsExamples: boolean = false;
    _log.forEach(l => {
      if (l && l.indexOf('Examples:') > -1) {
        containsExamples = true;
      }
    });
    Utils.restore(vorpal.find);
    assert(containsExamples);
  });

  it('correctly handles error while clearing persisted connection info', (done) => {
    Utils.restore(auth.clearConnectionInfo);
    sinon.stub(auth, 'clearConnectionInfo').callsFake(() => Promise.reject('An error has occurred'));
    auth.service = new Service('https://management.azure.com/');
    const logoutSpy = sinon.spy(auth.service, 'logout');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false } }, () => {
      try {
        assert(logoutSpy.called);
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore(auth.clearConnectionInfo);
      }
    });
  });

  it('correctly handles error while clearing persisted connection info (debug)', (done) => {
    sinon.stub(auth, 'clearConnectionInfo').callsFake(() => Promise.reject('An error has occurred'));
    auth.service = new Service('https://management.azure.com/');
    const logoutSpy = sinon.spy(auth.service, 'logout');
    auth.service.connected = true;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(logoutSpy.called);
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore(auth.clearConnectionInfo);
      }
    });
  });
});