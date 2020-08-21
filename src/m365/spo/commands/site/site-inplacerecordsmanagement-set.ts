import commands from '../../commands';
import request from '../../../../request';
import GlobalOptions from '../../../../GlobalOptions';
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
  siteUrl: string;
  enabled: string;
}

class SpoSiteInPlaceRecordsManagementSetCommand extends SpoCommand {
  public get name(): string {
    return commands.SITE_INPLACERECORDSMANAGEMENT_SET;
  }

  public get description(): string {
    return 'Activates or deactivates in-place records management for a site collection';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.enabled = args.options.enabled;
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    const enabled: boolean = args.options.enabled.toLocaleLowerCase() === 'true';

    const requestOptions: any = {
      url: `${args.options.siteUrl}/_api/site/features/${enabled ? 'add' : 'remove'}`,
      headers: {
        accept: 'application/json;odata=nometadata'
      },
      body: {
        featureId: 'da2e115b-07e4-49d9-bb2c-35e93bb9fca9',
        force: true
      },
      json: true
    };

    if (this.verbose) {
      cmd.log(`${enabled ? 'Activating' : 'Deactivating'} in-place records management for site ${args.options.siteUrl}`);
    }

    request
      .post(requestOptions)
      .then((): void => {
        if (this.verbose) {
          cmd.log(vorpal.chalk.green('DONE'));
        }

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --siteUrl <siteUrl>',
        description: 'The URL of the site on which to activate or deactivate in-place records management'
      },
      {
        option: '--enabled <enabled>',
        description: 'Set to "true" to activate in-place records management and to "false" to deactivate it'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.siteUrl) {
        return 'Required option siteUrl missing';
      }

      if (!args.options.enabled) {
        return 'Required option enabled missing';
      }

      if (!Utils.isValidBoolean(args.options.enabled)) {
        return 'Invalid "enabled" option value. Specify "true" or "false"';
      }

      return SpoCommand.isValidSharePointUrl(args.options.siteUrl);
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Examples:
  
    Activates in-place records management for site
    ${chalk.grey('https://contoso.sharepoint.com/sites/team-a')}
      ${commands.SITE_INPLACERECORDSMANAGEMENT_SET} --siteUrl https://contoso.sharepoint.com/sites/team-a --enabled true

    Deactivates in-place records management for site
    ${chalk.grey('https://contoso.sharepoint.com/sites/team-a')}
      ${commands.SITE_INPLACERECORDSMANAGEMENT_SET} --siteUrl https://contoso.sharepoint.com/sites/team-a --enabled false
  ` );
  }
}

module.exports = new SpoSiteInPlaceRecordsManagementSetCommand();