import config from '../../../../config';
import commands from '../../commands';
import request from '../../../../request';
import SpoCommand from '../../../base/SpoCommand';
import Utils from '../../../../Utils';
import { CommandOption, CommandValidate, CommandCancel } from '../../../../Command';
import GlobalOptions from '../../../../GlobalOptions';
import { ClientSvcResponse, ClientSvcResponseContents, FormDigestInfo } from '../../spo';
import { SpoOperation } from './SpoOperation';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  url: string;
  skipRecycleBin?: boolean;
  fromRecycleBin?: boolean;
  wait: boolean;
  confirm?: boolean;
}

class SpoSiteRemoveCommand extends SpoCommand {
  private context?: FormDigestInfo;
  private spoAdminUrl?: string;
  private dots?: string;
  private timeout?: NodeJS.Timer;

  public get name(): string {
    return commands.SITE_REMOVE;
  }

  public get description(): string {
    return 'Removes the specified site';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.skipRecycleBin = (!(!args.options.skipRecycleBin)).toString();
    telemetryProps.fromRecycleBin = (!(!args.options.fromRecycleBin)).toString();
    telemetryProps.wait = args.options.wait;
    telemetryProps.confirm = (!(!args.options.confirm)).toString();
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const removeSite = (): void => {
      this.dots = '';

      this
        .getSpoAdminUrl(cmd, this.debug)
        .then((_spoAdminUrl: string): Promise<FormDigestInfo> => {
          this.spoAdminUrl = _spoAdminUrl;

          return this.ensureFormDigest(this.spoAdminUrl, cmd, this.context, this.debug);
        })
        .then((res: FormDigestInfo): Promise<void> => {
          this.context = res;

          if (args.options.fromRecycleBin) {
            if (this.verbose) {
              cmd.log(`Deleting site collection from recycle bin ${args.options.url}...`);
            }

            return this.deleteSiteFromTheRecycleBin(args.options.url, args.options.wait, cmd);
          }
          else {
            if (this.verbose) {
              cmd.log(`Deleting site collection ${args.options.url}...`);
            }

            return this.deleteSite(args.options.url, args.options.wait, cmd);
          }
        })
        .then((): Promise<void> => {
          if (args.options.skipRecycleBin) {
            if (this.verbose) {
              cmd.log(`Also deleting site collection from recycle bin ${args.options.url}...`)
            }
            return this.deleteSiteFromTheRecycleBin(args.options.url, args.options.wait, cmd);
          }
          else {
            return Promise.resolve();
          }
        })
        .then((): void => {
          if (this.verbose) {
            cmd.log(vorpal.chalk.green('DONE'));
          }

          cb();
        }, (err: any): void => this.handleRejectedPromise(err, cmd, cb));
    }

    if (args.options.confirm) {
      removeSite();
    }
    else {
      cmd.prompt({
        type: 'confirm',
        name: 'continue',
        default: false,
        message: `Are you sure you want to remove the site ${args.options.url}?`,
      }, (result: { continue: boolean }): void => {
        if (!result.continue) {
          cb();
        }
        else {
          removeSite();
        }
      });
    }
  }

  public cancel(): CommandCancel {
    return (): void => {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
    }
  }

  private deleteSite(url: string, wait: boolean, cmd: CommandInstance): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
      this
        .ensureFormDigest(this.spoAdminUrl as string, cmd, this.context, this.debug)
        .then((res: FormDigestInfo): Promise<string> => {
          this.context = res;

          if (this.verbose) {
            cmd.log(`Deleting site ${url} ...`);
          }

          const requestOptions: any = {
            url: `${this.spoAdminUrl}/_vti_bin/client.svc/ProcessQuery`,
            headers: {
              'X-RequestDigest': this.context.FormDigestValue
            },
            body: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="55" ObjectPathId="54"/><ObjectPath Id="57" ObjectPathId="56"/><Query Id="58" ObjectPathId="54"><Query SelectAllProperties="true"><Properties/></Query></Query><Query Id="59" ObjectPathId="56"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true"/><Property Name="PollingInterval" ScalarProperty="true"/></Properties></Query></Query></Actions><ObjectPaths><Constructor Id="54" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}"/><Method Id="56" ParentId="54" Name="RemoveSite"><Parameters><Parameter Type="String">${Utils.escapeXml(url)}</Parameter></Parameters></Method></ObjectPaths></Request>`
          };

          return request.post(requestOptions);
        })
        .then((res: string): void => {
          const json: ClientSvcResponse = JSON.parse(res);
          const response: ClientSvcResponseContents = json[0];
          if (response.ErrorInfo) {
            reject(response.ErrorInfo.ErrorMessage);
          }
          else {
            const operation: SpoOperation = json[json.length - 1];
            const isComplete: boolean = operation.IsComplete;
            if (!wait || isComplete) {
              resolve();
              return;
            }

            setTimeout(() => {
              this.waitUntilFinished(JSON.stringify(operation._ObjectIdentity_), this.spoAdminUrl as string, resolve, reject, cmd, this.context as FormDigestInfo, this.dots, this.timeout);
            }, operation.PollingInterval);
          }
        });
    });
  }

  private deleteSiteFromTheRecycleBin(url: string, wait: boolean, cmd: CommandInstance): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
      this
        .ensureFormDigest(this.spoAdminUrl as string, cmd, this.context, this.debug)
        .then((res: FormDigestInfo): Promise<string> => {
          this.context = res;
          if (this.verbose) {
            cmd.log(`Deleting site ${url} from the recycle bin...`);
          }

          const requestOptions: any = {
            url: `${this.spoAdminUrl}/_vti_bin/client.svc/ProcessQuery`,
            headers: {
              'X-RequestDigest': this.context.FormDigestValue
            },
            body: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="185" ObjectPathId="184" /><Query Id="186" ObjectPathId="184"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Method Id="184" ParentId="175" Name="RemoveDeletedSite"><Parameters><Parameter Type="String">${Utils.escapeXml(url)}</Parameter></Parameters></Method><Constructor Id="175" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`
          };

          return request.post(requestOptions);
        })
        .then((res: string): void => {
          const json: ClientSvcResponse = JSON.parse(res);
          const response: ClientSvcResponseContents = json[0];
          if (response.ErrorInfo) {
            reject(response.ErrorInfo.ErrorMessage);
          }
          else {
            const operation: SpoOperation = json[json.length - 1];
            const isComplete: boolean = operation.IsComplete;
            if (!wait || isComplete) {
              resolve();
              return;
            }

            setTimeout(() => {
              this.waitUntilFinished(JSON.stringify(operation._ObjectIdentity_), this.spoAdminUrl as string, resolve, reject, cmd, this.context as FormDigestInfo, this.dots, this.timeout);
            }, operation.PollingInterval);
          }
        });
    });
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --url <url>',
        description: 'URL of the site to remove'
      },
      {
        option: '--skipRecycleBin',
        description: 'Set to directly remove the site without moving it to the Recycle Bin'
      },
      {
        option: '--fromRecycleBin',
        description: 'Set to remove the site from the Recycle Bin'
      },
      {
        option: '--wait',
        description: 'Wait for the site to be removed before completing the command'
      },
      {
        option: '--confirm',
        description: 'Don\'t prompt for confirming removing the site'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.url) {
        return 'Required parameter url missing';
      }

      const isValidSharePointUrl: boolean | string = SpoCommand.isValidSharePointUrl(args.options.url);
      if (isValidSharePointUrl !== true) {
        return isValidSharePointUrl;
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  ${chalk.yellow('Important:')} to use this command you have to have permissions to access
    the tenant admin site.

  Remarks:

    Deleting a site collection is by default asynchronous and depending on the
    current state of Microsoft 365, might take up to few minutes.
    If you're building a script with steps that require the site to be
    fully deleted, you should use the ${chalk.blue('--wait')} flag. When using this flag,
    the ${chalk.blue(this.getCommandName())} command will keep running until it received
    confirmation from Microsoft 365 that the site has been fully deleted.

  Examples:

    Remove the specified site and place it in the Recycle Bin
      ${commands.SITE_REMOVE} --url https://contoso.sharepoint.com/sites/demosite 

    Remove the site without moving it to the Recycle Bin
      ${commands.SITE_REMOVE} --url https://contoso.sharepoint.com/sites/demosite --skipRecycleBin

    Remove the previously deleted site from the Recycle Bin
      ${commands.SITE_REMOVE} --url https://contoso.sharepoint.com/sites/demosite --fromRecycleBin

    Remove the site without moving it to the Recycle Bin and wait for completion 
      ${commands.SITE_REMOVE} --url https://contoso.sharepoint.com/sites/demosite --wait --skipRecycleBin
`);
  }
}

module.exports = new SpoSiteRemoveCommand();