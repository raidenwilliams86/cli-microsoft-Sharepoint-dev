import auth from '../SpoAuth';
import { ContextInfo } from '../spo';
import { Auth, AuthType } from '../../../Auth';
import config from '../../../config';
import * as request from 'request-promise-native';
import commands from '../commands';
import GlobalOptions from '../../../GlobalOptions';
import Command, {
  CommandCancel,
  CommandOption,
  CommandValidate,
  CommandError
} from '../../../Command';
import SpoCommand from '../SpoCommand';
import Utils from '../../../Utils';
import appInsights from '../../../appInsights';

const vorpal: Vorpal = require('../../../vorpal-init');

interface CommandArgs {
  url: string;
  options: Options;
}

interface Options extends GlobalOptions {
  authType?: string;
  userName?: string;
  password?: string;
}

class SpoLoginCommand extends Command {
  public get name(): string {
    return `${commands.LOGIN} <url>`;
  }

  public get description(): string {
    return 'Log in to SharePoint Online';
  }

  public alias(): string[] | undefined {
    return [commands.CONNECT];
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    const chalk: any = vorpal.chalk;

    this.showDeprecationWarning(cmd, commands.CONNECT, commands.LOGIN);

    appInsights.trackEvent({
      name: this.getUsedCommandName(cmd)
    });

    // disconnect before re-connecting
    if (this.debug) {
      cmd.log(`Logging out from SPO...`);
    }

    const logout: () => void = (): void => {
      auth.site.logout();
      if (this.verbose) {
        cmd.log(chalk.green('DONE'));
      }
    }

    const login: () => void = (): void => {
      if (this.verbose) {
        cmd.log(`Logging in to SharePoint Online at ${args.url}...`);
      }

      const resource = Auth.getResourceFromUrl(args.url);
      auth.site.url = args.url;

      if (args.options.authType === 'password') {
        auth.service.authType = AuthType.Password;
        auth.service.userName = args.options.userName;
        auth.service.password = args.options.password;
      }

      if (auth.site.isTenantAdminSite()) {
        auth
          .ensureAccessToken(resource, cmd, this.debug)
          .then((accessToken: string): request.RequestPromise => {
            auth.service.resource = resource;
            auth.site.url = args.url;
            if (this.verbose) {
              cmd.log(chalk.green('DONE'));
            }

            const requestDigestRequestOptions: any = {
              url: `${auth.site.url}/_api/contextinfo`,
              headers: Utils.getRequestHeaders({
                authorization: `Bearer ${accessToken}`,
                accept: 'application/json;odata=nometadata'
              }),
              json: true
            };

            if (this.debug) {
              cmd.log(`${auth.site.url} is a tenant admin site. Get tenant information...`);
              cmd.log('');
              cmd.log('Executing web request:');
              cmd.log(requestDigestRequestOptions);
              cmd.log('');
            }

            return request.post(requestDigestRequestOptions);
          })
          .then((res: ContextInfo): request.RequestPromise => {
            if (this.debug) {
              cmd.log('Response:');
              cmd.log(res);
              cmd.log('');
            }

            const tenantInfoRequestOptions = {
              url: `${auth.site.url}/_vti_bin/client.svc/ProcessQuery`,
              headers: Utils.getRequestHeaders({
                authorization: `Bearer ${auth.site.accessToken}`,
                'X-RequestDigest': res.FormDigestValue,
                accept: 'application/json;odata=nometadata'
              }),
              body: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="4" ObjectPathId="3" /><Query Id="5" ObjectPathId="3"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`
            };

            if (this.verbose) {
              cmd.log('Retrieving tenant admin site information...');
            }

            if (this.debug) {
              cmd.log('Executing web request:');
              cmd.log(tenantInfoRequestOptions);
              cmd.log('');
            }

            return request.post(tenantInfoRequestOptions);
          })
          .then((res: string): Promise<void> => {
            if (this.debug) {
              cmd.log('Response:');
              cmd.log(res);
              cmd.log('');
            }

            const json: string[] = JSON.parse(res);

            auth.site.tenantId = (json[json.length - 1] as any)._ObjectIdentity_.replace('\n', '&#xA;');
            auth.site.connected = true;
            return auth.storeSiteConnectionInfo();
          })
          .then((): void => {
            if (this.verbose) {
              cmd.log(chalk.green('DONE'));
              cmd.log(`Successfully logged in to ${args.url}`);
            }
            cb();
          }, (rej: string): void => {
            if (this.debug) {
              cmd.log('Error:');
              cmd.log(rej);
              cmd.log('');
            }

            if (rej !== 'Polling_Request_Cancelled') {
              cb(new CommandError(rej));
              return;
            }
            cb();
            return;
          });
      }
      else {
        auth
          .ensureAccessToken(resource, cmd, this.debug)
          .then((accessToken: string): Promise<void> => {
            auth.service.resource = resource;
            if (this.verbose) {
              cmd.log(chalk.green('DONE'));
            }

            auth.site.connected = true;
            return auth.storeSiteConnectionInfo();
          })
          .then((): void => {
            cb();
          }, (rej: string): void => {
            if (this.debug) {
              cmd.log('Error:');
              cmd.log(rej);
              cmd.log('');
            }

            if (rej !== 'Polling_Request_Cancelled') {
              cb(new CommandError(rej));
              return;
            }
            cb();
          });
      }
    }

    auth
      .clearSiteConnectionInfo()
      .then((): void => {
        logout();
        login();
      }, (error: any): void => {
        if (this.debug) {
          cmd.log(new CommandError(error));
        }

        logout();
        login();
      });
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-t, --authType [authType]',
        description: 'The type of authentication to use. Allowed values deviceCode|password. Default deviceCode',
        autocomplete: ['deviceCode', 'password']
      },
      {
        option: '-u, --userName [userName]',
        description: 'Name of the user to authenticate. Required when authType is set to password'
      },
      {
        option: '-p, --password [password]',
        description: 'Password for the user. Required when authType is set to password'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (args.options.authType === 'password') {
        if (!args.options.userName) {
          return 'Required option userName missing';
        }

        if (!args.options.password) {
          return 'Required option password missing';
        }
      }

      return SpoCommand.isValidSharePointUrl(args.url);
    };
  }

  public cancel(): CommandCancel {
    return (): void => {
      auth.cancel();
    }
  }

  public commandHelp(args: CommandArgs, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(commands.LOGIN).helpInformation());
    log(
      `  Arguments:
    
    url  absolute URL of the SharePoint Online site to log in to
        
  Remarks:

    Using the ${chalk.blue(commands.LOGIN)} command, you can log in to any SharePoint Online
    site. Depending on the command you want to use, you might be required to
    log in to a SharePoint Online tenant admin site (suffixed with ${chalk.grey('-admin')},
    eg. ${chalk.grey('https://contoso-admin.sharepoint.com')}) or a regular site.

    By default, the ${chalk.blue(commands.LOGIN)} command uses device code OAuth flow
    to log in to SharePoint Online. Alternatively, you can
    authenticate using a user name and password, which is convenient for CI/CD
    scenarios, but which comes with its own limitations. See the Office 365 CLI
    manual for more information.
    
    When logging in to a SharePoint site, the ${chalk.blue(commands.LOGIN)} command
    stores in memory the access token and the refresh token for the specified
    site. Both tokens are cleared from memory after exiting the CLI or by
    calling the ${chalk.blue(commands.LOGOUT)} command.

    When logging in to SharePoint Online using the user name and
    password, next to the access and refresh token, the Office 365 CLI will
    store the user credentials so that it can automatically reauthenticate if
    necessary. Similarly to the tokens, the credentials are removed by
    reauthenticating using the device code or by calling the ${chalk.blue(commands.LOGOUT)}
    command.

  Examples:
  
    Log in to a SharePoint Online tenant admin site using the device code
      ${chalk.grey(config.delimiter)} ${commands.LOGIN} https://contoso-admin.sharepoint.com

    Log in to a SharePoint Online tenant admin site using the device code in
    debug mode including detailed debug information in the console output
      ${chalk.grey(config.delimiter)} ${commands.LOGIN} --debug https://contoso-admin.sharepoint.com
      
    Log in to a regular SharePoint Online site using the device code
      ${chalk.grey(config.delimiter)} ${commands.LOGIN} https://contoso.sharepoint.com/sites/team

    Log in to a SharePoint Online tenant admin site using a user name and password
      ${chalk.grey(config.delimiter)} ${commands.LOGIN} https://contoso-admin.sharepoint.com --authType password --userName user@contoso.com --password pass@word1
`);
  }
}

module.exports = new SpoLoginCommand();