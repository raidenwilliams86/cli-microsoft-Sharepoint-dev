import commands from '../../commands';
import Command from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../../../Auth';
const command: Command = require('./report-activityfilecounts');
import * as assert from 'assert';
import Utils from '../../../../Utils';
import request from '../../../../request';

describe(commands.REPORT_ACTIVITYFILECOUNTS, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => { });
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
      appInsights.trackEvent,
      auth.restoreAuth
    ]);
    auth.service.connected = false;
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.REPORT_ACTIVITYFILECOUNTS), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('gets the report for the last week', (done) => {
    const requestStub: sinon.SinonStub = sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/reports/getSharePointActivityFileCounts(period='D7')`) {
        return Promise.resolve(`
          Report Refresh Date,Viewed Or Edited,Synced,Shared Internally,Shared Externally,Report Date,Report Period`
        );
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, period: 'D7' } }, () => {
      try {
        assert.equal(requestStub.lastCall.args[0].url, "https://graph.microsoft.com/v1.0/reports/getSharePointActivityFileCounts(period='D7')");
        assert.equal(requestStub.lastCall.args[0].headers["accept"], 'application/json;odata.metadata=none');
        assert.equal(requestStub.lastCall.args[0].json, true);
        done();
      }
      catch (e) {
        done(e);
      }
    });
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
    assert(find.calledWith(commands.REPORT_ACTIVITYFILECOUNTS));
  });
});