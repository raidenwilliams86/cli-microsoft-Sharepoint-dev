import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import {
  CommandOption, CommandValidate
} from '../../../../Command';
import Utils from '../../../../Utils';
import { Tab } from '../../Tab';
import { GraphItemsListCommand } from '../../../base/GraphItemsListCommand';
import request from '../../../../request';
const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  teamId: string;
  channelId: string;
  appId: string;
  appName: string;
  contentUrl: string;
  entityId?: string;
  removeUrl?: string;
  websiteUrl?: string;
}

class TeamsTabAddCommand extends GraphItemsListCommand<Tab> {
  public get name(): string {
    return commands.TEAMS_TAB_ADD;
  }
  public allowUnknownOptions(): boolean | undefined {
    return true;
  }

  public get description(): string {
    return 'Add a tab to the specified channel';
  }
  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.entityId = typeof args.options.entityId !== 'undefined';
    telemetryProps.removeUrl = typeof args.options.removeUrl !== 'undefined';
    telemetryProps.websiteUrl = typeof args.options.websiteUrl !== 'undefined';
    return telemetryProps;
  }
  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {

    const body: any = this.mapRequestBody(args.options);
    const requestOptions: any = {
      url: `${this.resource}/v1.0/teams/${encodeURIComponent(args.options.teamId)}/channels/${args.options.channelId}/tabs`,
      headers: {
        accept: 'application/json;odata.metadata=none',
        'content-type': 'application/json;odata=nometadata'
      },
      body: body,
      json: true
    };
    request
      .post(requestOptions)
      .then((res: any): void => {
        cmd.log(res);
        if (this.verbose) {
          cmd.log(vorpal.chalk.green('DONE'));
        }

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-i, --teamId <teamId>',
        description: 'The ID of the team to where the channel exists'
      },
      {
        option: '-c, --channelId <channelId>',
        description: 'The ID of the channel to add a tab to'
      },
      {
        option: '--appId <appId>',
        description: 'The ID of the Teams app that contains the Tab'
      },
      {
        option: '--appName <appName>',
        description: 'The name of the Teams app that contains the Tab'
      },
      {
        option: '--contentUrl <contentUrl>',
        description: 'The URL used for rendering Tab contents'
      },
      {
        option: '--entityId [entityId]',
        description: 'A unique identifier for the Tab'
      },
      {
        option: '--removeUrl [removeUrl]',
        description: 'The URL displayed when a Tab is removed'
      },
      {
        option: '--websiteUrl [websiteUrl]',
        description: 'The URL for showing tab contents outside of Teams'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.teamId) {
        return 'Required parameter teamId missing';
      }
      if (!args.options.channelId) {
        return 'Required parameter channelId missing';
      }
      if (!args.options.appId) {
        return 'Required parameter appId missing';
      }
      if (!args.options.appName) {
        return 'Required parameter appName missing';
      }
      if (!args.options.contentUrl) {
        return 'Required parameter contentUrl missing';
      }
      if (!Utils.isValidGuid(args.options.teamId as string)) {
        return `${args.options.teamId} is not a valid GUID`;
      }
      if (!Utils.isValidTeamsChannelId(args.options.channelId as string)) {
        return `${args.options.channelId} is not a valid Teams ChannelId`;
      }

      return true;
    };
  }

  private mapRequestBody(options: Options): any {
    const requestBody: any = {}
    requestBody['configuration'] = {};
    const excludeOptions: string[] = [
      'debug',
      'verbose',
      'teamId',
      'channelId',
      'appId',
      'appName',
      'entityId',
      'contentUrl',
      'removeUrl',
      'websiteUrl',
      'output'
    ];
    if (options.appName) {
      requestBody.displayName = options.appName;
    }
    if (options.appId) {
      requestBody['teamsApp@odata.bind'] = `https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/${options.appId}`;
    }
    if (options.contentUrl) {
      requestBody.configuration.contentUrl = options.contentUrl;
    }
    options.entityId ? requestBody.configuration.entityId = options.entityId : null;
    options.removeUrl ? requestBody.configuration.removeUrl = options.removeUrl : null;
    options.websiteUrl ? requestBody.configuration.websiteUrl = options.websiteUrl : null;
    Object.keys(options).forEach(key => {
      if (excludeOptions.indexOf(key) === -1) {
        requestBody.configuration[key] = `${(<any>options)[key]}`;
      }
    });
    return requestBody;
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Remarks:

    The corresponding app must already be installed in the team.

  Examples:
  
    Add teams tab for website
      ${this.name} --teamId 00000000-0000-0000-0000-000000000000 --channelId 19:00000000000000000000000000000000@thread.skype --appId 06805b9e-77e3-4b93-ac81-525eb87513b8 --appName 'My Contoso Tab' --contentUrl 'https://www.contoso.com/Orders/2DCA2E6C7A10415CAF6B8AB6661B3154/tabView' 
   
    Add teams tab for website with additional configuration which is unknown
      ${this.name} --teamId 00000000-0000-0000-0000-000000000000 --channelId 19:00000000000000000000000000000000@thread.skype --appId 06805b9e-77e3-4b93-ac81-525eb87513b8 --appName 'My Contoso Tab' --contentUrl 'https://www.contoso.com/Orders/2DCA2E6C7A10415CAF6B8AB6661B3154/tabView' --test1 'value for test1'
  `);
  }
}

module.exports = new TeamsTabAddCommand();