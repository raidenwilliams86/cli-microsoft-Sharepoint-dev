import commands from '../../commands';
import Command, { CommandValidate, CommandOption, CommandError } from '../../../../Command';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../../../Auth';
const command: Command = require('./site-add');
import * as assert from 'assert';
import request from '../../../../request';
import Utils from '../../../../Utils';

describe(commands.SITE_ADD, () => {
  let vorpal: Vorpal;
  let log: any[];
  let cmdInstance: any;

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => {});
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
      log: (msg: string) => {
        log.push(msg);
      }
    };
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
      appInsights.trackEvent
    ]);
    auth.service.connected = false;
    auth.service.spoUrl = undefined;
  });

  it('has correct name', () => {
    assert.equal(command.name.startsWith(commands.SITE_ADD), true);
  });

  it('has a description', () => {
    assert.notEqual(command.description, null);
  });

  it('creates modern team site using the correct endpoint', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false } }, () => {
      assert(true);
      done();
    }, () => {
      assert(false);
    });
  });

  it('creates modern team site using the correct endpoint (debug)', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        return Promise.resolve({ SiteUrl: 'https://contoso.sharepoint.com/sites/team1', ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: true } }, () => {
      assert(true);
      done();
    }, () => {
      assert(false);
    });
  });

  it('sets specified title for modern team site', (done) => {
    const expected = 'Team 1';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.displayName;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', title: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets specified alias for modern team site', (done) => {
    const expected = 'team1';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.alias;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', alias: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets modern team site group type to public when isPublic specified', (done) => {
    const expected = true;
    let actual = false;
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.isPublic;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', isPublic: true } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets modern team site group type to undefined when isPublic not specified', (done) => {
    const expected = undefined;
    let actual = false;
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.isPublic;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets specified description for modern team site', (done) => {
    const expected = 'Site for team 1';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.optionalParams.Description;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', description: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets empty description for modern team site when no description specified', (done) => {
    const expected = '';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.optionalParams.Description;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets specified classification for modern team site', (done) => {
    const expected = 'LBI';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.optionalParams.CreationOptions.Classification;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', classification: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets empty classification for modern team site when no classification specified', (done) => {
    const expected = '';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.optionalParams.CreationOptions.Classification;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('creates modern team site with the specified language', (done) => {
    const expected = true;
    let actual = false;
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.optionalParams.CreationOptions.results.indexOf('SPSiteLanguage:1033') > -1;
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', lcid: 1033 } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('creates modern team site with the specified owner', (done) => {
    const expected = JSON.stringify({ results: ['admin@contoso.com'] });
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = JSON.stringify(opts.body.optionalParams.Owners);
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', owners: 'admin@contoso.com' } }, () => {
      try {
        assert.strictEqual(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('creates modern team site with the specified owners', (done) => {
    const expected = JSON.stringify({ results: ['admin@contoso.com', 'steve@contoso.com'] });
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = JSON.stringify(opts.body.optionalParams.Owners);
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', owners: 'admin@contoso.com,steve@contoso.com' } }, () => {
      try {
        assert.strictEqual(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('creates modern team site with the specified owners trimming surrounding spaces', (done) => {
    const expected = JSON.stringify({ results: ['admin@contoso.com', 'steve@contoso.com'] });
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = JSON.stringify(opts.body.optionalParams.Owners);
        return Promise.resolve({ ErrorMessage: null });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite', owners: 'admin@contoso.com, steve@contoso.com' } }, () => {
      try {
        assert.strictEqual(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles error when modern team site with the specified alias already exists', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        return Promise.resolve({ ErrorMessage: 'The group alias already exists.' });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('The group alias already exists.')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('correctly handles OData error when creating a modern team site', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      return Promise.reject({ error: { 'odata.error': { message: { value: 'An error has occurred' } } } });
    });

    cmdInstance.action({ options: { debug: false, type: 'TeamSite' } }, (err?: any) => {
      try {
        assert.equal(JSON.stringify(err), JSON.stringify(new CommandError('An error has occurred')));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('creates communication site using the correct endpoint', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        return Promise.resolve({ SiteStatus: 2, SiteUrl: "https://contoso.sharepoint.com/sites/marketing" });
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite' } }, () => {
      assert(true);
      done();
    }, () => {
      assert(false);
    });
  });

  it('sets specified title for communication site', (done) => {
    const expected = 'Marketing';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.Title;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', title: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets specified url for communication site', (done) => {
    const expected = 'https://contoso.sharepoint.com/sites/marketing';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.Url;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', url: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('enables sharing files with external users in communication site when allowFileSharingForGuestUsers specified', (done) => {
    const expected = true;
    let actual = false;
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.ShareByEmailEnabled;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', allowFileSharingForGuestUsers: true } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('enables sharing files with external users in communication site when shareByEmailEnabled specified', (done) => {
    const expected = true;
    let actual = false;
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.ShareByEmailEnabled;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', shareByEmailEnabled: true } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('shows deprecation warning when allowFileSharingForGuestUsers used in verbose mode', (done) => {
    sinon.stub(request, 'post').callsFake((opts) => {
      return Promise.resolve({});
    });

    cmdInstance.action({ options: { verbose: true, type: 'CommunicationSite', allowFileSharingForGuestUsers: true } }, () => {
      try {
        assert(log.find(l => l.indexOf(`Option 'allowFileSharingForGuestUsers' is deprecated`) > -1));
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets sharing files with external users in communication site to undefined when allowFileSharingForGuestUsers and shareByEmailEnabled not specified', (done) => {
    const expected = undefined;
    let actual = false;
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.ShareByEmailEnabled;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets specified description for communication site', (done) => {
    const expected = 'Site for the marketing department';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.Description;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', description: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets empty description for communication site when no description specified', (done) => {
    const expected = '';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.Description;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets specified classification for communication site', (done) => {
    const expected = 'LBI';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.Classification;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', classification: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets empty classification for communication site when no classification specified', (done) => {
    const expected = '';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/GroupSiteManager/CreateGroupEx`) > -1) {
        actual = opts.body.request.Classification;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets correct id for the Topic communication site site design', (done) => {
    const expected = '00000000-0000-0000-0000-000000000000';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.SiteDesignId;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', siteDesign: 'Topic' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets correct id for the Showcase communication site site design', (done) => {
    const expected = '6142d2a0-63a5-4ba0-aede-d9fefca2c767';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.SiteDesignId;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', siteDesign: 'Showcase' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets correct id for the Blank communication site site design', (done) => {
    const expected = 'f6cc5403-0d63-442e-96c0-285923709ffc';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.SiteDesignId;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', siteDesign: 'Blank' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets correct id when no communication site site design specified', (done) => {
    const expected = '00000000-0000-0000-0000-000000000000';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.SiteDesignId;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite' } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('sets specified communication site site design id', (done) => {
    const expected = '92398ab7-45c7-486b-81fa-54da2ee0738a';
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.SiteDesignId;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', siteDesignId: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  it('creates communication site using the specified language', (done) => {
    const expected = 1033;
    let actual = '';
    sinon.stub(request, 'post').callsFake((opts) => {
      if ((opts.url as string).indexOf(`/_api/SPSiteManager/Create`) > -1) {
        actual = opts.body.request.Lcid;
        return Promise.resolve({});
      }

      return Promise.reject('Invalid request');
    });

    cmdInstance.action({ options: { debug: false, type: 'CommunicationSite', lcid: expected } }, () => {
      try {
        assert.equal(actual, expected);
        done();
      }
      catch (e) {
        done(e);
      }
    });
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

  it('supports specifying site type', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--type') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('offers autocomplete for site type options', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--type') > -1) {
        assert(options[i].autocomplete);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site title', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--title') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site alias', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--alias') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site url', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--url') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site description', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--description') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site classification', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--classification') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying if the team site contains a public group', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--isPublic') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying if the communication site allows sharing files with guest users (deprecated)', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--allowFileSharingForGuestUsers') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying if the communication site allows sharing files with guest users', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--shareByEmailEnabled') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site design', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--siteDesign') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site design ID', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--siteDesignId') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('supports specifying site language', () => {
    const options = (command.options() as CommandOption[]);
    for (let i = 0; i < options.length; i++) {
      if (options[i].option.indexOf('--lcid') > -1) {
        assert(true);
        return;
      }
    }
    assert(false);
  });

  it('passes validation if the type option not specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        title: 'Team 1',
        alias: 'team1'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when the TeamSite type option specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'TeamSite',
        title: 'Team 1',
        alias: 'team1'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when single owner is specified for a TeamSite', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'TeamSite',
        title: 'Team 1',
        alias: 'team1',
        owners: 'admin@contoso.com'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when multiple owners are specified for a TeamSite', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'TeamSite',
        title: 'Team 1',
        alias: 'team1',
        owners: 'admin@contoso.com,steve@contoso.com'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when multiple owners with a space in between are specified for a TeamSite', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'TeamSite',
        title: 'Team 1',
        alias: 'team1',
        owners: 'admin@contoso.com, steve@contoso.com'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when the CommunicationSite type option specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when lcid is valid', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        lcid: 1033,
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing'
      }
    });
    assert.equal(actual, true);
  });

  it('fails validation if an invalid type option specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'Invalid',
        title: 'Team 1',
        alias: 'team1'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when the title option not specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        alias: 'team1'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when the type is TeamSite and alias option not specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        title: 'Team 1'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when the type is CommunicationSite and url option not specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Team 1'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when the type is CommunicationSite and the url option is not a valid SharePoint site URL', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'foo'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when the type is CommunicationSite and owners option is specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        owners: 'admin@contoso.com'
      }
    });
    assert.notEqual(actual, true);
  });

  it('passes validation when the type is CommunicationSite and the url option is a valid SharePoint site URL', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when the type is CommunicationSite and siteDesign is Topic', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        siteDesign: 'Topic'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when the type is CommunicationSite and siteDesign is Showcase', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        siteDesign: 'Showcase'
      }
    });
    assert.equal(actual, true);
  });

  it('passes validation when the type is CommunicationSite and siteDesign is Blank', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        siteDesign: 'Blank'
      }
    });
    assert.equal(actual, true);
  });

  it('fails validation when the type is CommunicationSite and siteDesign is invalid', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        siteDesign: 'Invalid'
      }
    });
    assert.notEqual(actual, true);
  });

  it('passes validation when the type is CommunicationSite and siteDesignId is a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        siteDesignId: '92398ab7-45c7-486b-81fa-54da2ee0738a'
      }
    });
    assert.equal(actual, true);
  });

  it('fails validation when the type is CommunicationSite and siteDesignId is not a valid GUID', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        siteDesignId: 'abc'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when the type is CommunicationSite and both siteDesign and siteDesignId are specified', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        siteDesign: 'Topic',
        siteDesignId: '92398ab7-45c7-486b-81fa-54da2ee0738a'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when lcid is not a number', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        lcid: 'a'
      }
    });
    assert.notEqual(actual, true);
  });

  it('fails validation when lcid is less than 0', () => {
    const actual = (command.validate() as CommandValidate)({
      options: {
        type: 'CommunicationSite',
        title: 'Marketing',
        url: 'https://contoso.sharepoint.com/sites/marketing',
        lcid: -1
      }
    });
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
    assert(find.calledWith(commands.SITE_ADD));
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