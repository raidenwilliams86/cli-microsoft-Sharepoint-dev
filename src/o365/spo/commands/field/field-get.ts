import auth from '../../SpoAuth';
import config from '../../../../config';
import * as request from 'request-promise-native';
import commands from '../../commands';
import {
  CommandOption, CommandValidate
} from '../../../../Command';
import SpoCommand from '../../SpoCommand';
import Utils from '../../../../Utils';
import GlobalOptions from '../../../../GlobalOptions';
import { Auth } from '../../../../Auth';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  webUrl: string;
  listId?: string;
  listTitle?: string;
  listUrl?: string;
  id?: string;
  fieldTitle?: string;
}

class SpoFieldGetCommand extends SpoCommand {
  public get name(): string {
    return `${commands.FIELD_GET}`;
  }

  public get description(): string {
    return 'Retrieves information about the specified list- or site column';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.listId = typeof args.options.listId !== 'undefined';
    telemetryProps.listTitle = typeof args.options.listTitle !== 'undefined';
    telemetryProps.listUrl = typeof args.options.listUrl !== 'undefined';
    telemetryProps.id = typeof args.options.id !== 'undefined';
    telemetryProps.fieldTitle = typeof args.options.fieldTitle !== 'undefined';
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const resource: string = Auth.getResourceFromUrl(args.options.webUrl);
    let siteAccessToken: string = '';

    auth
      .getAccessToken(resource, auth.service.refreshToken as string, cmd, this.debug)
      .then((accessToken: string): request.RequestPromise => {
        siteAccessToken = accessToken;

        if (this.debug) {
          cmd.log(`Retrieved access token ${accessToken}.`);
        }

        let listRestUrl: string = '';

        if (args.options.listId) {
          listRestUrl = `lists(guid'${encodeURIComponent(args.options.listId)}')/`;
        }
        else if (args.options.listTitle) {
          listRestUrl = `lists/getByTitle('${encodeURIComponent(args.options.listTitle as string)}')/`;
        }
        else if (args.options.listUrl) {
          const listServerRelativeUrl: string = Utils.getServerRelativePath(args.options.webUrl, args.options.listUrl);

          listRestUrl = `GetList('${encodeURIComponent(listServerRelativeUrl)}')/`;
        }

        let fieldRestUrl: string = '';
        if (args.options.id) {
          fieldRestUrl = `/getbyid('${encodeURIComponent(args.options.id)}')`;
        }
        else {
          fieldRestUrl = `/getbyinternalnameortitle('${encodeURIComponent(args.options.fieldTitle as string)}')`;
        }

        const requestOptions: any = {
          url: `${args.options.webUrl}/_api/web/${listRestUrl}fields${fieldRestUrl}`,
          headers: Utils.getRequestHeaders({
            authorization: `Bearer ${siteAccessToken}`,
            accept: 'application/json;odata=nometadata'
          }),
          json: true
        };

        if (this.debug) {
          cmd.log('Executing web request...');
          cmd.log(requestOptions);
          cmd.log('');
        }

        return request.get(requestOptions);
      })
      .then((res: any): void => {
        if (this.debug) {
          cmd.log('Response:');
          cmd.log(res);
          cmd.log('');
        }

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
        option: '-u, --webUrl <webUrl>',
        description: 'Absolute URL of the site where the field is located'
      },
      {
        option: '-l, --listTitle [listTitle]',
        description: 'Title of the list where the field is located. Specify only one of listTitle, listId or listUrl'
      },
      {
        option: '--listId [listId]',
        description: 'ID of the list where the field is located. Specify only one of listTitle, listId or listUrl'
      },
      {
        option: '--listUrl [listUrl]',
        description: 'Server- or web-relative URL of the list where the field is located. Specify only one of listTitle, listId or listUrl'
      },
      {
        option: '-i, --id [id]',
        description: 'The ID of the field to retrieve. Specify id or fieldTitle but not both'
      },
      {
        option: '--fieldTitle [fieldTitle]',
        description: 'The display name (case-sensitive) of the field to retrieve. Specify id or fieldTitle but not both'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.webUrl) {
        return 'Required parameter url missing';
      }

      const isValidSharePointUrl: boolean | string = SpoCommand.isValidSharePointUrl(args.options.webUrl);
      if (isValidSharePointUrl !== true) {
        return isValidSharePointUrl;
      }

      if (!args.options.id && !args.options.fieldTitle) {
        return 'Specify id or fieldTitle, one is required';
      }

      if (args.options.id && !Utils.isValidGuid(args.options.id)) {
        return `${args.options.id} is not a valid GUID`;
      }

      if (args.options.listId && !Utils.isValidGuid(args.options.listId)) {
        return `${args.options.listId} is not a valid GUID`;
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  ${chalk.yellow('Important:')} before using this command, log in to a SharePoint Online site using
    the ${chalk.blue(commands.LOGIN)} command.
        
  Remarks:
    To retrieve information about a field, you have to first log in to
    a SharePoint site using the ${chalk.blue(commands.LOGIN)} command,
    eg. ${chalk.grey(`${config.delimiter} ${commands.LOGIN} https://contoso.sharepoint.com`)}.

    If the specified field already exists, you will get an
    ${chalk.grey('Invalid field name')} error.

  Examples:
  
    Retrieves site column by id located in site ${chalk.grey('https://contoso.sharepoint.com/sites/contoso-sales')}
      ${chalk.grey(config.delimiter)} ${this.name} --webUrl https://contoso.sharepoint.com/sites/contoso-sales --id 5ee2dd25-d941-455a-9bdb-7f2c54aed11b
    
    Retrieves list column by id located in site ${chalk.grey('https://contoso.sharepoint.com/sites/contoso-sales')}. Retrieves the list by its title
      ${chalk.grey(config.delimiter)} ${this.name} --webUrl https://contoso.sharepoint.com/sites/contoso-sales --listTitle Events --id 5ee2dd25-d941-455a-9bdb-7f2c54aed11b

    Retrieves list column by display name located in site ${chalk.grey('https://contoso.sharepoint.com/sites/contoso-sales')}. Retrieves the list by its url
      ${chalk.grey(config.delimiter)} ${this.name} --webUrl https://contoso.sharepoint.com/sites/contoso-sales --listUrl 'Lists/Events' --fieldTitle 'Title'
`);
  }
}

module.exports = new SpoFieldGetCommand();