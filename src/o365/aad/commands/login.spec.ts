import commands from '../commands';
import Command, { CommandCancel, CommandError, CommandOption, CommandValidate } from '../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../appInsights';
import auth from '../AadAuth';
const command: Command = require('./login');
import * as assert from 'assert';
import * as request from 'request-promise-native';
import Utils from '../../../Utils';
import { Service, AuthType } from '../../../Auth';
import * as fs from 'fs';

describe(commands.LOGIN, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    sinon.stub(auth, 'clearConnectionInfo').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'storeConnectionInfo').callsFake(() => Promise.resolve());
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });
  });

  beforeEach(() => {
    vorpal = require('../../../vorpal-init');
    log = [];
    cmdInstance = {
      commandWrapper: {
        command: 'aad login'
      },
      log: (msg: string) => {
        log.push(msg);
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
    auth.service = new Service('https://graph.windows.net');
    sinon.stub(auth.service, 'logout').callsFake(() => { });
    telemetry = null;
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      auth.cancel,
      fs.existsSync,
      fs.readFileSync
    ]);
  });

  after(() => {
    Utils.restore([
      appInsights.trackEvent,
      auth.ensureAccessToken,
      auth.restoreAuth,
      auth.clearConnectionInfo,
      auth.storeConnectionInfo,
      request.post
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.LOGIN), true);
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
        assert.equal(telemetry.name, command.name);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs in to AAD Graph', (done) => {
    auth.service = new Service('https://graph.windows.net');
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false } }, () => {
      try {
        assert(auth.service.connected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs in to AAD Graph (debug)', (done) => {
    auth.service = new Service('https://graph.windows.net');
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(auth.service.connected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs in to AAD Graph using username and password when authType password set', (done) => {
    auth.service = new Service('https://graph.windows.net');
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, authType: 'password', userName: 'user', password: 'password' } }, () => {
      try {
        assert.equal(auth.service.authType, AuthType.Password, 'Incorrect authType set');
        assert.equal(auth.service.userName, 'user', 'Incorrect user name set');
        assert.equal(auth.service.password, 'password', 'Incorrect password set');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('logs in to AAD Graph using certificate when authType certificate set', (done) => {
    sinon.stub(fs, 'readFileSync').callsFake(() => 'certificate');

    auth.service = new Service('https://graph.windows.net');
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, authType: 'certificate', certificateFile: 'certificateFile', thumbprint: 'thumbprint' } }, () => {
      try {
        assert.equal(auth.service.authType, AuthType.Certificate, 'Incorrect authType set');
        assert.equal(auth.service.certificate, 'certificate', 'Incorrect certificate set');
        assert.equal(auth.service.thumbprint, 'thumbprint', 'Incorrect thumbprint set');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('can be cancelled', () => {
    assert(command.cancel());
  });

  it('clears pending connection on cancel', () => {
    const authCancelStub = sinon.stub(auth, 'cancel').callsFake(() => {});
    (command.cancel() as CommandCancel)();
    assert(authCancelStub.called);
  });

  it('supports specifying authType', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--authType') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying userName', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--userName') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying password', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--password') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('fails validation if authType is set to password and userName and password not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'password' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if authType is set to password and userName not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'password', password: 'password' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if authType is set to password and password not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'password', userName: 'user' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if authType is set to certificate and certificateFile not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'certificate', thumbprint: 'thumbprint' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if authType is set to certificate and certificateFile does not exist', () => {
    sinon.stub(fs, 'existsSync').callsFake(() => false);
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'certificate', certificateFile: 'certificate', thumbprint: 'thumbprint' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if authType is set to certificate and thumbprint not specified', () => {
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'certificate', certificateFile: 'certificate' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if authType is set to password and userName and password specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'password', userName: 'user', password: 'password' } });
    assert.equal(actual, true);
  });

  it('passes validation if authType is set to deviceCode and userName and password not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'deviceCode' } });
    assert.equal(actual, true);
  });

  it('passes validation if authType is not set and userName and password not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { } });
    assert.equal(actual, true);
  });

  it('passes validation if authType is set to certificate and certificateFile and thumbprint are specified', () => {
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    const actual = (command.validate() as CommandValidate)({ options: { authType: 'certificate', certificateFile: 'certificate', thumbprint: 'thumbprint' } });
    assert.equal(actual, true);
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
    assert(find.calledWith(commands.LOGIN));
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

  it('correctly handles lack of valid access token when logging in to AAD Graph', (done) => {
    Utils.restore(auth.ensureAccessToken);
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.reject('Error getting access token'); });
    auth.service = new Service('https://graph.windows.net');
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(new CommandError('Error getting access token')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles lack of valid access token when logging in to AAD Graph (debug)', (done) => {
    Utils.restore(auth.ensureAccessToken);
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.reject('Error getting access token'); });
    auth.service = new Service('https://graph.windows.net');
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(new CommandError('Error getting access token')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore(auth.ensureAccessToken);
      }
    });
  });

  it('ignores the error raised by cancelling device code auth flow', (done) => {
    Utils.restore(auth.ensureAccessToken);
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.reject('Polling_Request_Cancelled'); });
    auth.service = new Service('https://graph.windows.net');
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {} }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore(auth.ensureAccessToken);
      }
    });
  });

  it('correctly handles error when clearing persisted auth information', (done) => {
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => Promise.resolve('ABC'));
    Utils.restore(auth.clearConnectionInfo);
    sinon.stub(auth, 'clearConnectionInfo').callsFake(() => Promise.reject('An error has occurred'));
    cmdInstance.action = command.action();
    cmdInstance.action({ options: {}, url: 'https://contoso-admin.sharepoint.com' }, () => {
      try {
        
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          auth.clearConnectionInfo,
          auth.ensureAccessToken
        ]);
      }
    });
  });

  it('correctly handles error when clearing persisted auth information (debug)', (done) => {
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => Promise.resolve('ABC'));
    Utils.restore(auth.clearConnectionInfo);
    sinon.stub(auth, 'clearConnectionInfo').callsFake(() => Promise.reject('An error has occurred'));
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true }, url: 'https://contoso-admin.sharepoint.com' }, () => {
      try {
        
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          auth.clearConnectionInfo,
          auth.ensureAccessToken
        ]);
      }
    });
  });
});