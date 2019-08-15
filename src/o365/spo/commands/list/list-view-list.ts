import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import {
  CommandOption,
  CommandValidate
} from '../../../../Command';
import SpoCommand from '../../../base/SpoCommand';
import Utils from '../../../../Utils';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  webUrl: string;
  listId?: string;
  listTitle?: string;
}

class SpoListViewListCommand extends SpoCommand {
  public get name(): string {
    return commands.LIST_VIEW_LIST;
  }

  public get description(): string {
    return 'Lists views configured on the specified list';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.listId = typeof args.options.listId !== 'undefined';
    telemetryProps.listTitle = typeof args.options.listTitle !== 'undefined';
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    if (this.verbose) {
      const list: string = args.options.listId ? encodeURIComponent(args.options.listId as string) : encodeURIComponent(args.options.listTitle as string);
      cmd.log(`Retrieving views information for list ${list} in site at ${args.options.webUrl}...`);
    }

    let requestUrl: string = '';

    if (args.options.listId) {
      requestUrl = `${args.options.webUrl}/_api/web/lists(guid'${encodeURIComponent(args.options.listId)}')/views`;
    }
    else {
      requestUrl = `${args.options.webUrl}/_api/web/lists/GetByTitle('${encodeURIComponent(args.options.listTitle as string)}')/views`;
    }

    const requestOptions: any = {
      url: requestUrl,
      headers: {
        'accept': 'application/json;odata=nometadata'
      },
      json: true
    };

    request
      .get(requestOptions)
      .then((res: any): void => {
        if (args.options.output === 'json') {
          cmd.log(res.value);
        }
        else {
          cmd.log(res.value.map((vw: any) => {
            return {
              Id: vw.Id,
              Title: vw.Title,
              DefaultView: vw.DefaultView,
              Hidden: vw.Hidden,
              BaseViewId: vw.BaseViewId
            };
          }));
        }

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --webUrl <webUrl>',
        description: 'URL of the site where the list is located'
      },
      {
        option: '-i, --listId [listId]',
        description: 'ID of the list for which to list configured views. Specify listId or listTitle but not both'
      },
      {
        option: '-t, --listTitle [listTitle]',
        description: 'Title of the list for which to list configured views. Specify listId or listTitle but not both'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.webUrl) {
        return 'Required parameter webUrl missing';
      }

      const isValidSharePointUrl: boolean | string = SpoCommand.isValidSharePointUrl(args.options.webUrl);
      if (isValidSharePointUrl !== true) {
        return isValidSharePointUrl;
      }

      if (args.options.listId) {
        if (!Utils.isValidGuid(args.options.listId)) {
          return `${args.options.listId} is not a valid GUID`;
        }
      }

      if (args.options.listId && args.options.listTitle) {
        return 'Specify listId or listTitle, but not both';
      }

      if (!args.options.listId && !args.options.listTitle) {
        return 'Specify listId or listTitle, one is required';
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Examples:

    List all views for a list with title ${chalk.grey('Documents')} located in site
    ${chalk.grey('https://contoso.sharepoint.com/sites/project-x')}
      ${commands.LIST_VIEW_LIST} --webUrl https://contoso.sharepoint.com/sites/project-x --listTitle Documents

    List all views for a list with ID ${chalk.grey('0cd891ef-afce-4e55-b836-fce03286cccf')}
    located in site ${chalk.grey('https://contoso.sharepoint.com/sites/project-x')}
      ${commands.LIST_VIEW_LIST} --webUrl https://contoso.sharepoint.com/sites/project-x --listId 1f187321-f086-4d3d-8523-517e94cc9df9
    `);
  }
}

module.exports = new SpoListViewListCommand(); 