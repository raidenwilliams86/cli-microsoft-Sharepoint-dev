import request from '../../../../request';
import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import SpoCommand from '../../../base/SpoCommand';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: GlobalOptions;
}

class SpoHomeSiteGetCommand extends SpoCommand {
  public get name(): string {
    return commands.HOMESITE_GET;
  }

  public get description(): string {
    return 'Gets information about the Home Site';
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    this
      .getSpoUrl(cmd, this.debug)
      .then((spoUrl: string): Promise<{ "odata.null"?: boolean }> => {
        const requestOptions: any = {
          url: `${spoUrl}/_api/SP.SPHSite/Details`,
          headers: {
            accept: 'application/json;odata=nometadata'
          },
          json: true
        };

        return request.get(requestOptions);
      })
      .then((res: { "odata.null"?: boolean }): void => {
        if (!res["odata.null"]) {
          cmd.log(res);
        }

        if (this.verbose) {
          cmd.log(vorpal.chalk.green('DONE'));
        }

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public commandHelp(args: CommandArgs, log: (help: string) => void): void {
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Examples:
  
    Get information about the Home Site
      ${commands.HOMESITE_GET}

  More information:

    SharePoint home sites: a landing for your organization on the intelligent
    intranet
      https://techcommunity.microsoft.com/t5/Microsoft-SharePoint-Blog/SharePoint-home-sites-a-landing-for-your-organization-on-the/ba-p/621933
`);
  }
}

module.exports = new SpoHomeSiteGetCommand();