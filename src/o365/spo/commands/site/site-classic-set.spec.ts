import commands from '../../commands';
import Command, { CommandOption, CommandError, CommandValidate, CommandCancel } from '../../../../Command';
import * as sinon from 'sinon';
import config from '../../../../config';
import appInsights from '../../../../appInsights';
import auth, { Site } from '../../SpoAuth';
const command: Command = require('./site-classic-set');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';

describe(commands.SITE_CLASSIC_SET, () => {
  let vorpal: Vorpal;
  let log: string[];
  let cmdInstance: any;
  let cmdInstanceLogSpy: sinon.SinonSpy;
  let trackEvent: any;
  let telemetry: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.resolve('ABC'); });
    trackEvent = sinon.stub(appInsights, 'trackEvent').callsFake((t) => {
      telemetry = t;
    });
  });

  beforeEach(() => {
    let futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 1800);
    sinon.stub(command as any, 'ensureFormDigest').callsFake(() => { return Promise.resolve({ FormDigestValue: 'abc', FormDigestTimeoutSeconds: 1800, FormDigestExpiresAt: futureDate.toISOString() }); });

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
  });

  afterEach(() => {
    (command as any).currentContext = undefined;
    Utils.restore([
      vorpal.find,
      request.post,
      global.setTimeout,
      (command as any).ensureFormDigest
    ]);
  });

  after(() => {
    Utils.restore([
      appInsights.trackEvent,
      auth.ensureAccessToken,
      auth.restoreAuth
    ]);
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.SITE_CLASSIC_SET), true);
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
        assert.equal(telemetry.name, commands.SITE_CLASSIC_SET);
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

  it('aborts when not logged in to a SharePoint tenant admin site', (done) => {
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso.sharepoint.com';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError(`https://contoso.sharepoint.com is not a tenant admin site. Log in to your tenant admin site and try again`)));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site title. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site title. doesn\'t wait for completion (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site sharing mode. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="SharingCapability"><Parameter Type="Enum">0</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', sharing: 'Disabled' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site resourceQuota. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="UserCodeMaximumLevel"><Parameter Type="Double">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', resourceQuota: 100 } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site resourceQuotaWarningLevel. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="UserCodeWarningLevel"><Parameter Type="Double">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', resourceQuotaWarningLevel: 100 } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site storageQuota. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="StorageMaximumLevel"><Parameter Type="Int64">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', storageQuota: 100 } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site storageQuotaWarningLevel. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="StorageWarningLevel"><Parameter Type="Int64">100</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', storageQuotaWarningLevel: 100 } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site allowSelfServiceUpgrade. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="AllowSelfServiceUpgrade"><Parameter Type="Boolean">true</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', allowSelfServiceUpgrade: 'true' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site noScriptSite to true. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">2</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: 'true' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site noScriptSite to false. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">1</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: 'false' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('handles error while updating basic properties', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "Unknown Error", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "Microsoft.SharePoint.Client.UnknownError"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Unknown Error')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site title. waits for completion, immediately complete', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('adds site admin', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "b3d8499e-1079-5000-cb83-9da72405dfa6"
            }, 48, {
              "IsNull": false
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', owners: 'admin@contoso.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('adds site admin (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "b3d8499e-1079-5000-cb83-9da72405dfa6"
            }, 48, {
              "IsNull": false
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', owners: 'admin@contoso.com' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('handles error while adding site admin', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "Unknown Error", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "Microsoft.SharePoint.Client.UnknownError"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', owners: 'admin@contoso.com' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Unknown Error')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('handles generic error while adding site admin', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.reject('Unknown Error');
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', owners: 'admin@contoso.com' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Unknown Error')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site lockState. doesn\'t wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess' } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site lockState. doesn\'t wait for completion (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess' } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('handles error while updating site lockState', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "Unknown Error", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "Microsoft.SharePoint.Client.UnknownError"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('Unknown Error')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site lockState. wait for completion, immediate complete', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": true, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates all properties. wait for completion, immediately complete', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><SetProperty Id="2" ObjectPathId="5" Name="SharingCapability"><Parameter Type="Enum">0</Parameter></SetProperty><SetProperty Id="3" ObjectPathId="5" Name="UserCodeMaximumLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="4" ObjectPathId="5" Name="UserCodeWarningLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="5" ObjectPathId="5" Name="StorageMaximumLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="6" ObjectPathId="5" Name="StorageWarningLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="7" ObjectPathId="5" Name="AllowSelfServiceUpgrade"><Parameter Type="Boolean">true</Parameter></SetProperty><SetProperty Id="8" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">2</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 15000
            }
          ]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "b3d8499e-1079-5000-cb83-9da72405dfa6"
            }, 48, {
              "IsNull": false
            }
          ]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": true, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', sharing: 'Disabled', resourceQuota: 100, resourceQuotaWarningLevel: 100, storageQuota: 100, storageQuotaWarningLevel: 100, allowSelfServiceUpgrade: 'true', noScriptSite: 'true', owners: 'admin@contoso.com', lockState: 'NoAccess', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site title. wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }

        // done
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636540580851601240&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 5000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(global, 'setTimeout').callsFake((fn, to) => {
      fn();
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site title. wait for completion (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }

        // done
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636540580851601240&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 5000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(global, 'setTimeout').callsFake((fn, to) => {
      fn();
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: true, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site title. wait for completion (verbose)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.headers.authorization &&
          opts.headers.authorization.indexOf('Bearer ') === 0 &&
          opts.headers['X-RequestDigest'] &&
          opts.headers['X-RequestDigest'] === 'abc' &&
          opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }

        // done
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636540580851601240&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 5000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(global, 'setTimeout').callsFake((fn, to) => {
      fn();
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, verbose: true, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.calledWith(vorpal.chalk.green('DONE')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site lockState. wait for completion', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }

        // done
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 5000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(global, 'setTimeout').callsFake((fn, to) => {
      fn();
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site lockState. wait for completion. error while polling', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": {
                "ErrorMessage": "An error has occurred.", "ErrorValue": null, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4", "ErrorCode": -1, "ErrorTypeName": "SPException"
              }, "TraceCorrelationId": "b33c489e-009b-5000-8240-a8c28e5fd8b4"
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(global, 'setTimeout').callsFake((fn, to) => {
      fn();
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred.')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('updates site lockState. wait for completion two rounds', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": false, "PollingInterval": 15000
            }
          ]));
        }

        // not done
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": false, "PollingInterval": 5000
            }
          ]));
        }

        // done
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="188" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="184" Name="803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SpoOperation&#xA;SetSite&#xA;636543176568112997&#xA;https%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam&#xA;00000000-0000-0000-0000-000000000000" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7324.1200", "ErrorInfo": null, "TraceCorrelationId": "803b489e-9066-5000-58fc-dc40eb096913"
            }, 39, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "803b489e-9066-5000-58fc-dc40eb096913|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 5000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });
    sinon.stub(global, 'setTimeout').callsFake((fn, to) => {
      fn();
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('escapes XML in the request', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if (opts.url.indexOf(`/_vti_bin/client.svc/ProcessQuery`) > -1) {
        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="1" ObjectPathId="5" Name="Title"><Parameter Type="String">New title&gt;</Parameter></SetProperty><SetProperty Id="2" ObjectPathId="5" Name="SharingCapability"><Parameter Type="Enum">0</Parameter></SetProperty><SetProperty Id="3" ObjectPathId="5" Name="UserCodeMaximumLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="4" ObjectPathId="5" Name="UserCodeWarningLevel"><Parameter Type="Double">100</Parameter></SetProperty><SetProperty Id="5" ObjectPathId="5" Name="StorageMaximumLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="6" ObjectPathId="5" Name="StorageWarningLevel"><Parameter Type="Int64">100</Parameter></SetProperty><SetProperty Id="7" ObjectPathId="5" Name="AllowSelfServiceUpgrade"><Parameter Type="Boolean">true</Parameter></SetProperty><SetProperty Id="8" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">2</Parameter></SetProperty><ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;SiteProperties&#xA;https%3A%2F%2Fcontoso.sharepoint.com%2Fsites%2Fteam" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "54d8499e-b001-5000-cb83-9445b3944fb9"
            }, 14, {
              "IsNull": false
            }, 15, {
              "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 16, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "54d8499e-b001-5000-cb83-9445b3944fb9|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636540580851601240\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "IsComplete": true, "PollingInterval": 15000
            }
          ]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="String">admin@contoso.com&gt;</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7331.1205", "ErrorInfo": null, "TraceCorrelationId": "b3d8499e-1079-5000-cb83-9da72405dfa6"
            }, 48, {
              "IsNull": false
            }
          ]));
        }

        if (opts.body === `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">NoAccess</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">https://contoso.sharepoint.com/sites/team</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`) {
          return Promise.resolve(JSON.stringify([
            {
              "SchemaVersion": "15.0.0.0", "LibraryVersion": "16.0.7407.1203", "ErrorInfo": null, "TraceCorrelationId": "e0cf4a9e-301d-5000-8242-77fc92412701"
            }, 9, {
              "IsNull": false
            }, 10, {
              "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSiteProperties\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam"
            }, 11, {
              "_ObjectType_": "Microsoft.Online.SharePoint.TenantAdministration.SpoOperation", "_ObjectIdentity_": "e0cf4a9e-301d-5000-8242-77fc92412701|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023\nSpoOperation\nSetSite\n636543176568112997\nhttps%3a%2f%2fcontoso.sharepoint.com%2fsites%2fteam\n00000000-0000-0000-0000-000000000000", "HasTimedout": false, "IsComplete": true, "PollingInterval": 15000
            }
          ]));
        }
      }

      return Promise.reject('Invalid request');
    });

    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
    auth.site.tenantId = 'a61d499e-50aa-5000-8242-7169ab88ce08|908bed80-a04a-4433-b4a0-883d9847d110:67753f63-bc14-4012-869e-f808a43fe023&#xA;Tenant';
    cmdInstance.action = command.action();
    cmdInstance.action({ options: { debug: false, url: 'https://contoso.sharepoint.com/sites/team', title: 'New title>', sharing: 'Disabled', resourceQuota: 100, resourceQuotaWarningLevel: 100, storageQuota: 100, storageQuotaWarningLevel: 100, allowSelfServiceUpgrade: 'true', noScriptSite: 'true', owners: 'admin@contoso.com>', lockState: 'NoAccess', wait: true } }, () => {
      try {
        assert(cmdInstanceLogSpy.notCalled);
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
    (command as any).timeout = {};
    const clearTimeoutSpy = sinon.spy(global, 'clearTimeout');
    (command.cancel() as CommandCancel)();
    Utils.restore(global.clearTimeout);
    assert(clearTimeoutSpy.called);
  });

  it('doesn\'t fail on cancel if no connection pending', () => {
    (command as any).timeout = undefined;
    (command.cancel() as CommandCancel)();
    assert(true);
  });

  it('supports debug mode', () => {
    const options = (command.options() as CommandOption[]);
    let containsDebugOption = false;
    options.forEach(o => {
      if (o.option === '--debug') {
        containsDebugOption = true;
      }
    });
    assert(containsDebugOption);
  });

  it('fails validation if the url is not specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        title: 'Team'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the url is not a valid url', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'abc', title: 'Team'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the url is not a valid SharePoint url', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'http://contoso', title: 'Team'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the resourceQuota is not a number', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', resourceQuota: 'abc'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the resourceQuotaWarningLevel is not a number', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', resourceQuotaWarningLevel: 'abc'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the resourceQuotaWarningLevel is greater than resourceQuota', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        owner: 'admin@contoso.com', resourceQuotaWarningLevel: 10, resourceQuota: 5
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the storageQuota is not a number', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        storageQuota: 'abc'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the storageQuotaWarningLevel is not a number', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        storageQuotaWarningLevel: 'abc'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if the storageQuotaWarningLevel is greater than storageQuota', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        storageQuotaWarningLevel: 10, storageQuota: 5
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation if sharing is invalid', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', sharing: 'Invalid'
      }
    });
    assert.notEqual(actual, true);
  });

  it('passes validation if sharing is set to Disabled', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', sharing: 'Disabled'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if sharing is set to ExternalUserSharingOnly', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', sharing: 'ExternalUserSharingOnly'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if sharing is set to ExternalUserAndGuestSharing', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', sharing: 'ExternalUserAndGuestSharing'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if sharing is set to ExistingExternalUserSharingOnly', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', sharing: 'ExistingExternalUserSharingOnly'
      }
    });
    assert.equal(actual, true);
  });

  it('fails validation if allowSelfServiceUpgrade is invalid', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', allowSelfServiceUpgrade: 'Invalid'
      }
    });
    assert.notEqual(actual, true);
  });

  it('passes validation if allowSelfServiceUpgrade is set to true', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', allowSelfServiceUpgrade: 'true'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if allowSelfServiceUpgrade is set to false', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', allowSelfServiceUpgrade: 'false'
      }
    });
    assert.equal(actual, true);
  });

  it('fails validation if lockState is invalid', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'Invalid'
      }
    });
    assert.notEqual(actual, true);
  });

  it('passes validation if lockState is set to Unlock', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'Unlock'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if lockState is set to NoAdditions', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAdditions'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if lockState is set to ReadOnly', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'ReadOnly'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if lockState is set to NoAccess', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', lockState: 'NoAccess'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if the required options are correct', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team'
      }
    });
    assert.equal(actual, true);
  });

  it('fails validation if noScriptSite is invalid', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: 'Invalid'
      }
    });
    assert.notEqual(actual, true);
  });

  it('passes validation if noScriptSite is set to true', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: 'true'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if noScriptSite is set to false', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', noScriptSite: 'false'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation if all options are correct', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        url: 'https://contoso.sharepoint.com/sites/team', title: 'Team',
        resourceQuota: 100, resourceQuotaWarningLevel: 90,
        storageQuota: 100, storageQuotaWarningLevel: 90,
        sharing: 'Disabled', allowSelfServiceUpgrade: 'true',
        owners: 'admin@contoso.com', lockState: 'Unlock', noScriptSite: 'true'
      }
    });
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
    assert(find.calledWith(commands.SITE_CLASSIC_SET));
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
    Utils.restore(auth.ensureAccessToken);
    sinon.stub(auth, 'ensureAccessToken').callsFake(() => { return Promise.reject(new Error('Error getting access token')); });
    auth.site = new Site();
    auth.site.connected = true;
    auth.site.url = 'https://contoso-admin.sharepoint.com';
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