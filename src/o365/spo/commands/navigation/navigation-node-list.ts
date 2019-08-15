import request from '../../../../request';
import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import {
  CommandOption,
  CommandValidate
} from '../../../../Command';
import SpoCommand from '../../../base/SpoCommand';
import { NavigationNode } from './NavigationNode';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  location: string;
  webUrl: string;
}

class SpoNavigationNodeListCommand extends SpoCommand {
  public get name(): string {
    return `${commands.NAVIGATION_NODE_LIST}`;
  }

  public get description(): string {
    return 'Lists nodes from the specified site navigation';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.location = args.options.location;
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    if (this.verbose) {
      cmd.log(`Retrieving navigation nodes...`);
    }

    const requestOptions: any = {
      url: `${args.options.webUrl}/_api/web/navigation/${args.options.location.toLowerCase()}`,
      headers: {
        accept: 'application/json;odata=nometadata'
      },
      json: true
    };

    request
      .get<{ value: NavigationNode[] }>(requestOptions)
      .then((res: { value: NavigationNode[] }): void => {
        cmd.log(res.value.map(n => {
          return {
            Id: n.Id,
            Title: n.Title,
            Url: n.Url
          };
        }));

        if (this.verbose) {
          cmd.log(vorpal.chalk.green('DONE'));
        }

        cb();
      }, (rawRes: any): void => this.handleRejectedODataJsonPromise(rawRes, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --webUrl <webUrl>',
        description: 'Absolute URL of the site for which to retrieve navigation'
      },
      {
        option: '-l, --location <location>',
        description: 'Navigation type to retrieve. Available options: QuickLaunch|TopNavigationBar',
        autocomplete: ['QuickLaunch', 'TopNavigationBar']
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.webUrl) {
        return 'Required option webUrl missing';
      }

      const isValidSharePointUrl: boolean | string = SpoCommand.isValidSharePointUrl(args.options.webUrl);
      if (isValidSharePointUrl !== true) {
        return isValidSharePointUrl;
      }

      if (!args.options.location) {
        return 'Required option location missing';
      }
      else {
        if (args.options.location !== 'QuickLaunch' &&
          args.options.location !== 'TopNavigationBar') {
          return `${args.options.location} is not a valid value for the location option. Allowed values are QuickLaunch|TopNavigationBar`;
        }
      }

      return true;
    };
  }

  public commandHelp(args: CommandArgs, log: (message: string) => void): void {
    log(vorpal.find(commands.NAVIGATION_NODE_LIST).helpInformation());
    log(
      `  Examples:
  
    Retrieve nodes from the top navigation
      ${commands.NAVIGATION_NODE_LIST} --webUrl https://contoso.sharepoint.com/sites/team-a --location TopNavigationBar

    Retrieve nodes from the quick launch
      ${commands.NAVIGATION_NODE_LIST} --webUrl https://contoso.sharepoint.com/sites/team-a --location QuickLaunch
`);
  }
}

module.exports = new SpoNavigationNodeListCommand();