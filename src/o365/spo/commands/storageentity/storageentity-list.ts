import request from '../../../../request';
import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import {
  CommandOption,
  CommandValidate
} from '../../../../Command';
import SpoCommand from '../../../base/SpoCommand';
import { TenantProperty } from './TenantProperty';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  appCatalogUrl: string;
}

class SpoStorageEntityListCommand extends SpoCommand {
  public get name(): string {
    return `${commands.STORAGEENTITY_LIST}`;
  }

  public get description(): string {
    return 'Lists tenant properties stored on the specified SharePoint Online app catalog';
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    if (this.verbose) {
      cmd.log(`Retrieving details for all tenant properties in ${args.options.appCatalogUrl}...`);
    }

    const requestOptions: any = {
      url: `${args.options.appCatalogUrl}/_api/web/AllProperties?$select=storageentitiesindex`,
      headers: {
        accept: 'application/json;odata=nometadata'
      },
      json: true
    };

    request
      .get<{ storageentitiesindex?: string }>(requestOptions)
      .then((web: { storageentitiesindex?: string }): void => {
        try {
          if (!web.storageentitiesindex ||
            web.storageentitiesindex.trim().length === 0) {
            if (this.verbose) {
              cmd.log('No tenant properties found');
            }
            cb();
            return;
          }

          const properties: { [key: string]: TenantProperty } = JSON.parse(web.storageentitiesindex);
          const keys: string[] = Object.keys(properties);
          if (keys.length === 0) {
            if (this.verbose) {
              cmd.log('No tenant properties found');
            }
          }
          else {
            cmd.log(keys.map((key: string): any => {
              const property: TenantProperty = properties[key];
              return {
                Key: key,
                Value: property.Value,
                Description: property.Description,
                Comment: property.Comment
              }
            }));
          }
          cb();
        }
        catch (e) {
          this.handleError(e, cmd, cb);
        }
      }, (err: any): void => this.handleRejectedPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [{
      option: '-u, --appCatalogUrl <appCatalogUrl>',
      description: 'URL of the app catalog site'
    }];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      const result: boolean | string = SpoCommand.isValidSharePointUrl(args.options.appCatalogUrl);
      if (result === false) {
        return 'Missing required option appCatalogUrl';
      }
      else {
        return result;
      }
    };
  }

  public commandHelp(args: CommandArgs, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(commands.STORAGEENTITY_LIST).helpInformation());
    log(
      `  Remarks:

    Tenant properties are stored in the app catalog site. To list all tenant
    properties, you have to specify the absolute URL of the app catalog site.
    If you specify an incorrect URL, or the site at the given URL is not an
    app catalog site, no properties will be retrieved.

  Examples:
  
    List all tenant properties stored in the
    ${chalk.grey('https://contoso.sharepoint.com/sites/appcatalog')} app catalog site
      ${commands.STORAGEENTITY_LIST} --appCatalogUrl https://contoso.sharepoint.com/sites/appcatalog

  More information:

    SharePoint Framework Tenant Properties
      https://docs.microsoft.com/en-us/sharepoint/dev/spfx/tenant-properties
`);
  }
}

module.exports = new SpoStorageEntityListCommand();