import commands from '../../commands';
import request from '../../../../request';
import SpoCommand from '../../../base/SpoCommand';
import { CommandOption, CommandValidate, CommandCancel } from '../../../../Command';
import GlobalOptions from '../../../../GlobalOptions';
import { FormDigestInfo } from '../../spo';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  siteUrl: string;
  newSiteUrl: string;
  newSiteTitle?: string;
  suppressMarketplaceAppCheck?: boolean;
  suppressWorkflow2013Check?: boolean;
  wait?: boolean;
}

interface SiteRenameJob {
  ErrorDescription: string;
  JobState: string;
}

class SpoSiteRenameCommand extends SpoCommand {
  private context?: FormDigestInfo;
  private timeout?: NodeJS.Timer;
  private operationData?: SiteRenameJob;
  private static readonly checkIntervalInMs: number = 5000;

  public get name(): string {
    return commands.SITE_RENAME;
  }

  public get description(): string {
    return 'Renames the URL and title of a site collection';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.newSiteTitle = args.options.newSiteTitle ? true : false;
    telemetryProps.suppressMarketplaceAppCheck = args.options.suppressMarketplaceAppCheck;
    telemetryProps.suppressWorkflow2013Check = args.options.suppressWorkflow2013Check;
    telemetryProps.wait = args.options.wait;
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    let spoAdminUrl: string = "";
    let options = args.options;

    this
      .getSpoAdminUrl(cmd, this.debug)
      .then((_spoAdminUrl: string): Promise<FormDigestInfo> => {
        spoAdminUrl = _spoAdminUrl;

        return this.getRequestDigest(spoAdminUrl);
      })
      .then((res: FormDigestInfo): Promise<SiteRenameJob> => {
        this.context = res;
        if (this.verbose) {
          cmd.log(`Scheduling rename job...`);
        }

        let optionsBitmask = 0;
        if (options.suppressMarketplaceAppCheck) {
          optionsBitmask = optionsBitmask | 8;
        }

        if (options.suppressWorkflow2013Check) {
          optionsBitmask = optionsBitmask | 16;
        }

        const requestOptions = {
          "SourceSiteUrl": options.siteUrl,
          "TargetSiteUrl": options.newSiteUrl,
          "TargetSiteTitle": options.newSiteTitle || null,
          "Option": optionsBitmask,
          "Reserve": null,
          "SkipGestures": null,
          "OperationId": "00000000-0000-0000-0000-000000000000"
        };

        const postData: any = {
          url: `${spoAdminUrl}/_api/SiteRenameJobs?api-version=1.4.7`,
          headers: {
            'X-RequestDigest': this.context.FormDigestValue,
            'Content-Type': 'application/json'
          },
          json: true,
          body: requestOptions
        };

        return request.post(postData);
      })
      .then((res: SiteRenameJob): Promise<void> => {
        if (options.verbose) {
          cmd.log(res);
        }

        this.operationData = res;

        if (this.operationData.JobState && this.operationData.JobState === "Error") {
          return Promise.reject(this.operationData.ErrorDescription);
        }

        const isComplete: boolean = this.operationData.JobState === "Success";
        if (!options.wait || isComplete) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
          this.waitForRenameCompletion(
            this,
            true,
            spoAdminUrl,
            options.siteUrl,
            resolve,
            reject,
            0
          );
        });
      }).then((): void => {
        if (args.options.output === 'json') {
          cmd.log(this.operationData);
        }

        if (this.verbose) {
          cmd.log(vorpal.chalk.green('DONE'));
        }

        cb()
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  protected waitForRenameCompletion(command: SpoSiteRenameCommand, isVerbose: boolean, spoAdminUrl: string, siteUrl: string, resolve: () => void, reject: (error: any) => void, iteration: number): void {
    iteration++;

    const requestOptions: any = {
      url: `${spoAdminUrl}/_api/SiteRenameJobs/GetJobsBySiteUrl(url='${encodeURIComponent(siteUrl)}')?api-version=1.4.7`,
      headers: {
        'X-AttemptNumber': iteration.toString()
      },
      json: true
    };

    request
      .get<{ value: SiteRenameJob[] }>(requestOptions)
      .then((res: { value: SiteRenameJob[] }): void => {
        this.operationData = res.value[0];

        if (this.operationData.ErrorDescription) {
          reject(this.operationData.ErrorDescription);
          return;
        }

        if (this.operationData.JobState === "Success") {
          resolve();
          return;
        }

        command.timeout = setTimeout(() => {
          command.waitForRenameCompletion(command, isVerbose, spoAdminUrl, siteUrl, resolve, reject, iteration);
        }, SpoSiteRenameCommand.checkIntervalInMs);
      })
      .catch((ex: any) => {
        reject(ex);
      });
  }

  public cancel(): CommandCancel {
    return (): void => {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
    }
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --siteUrl <siteUrl>',
        description: 'The URL of the site to rename'
      },
      {
        option: '--newSiteUrl <newSiteUrl>',
        description: 'New URL for the site collection'
      },
      {
        option: '--newSiteTitle [newSiteTitle]',
        description: 'New title for the site'
      },
      {
        option: '--suppressMarketplaceAppCheck',
        description: 'Suppress marketplace app check'
      },
      {
        option: '--suppressWorkflow2013Check',
        description: 'Suppress 2013 workflow check'
      },
      {
        option: '--wait',
        description: 'Wait for the job to complete'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.newSiteUrl) {
        return 'A new url must be provided.';
      }

      if (args.options.siteUrl.toLowerCase() === args.options.newSiteUrl.toLowerCase()) {
        return 'The new URL cannot be the same as the target URL.';
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());

    log(
      `  ${chalk.yellow('Important:')} to use this command you must have permissions to access
    the tenant admin site.
  
  Remarks:

    Renaming site collections is by default asynchronous and depending on the
    current state of Microsoft 365, might take up to few minutes. If you're
    building a script with steps that require the operation to complete fully,
    you should use the  ${chalk.blue('--wait')} flag. When using this flag, the ${chalk.blue(this.getCommandName())}
    command  will keep running until it receives confirmation from Microsoft 365 
    that the site rename operation has completed.

  Examples:
  
    Starts the rename of the site collection with name "samplesite" to "renamed"
    without modifying the title
      ${commands.SITE_RENAME}  --siteUrl http://contoso.sharepoint.com/samplesite --newSiteUrl http://contoso.sharepoint.com/renamed

    Starts the rename of the site collection with name "samplesite" to "renamed"
    modifying the title of the site to "New Title"
      ${commands.SITE_RENAME} --siteUrl http://contoso.sharepoint.com/samplesite --newSiteUrl http://contoso.sharepoint.com/renamed --newSiteTitle "New Title"

    Renames the specified site collection and waits for the operation to
    complete
      ${commands.SITE_RENAME} --siteUrl http://contoso.sharepoint.com/samplesite --newSiteUrl http://contoso.sharepoint.com/renamed --newSiteTitle "New Title" --wait
`);
  }
}

module.exports = new SpoSiteRenameCommand();
