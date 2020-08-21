import commands from '../../commands';
import Command, { CommandValidate, CommandOption, CommandError, CommandTypes } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../../../Auth';
const command: Command = require('./site-set');
import * as assert from 'assert';
import request from '../../../../request';
import config from '../../../../config';
import Utils from '../../../../Utils';
import * as spoSiteClassicSetCommand from './site-classic-set';
import * as aadO365GroupSetCommand from '../../../aad/commands/o365group/o365group-set';
import * as spoSiteDesignApplyCommand from '../sitedesign/sitedesign-apply';

describe(commands.SITE_SET, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let executeCommandSpy: sinon.SinonSpy;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => { });
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
      }
    };
    cmdInstanceLogSpy = sinon.spy(cmdInstance, 'log');
  });

  afterEach(() => {
    Utils.restore([
      vorpal.find,
      request.post,
      request.get,
      Utils.executeCommand,
      (command as any).getSpoAdminUrl
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
    assert.equal(command.name.startsWith(commands.SITE_SET), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('updates the classification of the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, classification: 'HBI', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates the classification of the specified site (debug)', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: true, classification: 'HBI', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith('Site is not groupified'));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates the classification of the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, classification: 'HBI', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates the classification of the specified groupified site (debug)', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: true, classification: 'HBI', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(`Site attached to group e10a459e-60c8-4000-8240-a68d6a12d39e`));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('resets the classification of the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String"></Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, classification: '', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('resets the classification of the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String"></Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, classification: '', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets disableFlows to true for the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="28" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, disableFlows: 'true', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets disableFlows to true for the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="28" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, disableFlows: 'true', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets disableFlows to false for the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="28" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Boolean">false</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, disableFlows: 'false', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets shareByEmailEnabled to true for the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="28" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, shareByEmailEnabled: 'true', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets shareByEmailEnabled to true for the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="28" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, shareByEmailEnabled: 'true', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets shareByEmailEnabled to false for the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="28" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">false</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, shareByEmailEnabled: 'false', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets shareByEmailEnabled to false for the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="28" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">false</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, shareByEmailEnabled: 'false', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates the classification, disableFlows and shareByEmailEnabled of the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/Sales/_vti_bin/client.svc/ProcessQuery` &&
        opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="27" ObjectPathId="5" Name="Classification"><Parameter Type="String">HBI</Parameter></SetProperty><SetProperty Id="28" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Boolean">true</Parameter></SetProperty><SetProperty Id="29" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><Identity Id="5" Name="e10a459e-60c8-4000-8240-a68d6a12d39e|740c6a0b-85e2-48a0-a494-e0f1759d4aa7:site:255a50b2-527f-4413-8485-57f4c17a24d1" /></ObjectPaths></Request>`) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7317.1205", "ErrorInfo": null, "TraceCorrelationId": "f10a459e-409f-4000-c5b4-09fb5e795218"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, classification: 'HBI', disableFlows: 'true', shareByEmailEnabled: 'true', id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('throws error when trying to update isPublic property on a non-groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, isPublic: true, url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`The isPublic option can't be set on a site that is not groupified`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates title of the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.resolve());

    cmdInstance.action({ options: { debug: false, title: 'New title', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        const options = {
          url: 'https://contoso.sharepoint.com/sites/Sales',
          title: 'New title',
          owners: undefined,
          wait: true,
          debug: false,
          verbose: false
        };
        assert(executeCommandSpy.calledWith(spoSiteClassicSetCommand, options));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates owners of the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.resolve());

    cmdInstance.action({ options: { debug: false, owners: 'admin@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        const options = {
          url: 'https://contoso.sharepoint.com/sites/Sales',
          title: undefined,
          owners: 'admin@contoso.onmicrosoft.com',
          wait: true,
          debug: false,
          verbose: false
        };
        assert(executeCommandSpy.calledWith(spoSiteClassicSetCommand, options));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles error when updating title of the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.reject(new CommandError('An error has occurred')));

    cmdInstance.action({ options: { debug: false, title: 'New title', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates title of the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(command as any, 'getSpoAdminUrl').callsFake(() => Promise.resolve('https://contoso-admin.sharepoint.com'));
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === 'https://contoso-admin.sharepoint.com/_api/SPOGroup/UpdateGroupPropertiesBySiteId' &&
        JSON.stringify(opts.body) === JSON.stringify({
          groupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e',
          siteId: '255a50b2-527f-4413-8485-57f4c17a24d1',
          displayName: 'New title'
        })) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, title: 'New title', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        assert.equal(typeof err, 'undefined');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates isPublic property of the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.resolve());

    cmdInstance.action({ options: { debug: false, isPublic: true, url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        const options = {
          id: 'e10a459e-60c8-4000-8240-a68d6a12d39e',
          isPrivate: 'false',
          debug: false,
          verbose: false
        };
        assert(executeCommandSpy.calledWith(aadO365GroupSetCommand, options));
        assert.equal(typeof err, 'undefined');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles error while updating isPublic property of the specified groupified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.reject(new CommandError('An error has occurred')));

    cmdInstance.action({ options: { debug: false, isPublic: true, url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates owners of the specified groupified site with one owner', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin@contoso.onmicrosoft.com'&$select=id`) {
        return Promise.resolve({
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(command as any, 'getSpoAdminUrl').callsFake(() => Promise.resolve('https://contoso-admin.sharepoint.com'));
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, owners: 'admin@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        assert.equal(typeof err, 'undefined');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates owners of the specified groupified site with one owner (debug)', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin@contoso.onmicrosoft.com'&$select=id`) {
        return Promise.resolve({
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(command as any, 'getSpoAdminUrl').callsFake(() => Promise.resolve('https://contoso-admin.sharepoint.com'));
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: true, owners: 'admin@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith('Retrieving user information to set group owners...'));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates owners of the specified groupified site with multiple owners', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return Promise.resolve({
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d728' },
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(command as any, 'getSpoAdminUrl').callsFake(() => Promise.resolve('https://contoso-admin.sharepoint.com'));
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d728', principalName='')`) {
        return Promise.resolve();
      }
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, owners: 'admin1@contoso.onmicrosoft.com,admin2@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        assert.equal(typeof err, 'undefined');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates owners of the specified groupified site with multiple owners with extra spaces', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return Promise.resolve({
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d728' },
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d729' }
          ]
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(command as any, 'getSpoAdminUrl').callsFake(() => Promise.resolve('https://contoso-admin.sharepoint.com'));
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d728', principalName='')`) {
        return Promise.resolve();
      }
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d729', principalName='')`) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, owners: ' admin1@contoso.onmicrosoft.com , admin2@contoso.onmicrosoft.com ', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        assert.equal(typeof err, 'undefined');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('skips users that could not be resolves when setting groupified site owners', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return Promise.resolve({
          value: [
            { id: 'b17ff355-cc97-4b90-9b46-e33d0d70d728' }
          ]
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(command as any, 'getSpoAdminUrl').callsFake(() => Promise.resolve('https://contoso-admin.sharepoint.com'));
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url === `https://contoso-admin.sharepoint.com/_api/SP.Directory.DirectorySession/Group('e10a459e-60c8-4000-8240-a68d6a12d39e')/Owners/Add(objectId='b17ff355-cc97-4b90-9b46-e33d0d70d728', principalName='')`) {
        return Promise.resolve();
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, owners: 'admin1@contoso.onmicrosoft.com,admin2@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        assert.equal(typeof err, 'undefined');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('fails silently if could not resolve users when setting groupified site owners', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/users?$filter=userPrincipalName eq 'admin1@contoso.onmicrosoft.com' or userPrincipalName eq 'admin2@contoso.onmicrosoft.com'&$select=id`) {
        return Promise.resolve({
          value: []
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(command as any, 'getSpoAdminUrl').callsFake(() => Promise.resolve('https://contoso-admin.sharepoint.com'));

    cmdInstance.action({ options: { debug: false, owners: 'admin1@contoso.onmicrosoft.com,admin2@contoso.onmicrosoft.com', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err?: any) => {
      try {
        assert.equal(typeof err, 'undefined');
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('applies site design to the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.resolve());

    cmdInstance.action({ options: { debug: false, siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        const options = {
          webUrl: 'https://contoso.sharepoint.com/sites/Sales',
          id: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e',
          asTask: false,
          debug: false,
          verbose: false
        };
        assert(executeCommandSpy.calledWith(spoSiteDesignApplyCommand, options));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('applies site design to the specified gropified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: 'e10a459e-60c8-4000-8240-a68d6a12d39e'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.resolve());

    cmdInstance.action({ options: { debug: false, siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e', url: 'https://contoso.sharepoint.com/sites/Sales' } }, () => {
      try {
        const options = {
          webUrl: 'https://contoso.sharepoint.com/sites/Sales',
          id: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e',
          asTask: false,
          debug: false,
          verbose: false
        };
        assert(executeCommandSpy.calledWith(spoSiteDesignApplyCommand, options));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles error when applying site design to the specified site', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    executeCommandSpy = sinon.stub(Utils, 'executeCommand').callsFake(() => Promise.reject(new CommandError('An error has occurred')));

    cmdInstance.action({ options: { debug: false, siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e', url: 'https://contoso.sharepoint.com/sites/Sales' } }, (err: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles site not found error', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.reject(new Error("404 - \"404 FILE NOT FOUND\""));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/Sales', id: '255a50b2-527f-4413-8485-57f4c17a24d1', classification: 'HBI' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError("404 - \"404 FILE NOT FOUND\"")));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles API error while updating shared properties', (done) => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://contoso.sharepoint.com/sites/Sales/_api/site?$select=GroupId,Id') {
        return Promise.resolve({
          Id: '255a50b2-527f-4413-8485-57f4c17a24d1',
          GroupId: '00000000-0000-0000-0000-000000000000'
        });
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        return Promise.resolve(JSON.stringify([
          {
            "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7303.1206", "ErrorInfo": {
              "ErrorMessage": "An error has occurred.", "ErrorValue": null, "TraceCorrelationId": "7420429e-a097-5000-fcf8-bab3f3683799", "ErrorCode": -2146232832, "ErrorTypeName": "Microsoft.SharePoint.SPException"
            }, "TraceCorrelationId": "7420429e-a097-5000-fcf8-bab3f3683799"
          }
        ]));
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/Sales', id: '255a50b2-527f-4413-8485-57f4c17a24d1', classification: 'HBI' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError("An error has occurred.")));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('configures command types', () => {
    assert.notEqual(typeof command.types(), 'undefined', 'command types undefined');
    assert.notEqual((command.types() as CommandTypes).string, 'undefined', 'command string types undefined');
  });

  it('configures classification as string option', () => {
    const types = (command.types() as CommandTypes);
    ['classification'].forEach(o => {
      assert.notEqual((types.string as string[]).indexOf(o), -1, `option ${o} not specified as string`);
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

  it('supports specifying site url', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--url') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying site classification', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--classification') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('supports specifying disableFlows', () => {
    const options = (command.options() as CommandOption[]);
    let containsOption = false;
    options.forEach(o => {
      if (o.option.indexOf('--disableFlows') > -1) {
        containsOption = true;
      }
    });
    assert(containsOption);
  });

  it('fails validation if URL not specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { classification: 'HBI' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if URL is not a valid SharePoint URL', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'Invalid', classification: 'HBI' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if specified id is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', id: 'abc' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if no property to update specified (id not specified)', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if no property to update specified (id specified)', () => {
    const actual = (command.validate() as CommandValidate)({ options: { id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com' } });
    assert.notEqual(actual, true);
  });

  it('fails validation if invalid value specified for disableFlows', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', disableFlows: 'Invalid' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if url and classification specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', classification: 'HBI' } });
    assert.equal(actual, true);
  });

  it('passes validation if url and empty classification specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', classification: '' } });
    assert.equal(actual, true);
  });

  it('passes validation if url and disableFlows true specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', disableFlows: 'true' } });
    assert.equal(actual, true);
  });

  it('passes validation if url and disableFlows false specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', disableFlows: 'false' } });
    assert.equal(actual, true);
  });

  it('passes validation if url, id, classification and disableFlows specified', () => {
    const actual = (command.validate() as CommandValidate)({ options: { id: '255a50b2-527f-4413-8485-57f4c17a24d1', url: 'https://contoso.sharepoint.com', classification: 'HBI', disableFlows: 'true' } });
    assert.equal(actual, true);
  });

  it('fails validation if invalid value specified for isPublic', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', isPublic: 'Invalid' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if true specified for isPublic', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', isPublic: 'true' } });
    assert.equal(actual, true);
  });

  it('passes validation if false specified for isPublic', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', isPublic: 'false' } });
    assert.equal(actual, true);
  });

  it('fails validation if invalid value specified for shareByEmailEnabled', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', shareByEmailEnabled: 'Invalid' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if true specified for shareByEmailEnabled', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', shareByEmailEnabled: 'true' } });
    assert.equal(actual, true);
  });

  it('passes validation if false specified for shareByEmailEnabled', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', shareByEmailEnabled: 'false' } });
    assert.equal(actual, true);
  });

  it('fails validation if non-GUID value specified for siteDesignId', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', siteDesignId: 'Invalid' } });
    assert.notEqual(actual, true);
  });

  it('passes validation if a valid GUID specified for siteDesignId', () => {
    const actual = (command.validate() as CommandValidate)({ options: { url: 'https://contoso.sharepoint.com', siteDesignId: 'eb2f31da-9461-4fbf-9ea1-9959b134b89e' } });
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
    assert(find.calledWith(commands.SITE_SET));
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