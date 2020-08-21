import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import {
  CommandOption,
  CommandValidate
} from '../../../../Command';
import SpoCommand from '../../../base/SpoCommand';
import Utils from '../../../../Utils';
import { ListInstance } from "./ListInstance";

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  webUrl: string;
  id?: string;
  title?: string;
}

class ListGetCommand extends SpoCommand {
  public get name(): string {
    return commands.LIST_GET;
  }

  public get description(): string {
    return 'Gets information about the specific list';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.id = (!(!args.options.id)).toString();
    telemetryProps.title = (!(!args.options.title)).toString();
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    if (this.verbose) {
      cmd.log(`Retrieving information for list in site at ${args.options.webUrl}...`);
    }

    let requestUrl: string = '';

    if (args.options.id) {
      requestUrl = `${args.options.webUrl}/_api/web/lists(guid'${encodeURIComponent(args.options.id)}')`;
    }
    else {
      requestUrl = `${args.options.webUrl}/_api/web/lists/GetByTitle('${encodeURIComponent(args.options.title as string)}')`;
    }

    const requestOptions: any = {
      url: requestUrl,
      method: 'GET',
      headers: {
        'accept': 'application/json;odata=nometadata'
      },
      json: true
    };

    request
      .get<ListInstance>(requestOptions)
      .then((listInstance: ListInstance): void => {
        cmd.log(listInstance);

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --webUrl <webUrl>',
        description: 'URL of the site where the list to retrieve is located'
      },
      {
        option: '-i, --id [id]',
        description: 'ID of the list to retrieve information for. Specify either id or title but not both'
      },
      {
        option: '-t, --title [title]',
        description: 'Title of the list to retrieve information for. Specify either id or title but not both'
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

      if (args.options.id) {
        if (!Utils.isValidGuid(args.options.id)) {
          return `${args.options.id} is not a valid GUID`;
        }
      }

      if (args.options.id && args.options.title) {
        return 'Specify id or title, but not both';
      }

      if (!args.options.id && !args.options.title) {
        return 'Specify id or title, one is required';
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Examples:
  
    Return information about a list with ID ${chalk.grey('0cd891ef-afce-4e55-b836-fce03286cccf')}
    located in site ${chalk.grey('https://contoso.sharepoint.com/sites/project-x')}
      ${commands.LIST_GET} --webUrl https://contoso.sharepoint.com/sites/project-x --id 0cd891ef-afce-4e55-b836-fce03286cccf

    Return information about a list with title ${chalk.grey('Documents')} located in site
    ${chalk.grey('https://contoso.sharepoint.com/sites/project-x')}
      ${commands.LIST_GET} --webUrl https://contoso.sharepoint.com/sites/project-x --title Documents
      `);
  }
}

module.exports = new ListGetCommand();