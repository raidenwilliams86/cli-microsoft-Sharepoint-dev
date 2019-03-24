import commands from '../../commands';
import Command, { CommandOption, CommandValidate, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth, { Site } from '../../SpoAuth';
const command: Command = require('./app-add');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';
import * as fs from 'fs';

describe(commands.APP_ADD, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;
  let requests: any[];

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });
  });

  beforeEach(() => {
    vorpal = require('../../../../vorpal-init');
    log = [];
    cmdInstance = {
      log: (msg: string) => {
        log.push(msg);
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
    auth.site = new Site();
    telemetry = null;
    requests = [];
    sinon.stub(request, 'get').resolves({ "CorporateCatalogUrl": "https://contoso.sharepoint.com/sites/apps" });
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      request.post,
      request.get,
      fs.readFileSync
    ]);
  });

  after(() => {
    Utils.restore([
      appInsights.trackEvent,
      auth.ensureAccessToken,
      auth.getAccessToken,
      auth.restoreAuth
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.APP_ADD), true);
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
        assert.equal(telemetry.name, commands.APP_ADD);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('aborts when not logged in to a SharePoint site', (done) => {
    auth.site = new Site();
    auth.site.connected = false;
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Log in to a SharePoint Online site first')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('adds new app to the tenant app catalog', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {

      if (opts.url.indexOf(`/_api/web/tenantappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.resolve('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}');
        }
      }

      return Promise.reject('Invalid request');
    });

    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, filePath: 'spfx.sppkg' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith('bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e'));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('adds new app to the tenant app catalog (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/tenantappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.resolve('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg' } }, () => {
      let correctRequestIssued = false;
      requests.forEach(r => {
        if (r.url.indexOf(`/_api/web/tenantappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1 &&
          r.headers.authorization &&
          r.headers.authorization.indexOf('Bearer ') === 0 &&
          r.headers.accept &&
          r.headers.accept.indexOf('application/json') === 0 &&
          r.headers.binaryStringRequestBody &&
          r.body) {
          correctRequestIssued = true;
        }
      });

      try {
        assert(correctRequestIssued);
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('adds new app to a site app catalog (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/sitecollectionappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.resolve('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg', scope: 'sitecollection', appCatalogUrl: 'https://contoso.sharepoint.com' } }, () => {
      let correctRequestIssued = false;
      requests.forEach(r => {
        if (r.url.indexOf(`/_api/web/sitecollectionappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1 &&
          r.headers.authorization &&
          r.headers.authorization.indexOf('Bearer ') === 0 &&
          r.headers.accept &&
          r.headers.accept.indexOf('application/json') === 0 &&
          r.headers.binaryStringRequestBody &&
          r.body) {
          correctRequestIssued = true;
        }
      });

      try {
        assert(correctRequestIssued);
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('returns all info about the added app in the JSON output mode', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/tenantappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.resolve('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, filePath: 'spfx.sppkg', output: 'json' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(JSON.parse('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('correctly handles failure when the app already exists in the tenant app catalog', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/tenantappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.reject({
            error: JSON.stringify({ "odata.error": { "code": "-2130575257, Microsoft.SharePoint.SPException", "message": { "lang": "en-US", "value": "A file with the name AppCatalog/spfx.sppkg already exists. It was last modified by i:0#.f|membership|admin@contoso.onmi on 24 Nov 2017 12:50:43 -0800." } } })
          });
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('A file with the name AppCatalog/spfx.sppkg already exists. It was last modified by i:0#.f|membership|admin@contoso.onmi on 24 Nov 2017 12:50:43 -0800.')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('correctly handles failure when the app already exists in the site app catalog', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/sitecollectionappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.reject({
            error: JSON.stringify({ "odata.error": { "code": "-2130575257, Microsoft.SharePoint.SPException", "message": { "lang": "en-US", "value": "A file with the name AppCatalog/spfx.sppkg already exists. It was last modified by i:0#.f|membership|admin@contoso.onmi on 24 Nov 2017 12:50:43 -0800." } } })
          });
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg', scope: 'sitecollection', appCatalogUrl: 'https://contoso.sharepoint.com' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('A file with the name AppCatalog/spfx.sppkg already exists. It was last modified by i:0#.f|membership|admin@contoso.onmi on 24 Nov 2017 12:50:43 -0800.')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('correctly handles random API error', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/tenantappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.reject({ error: 'An error has occurred' });
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('correctly handles random API error when sitecollection', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/sitecollectionappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.reject({ error: 'An error has occurred' });
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg', scope: 'sitecollection', appCatalogUrl: 'https://contoso.sharepoint.com' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('correctly handles random API error (string error)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/tenantappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.reject('An error has occurred');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('correctly handles random API error when sitecollection (string error)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/sitecollectionappcatalog/Add(overwrite=false, url='spfx.sppkg')`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&
          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.reject('An error has occurred');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, filePath: 'spfx.sppkg', scope: 'sitecollection', appCatalogUrl: 'https://contoso.sharepoint.com' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      }
    });
  });

  it('handles promise error while getting tenant appcatalog', (done) => {
    Utils.restore(request.get);
    sinon.stub(request, 'get').callsFake((opts) => {
      return Promise.reject('An error has occurred');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        debug: true, filePath: 'spfx.sppkg'
      }
    }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('handles error while getting tenant appcatalog', (done) => {
    Utils.restore(request.get);
    sinon.stub(request, 'get').callsFake((opts) => {
      return Promise.reject('An error has occurred');
    });

    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);
      if (opts.url.indexOf('_vti_bin/client.svc/ProcessQuery') > -1) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7018.1204", "ErrorInfo": {
              "ErrorMessage": "An error has occurred", "ErrorValue": null, "TraceCorrelationId": "18091989-62a6-4cad-9717-29892ee711bc", "ErrorCode": -1, "ErrorTypeName": "Microsoft.SharePoint.Client.ServerException"
            }, "TraceCorrelationId": "18091989-62a6-4cad-9717-29892ee711bc"
          }
        ]));
      }
      if (opts.url.indexOf('contextinfo') > -1) {
        return Promise.resolve('abc');
      }
      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({
      options: {
        debug: true, filePath: 'spfx.sppkg'
      }
    }, (err?: any) => {
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
    let containsdebugOption = false;
    options.forEach(o => {
      if (o.option === '--debug') {
        containsdebugOption = true;
      }
    });
    assert(containsdebugOption);
  });

  it('fails validation on invalid scope', () => {
    const actual = (command.validate() as CommandValidate)({ options: { scope: 'abc' } });
    assert.notEqual(actual, true);
  });

  it('passes validation on valid \'tenant\' scope', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { scope: 'tenant', filePath: 'abc' } });
    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('passes validation on valid \'Tenant\' scope', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { scope: 'Tenant', filePath: 'abc' } });
    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('passes validation on valid \'SiteCollection\' scope', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { scope: 'SiteCollection', appCatalogUrl: 'https://contoso.sharepoint.com', filePath: 'abc' } });
    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('submits to tenant app catalog when scope not specified', (done) => {
    // setup call to fake requests...
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&

          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.resolve('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { filePath: 'spfx.sppkg' } }, () => {
      let correctAppCatalogUsed = false;
      requests.forEach(r => {
        if (r.url.indexOf('/tenantappcatalog/') > -1) {
          correctAppCatalogUsed = true;
        }
      });

      try {
        assert(correctAppCatalogUsed);
        done();
      } catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      };
    });
  });

  it('submits to tenant app catalog when scope \'tenant\' specified ', (done) => {
    // setup call to fake requests...
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&

          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.resolve('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { scope: 'tenant', filePath: 'spfx.sppkg' } }, () => {
      let correctAppCatalogUsed = false;
      requests.forEach(r => {
        if (r.url.indexOf('/tenantappcatalog/') > -1) {
          correctAppCatalogUsed = true;
        }
      });

      try {
        assert(correctAppCatalogUsed);
        done();
      } catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      };
    });
  });

  it('submits to sitecollection app catalog when scope \'sitecollection\' specified ', (done) => {
    // setup call to fake requests...
    sinon.stub(request, 'post').callsFake((opts) => {
      requests.push(opts);

      if (opts.url.indexOf(`/_api/web/`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers.accept &&
          opts.headers.accept.indexOf('application/json') === 0 &&

          opts.headers.binaryStringRequestBody &&
          opts.body) {
          return Promise.resolve('{"CheckInComment":"","CheckOutType":2,"ContentTag":"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4,3","CustomizedPageStatus":0,"ETag":"\\"{BDA5CE2F-9AC7-4A6F-A98B-7AE1C168519E},4\\"","Exists":true,"IrmEnabled":false,"Length":"3752","Level":1,"LinkingUri":null,"LinkingUrl":"","MajorVersion":3,"MinorVersion":0,"Name":"spfx-01.sppkg","ServerRelativeUrl":"/sites/apps/AppCatalog/spfx.sppkg","TimeCreated":"2018-05-25T06:59:20Z","TimeLastModified":"2018-05-25T08:23:18Z","Title":"spfx-01-client-side-solution","UIVersion":1536,"UIVersionLabel":"3.0","UniqueId":"bda5ce2f-9ac7-4a6f-a98b-7ae1c168519e"}');
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { scope: 'sitecollection', filePath: 'spfx.sppkg', appCatalogUrl: 'https://contoso.sharepoint.com' } }, () => {
      let correctAppCatalogUsed = false;
      requests.forEach(r => {
        if (r.url.indexOf('/sitecollectionappcatalog/') > -1) {
          correctAppCatalogUsed = true;
        }
      });

      try {
        assert(correctAppCatalogUsed);
        done();
      } catch (e) {
        done(e);
      }
      finally {
        Utils.restore([
          request.post,
          fs.readFileSync
        ]);
      };
    });
  });

  it('fails validation if file path not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: {} });
    assert.notEqual(actual, true);
  });

  it('fails validation if file path doesn\'t exist', () => {
    sinon.stub(fs, 'existsSync').callsFake(() => false);
    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc' } });
    Utils.restore(fs.existsSync);
    assert.notEqual(actual, true);
  });

  it('fails validation if file path points to a directory', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => true);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);
    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc' } });
    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.notEqual(actual, true);
  });

  it('fails validation when invalid scope is specified', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc', scope: 'foo' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.notEqual(actual, true);
  });

  it('passes validation when path points to a valid file', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('passes validation when no scope is specified', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('passes validation when the scope is specified with \'tenant\'', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc', scope: 'tenant' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });


  it('passes validation when no scope is specified', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('passes validation when the scope is specified with \'tenant\'', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc', scope: 'tenant' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('should fail when \'sitecollection\' scope, but no appCatalogUrl specified', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc', scope: 'sitecollection' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.notEqual(actual, true);
  });

  it('should not fail when \'tenant\' scope, but also appCatalogUrl specified', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc', scope: 'tenant', appCatalogUrl: 'https://contoso.sharepoint.com' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.equal(actual, true);
  });

  it('should fail when \'sitecollection\' scope, but bad appCatalogUrl format specified', () => {
    const stats: fs.Stats = new fs.Stats();
    sinon.stub(stats, 'isDirectory').callsFake(() => false);
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'lstatSync').callsFake(() => stats);

    const actual = (command.validate() as CommandValidate)({ options: { filePath: 'abc', scope: 'sitecollection', appCatalogUrl: 'contoso.sharepoint.com' } });

    Utils.restore([
      fs.existsSync,
      fs.lstatSync
    ]);
    assert.notEqual(actual, true);
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
    assert(find.calledWith(commands.APP_ADD));
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

  it('correctly handles lack of valid access token', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      return Promise.reject('Invalid request');
    });
    sinon.stub(fs, 'readFileSync').callsFake(() => '123');

    Utils.restore(auth.getAccessToken);
    sinon.stub(auth, 'getAccessToken').callsFake(() => { return Promise.reject(new Error('Error getting access token')); });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Error getting access token')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });
});