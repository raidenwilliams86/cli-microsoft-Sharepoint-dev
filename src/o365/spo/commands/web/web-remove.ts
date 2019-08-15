import request from '../../../../request';
import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import {
  CommandOption,
  CommandValidate
} from '../../../../Command';
import SpoCommand from '../../../base/SpoCommand';
const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  webUrl: string;
  confirm?: boolean;
}

class SpoWebAddCommand extends SpoCommand {
  public get name(): string {
    return commands.WEB_REMOVE;
  }

  public get description(): string {
    return 'Delete specified subsite';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.confirm = (!(!args.options.confirm)).toString();
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const removeWeb = (): void => {
      const requestOptions: any = {
        url: `${encodeURI(args.options.webUrl)}/_api/web`,
        headers: {
          accept: 'application/json;odata=nometadata',
          'X-HTTP-Method': 'DELETE'
        },
        json: true
      };

      if (this.verbose) {
        cmd.log(`Deleting subsite ${args.options.webUrl} ...`);
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

    if (args.options.confirm) {
      removeWeb();
    }
    else {
      cmd.prompt({
        type: 'confirm',
        name: 'continue',
        default: false,
        message: `Are you sure you want to remove the subsite ${args.options.webUrl}`,
      }, (result: { continue: boolean }): void => {
        if (!result.continue) {
          cb();
        }
        else {
          removeWeb();
        }
      });
    }
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --webUrl <webUrl>',
        description: 'URL of the subsite to remove'
      },
      {
        option: '--confirm',
        description: 'Do not prompt for confirmation before deleting the subsite'
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

      const isValidUrl: boolean | string = SpoCommand.isValidSharePointUrl(args.options.webUrl);
      if (typeof isValidUrl === 'string') {
        return isValidUrl;
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Examples:
  
    Delete subsite without prompting for confirmation
      ${commands.WEB_REMOVE} --webUrl https://contoso.sharepoint.com/subsite --confirm
  ` );
  }
}

module.exports = new SpoWebAddCommand();