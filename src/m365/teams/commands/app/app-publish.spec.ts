import * as sinon from 'sinon';
import * as assert from 'assert';
import appInsights from '../../../../appInsights';
import request from '../../../../request';
import * as fs from 'fs';
import commands from '../../commands';
import Command, { CommandOption, CommandError, CommandValidate } from '../../../../Command';
import auth from '../../../../Auth';
const command: Command = require('./app-publish');
import Utils from '../../../../Utils';
import * as chalk from 'chalk';

describe(commands.TEAMS_APP_PUBLISH, () => {
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => {});
    auth.service.connected = true;
  });

  beforeEach(() => {
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
      request.post,
      fs.readFileSync,
      fs.existsSync
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
    assert.strictEqual(command.name.startsWith(commands.TEAMS_APP_PUBLISH), true);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('fails validation if the filePath does not exist', (done) => {
    sinon.stub(fs, 'existsSync').callsFake(() => false);
    const actual = (command.validate() as CommandValidate)({
      options: { filePath: 'invalid.zip' }
    });
    assert.notStrictEqual(actual, true);
    done();
  });

  it('fails validation if the filePath points to a directory', (done) => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => true);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({
      options: { filePath: './' }
    });
    Utils.restore([
      fs.lstatSync
    ]);
    assert.notStrictEqual(actual, true);
    done();
  });

  it('validates for a correct input.', (done) => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({
      options: {
        filePath: 'teamsapp.zip'
      }
    });
    Utils.restore([
      fs.lstatSync
    ]);
    assert.strictEqual(actual, true);
    done();
  });

  it('adds new Teams app to the tenant app catalog', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/appCatalogs/teamsApps`) {
        return Promise.resolve({
          "id": "e3e29acb-8c79-412b-b746-e6c39ff4cd22",
          "externalId": "b5561ec9-8cab-4aa3-8aa2-d8d7172e4311",
          "name": "Test App",
          "version": "1.0.0",
          "distributionMethod": "organization"
        });
      }

      return Promise.reject('Invalid request');
    });

    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, filePath: 'teamsapp.zip' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith("e3e29acb-8c79-412b-b746-e6c39ff4cd22"));
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('adds new Teams app to the tenant app catalog (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/appCatalogs/teamsApps`) {
        return Promise.resolve({
          "id": "e3e29acb-8c79-412b-b746-e6c39ff4cd22",
          "externalId": "b5561ec9-8cab-4aa3-8aa2-d8d7172e4311",
          "name": "Test App",
          "version": "1.0.0",
          "distributionMethod": "organization"
        });
      }

      return Promise.reject('Invalid request');
    });

    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'teamsapp.zip' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith("e3e29acb-8c79-412b-b746-e6c39ff4cd22"));
        assert(cmdInstanceLogSpy.calledWith(chalk.green('DONE')));

        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles error when publishing an app', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      return Promise.reject('An error has occurred');
    });

    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, filePath: 'teamsapp.zip' } }, (err?: any) => {
      try {
        assert.strictEqual(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      } catch (e) {
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
});