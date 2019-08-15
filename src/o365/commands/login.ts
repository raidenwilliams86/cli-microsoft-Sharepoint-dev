import auth from '../../Auth';
import commands from './commands';
import GlobalOptions from '../../GlobalOptions';
import Command, {
  CommandCancel,
  CommandOption,
  CommandValidate,
  CommandError,
  CommandAction
} from '../../Command';
import { AuthType } from '../../Auth';
import * as fs from 'fs';

const vorpal: Vorpal = require('../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  authType?: string;
  userName?: string;
  password?: string;
  certificateFile?: string;
  thumbprint?: string;
}

class LoginCommand extends Command {
  public get name(): string {
    return `${commands.LOGIN}`;
  }

  public get description(): string {
    return 'Log in to Office 365';
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    const chalk: any = vorpal.chalk;

    // disconnect before re-connecting
    if (this.debug) {
      cmd.log(`Logging out from Office 365...`);
    }

    const logout: () => void = (): void => {
      auth.service.logout();
      if (this.verbose) {
        cmd.log(chalk.green('DONE'));
      }
    }

    const login: () => void = (): void => {
      if (this.verbose) {
        cmd.log(`Signing in to Office 365...`);
      }

      switch (args.options.authType) {
        case 'password':
          auth.service.authType = AuthType.Password;
          auth.service.userName = args.options.userName;
          auth.service.password = args.options.password;
          break;
        case 'certificate':
          auth.service.authType = AuthType.Certificate;
          auth.service.certificate = fs.readFileSync(args.options.certificateFile as string, 'utf8');
          auth.service.thumbprint = args.options.thumbprint;
          break;
      }

      auth
        .ensureAccessToken(auth.defaultResource, cmd, this.debug)
        .then((): void => {
          if (this.verbose) {
            cmd.log(chalk.green('DONE'));
          }

          auth.service.connected = true;
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

    auth
      .clearConnectionInfo()
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

  public action(): CommandAction {
    const cmd: Command = this;
    return function (this: CommandInstance, args: CommandArgs, cb: (err?: any) => void) {
      auth
        .restoreAuth()
        .then((): void => {
          args = (cmd as any).processArgs(args);
          (cmd as any).initAction(args, this);

          cmd.commandAction(this, args, cb);
        }, (error: any): void => {
          cb(new CommandError(error));
        });
    }
  }

  public cancel(): CommandCancel {
    return (): void => {
      auth.cancel();
    }
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-t, --authType [authType]',
        description: 'The type of authentication to use. Allowed values certificate|deviceCode|password. Default deviceCode',
        autocomplete: ['certificate', 'deviceCode', 'password']
      },
      {
        option: '-u, --userName [userName]',
        description: 'Name of the user to authenticate. Required when authType is set to password'
      },
      {
        option: '-p, --password [password]',
        description: 'Password for the user. Required when authType is set to password'
      },
      {
        option: '-c, --certificateFile [certificateFile]',
        description: 'Path to the file with certificate private key. Required when authType is set to certificate'
      },
      {
        option: '--thumbprint [thumbprint]',
        description: 'Certificate thumbprint. Required when authType is set to certificate'
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

      if (args.options.authType === 'certificate') {
        if (!args.options.certificateFile) {
          return 'Required option certificateFile missing';
        }

        if (!fs.existsSync(args.options.certificateFile)) {
          return `File '${args.options.certificateFile}' does not exist`;
        }

        if (!args.options.thumbprint) {
          return 'Required option thumbprint missing';
        }
      }

      return true;
    };
  }

  public commandHelp(args: CommandArgs, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(commands.LOGIN).helpInformation());
    log(
      `  Remarks:
    
    Using the ${chalk.blue(commands.LOGIN)} command you log in to Office 365.

    By default, the ${chalk.blue(commands.LOGIN)} command uses device code OAuth flow
    to log in to the Microsoft Graph. Alternatively, you can
    authenticate using a user name and password or certificate, which are
    convenient for CI/CD scenarios, but which come with their own limitations.
    See the Office 365 CLI manual for more information.
    
    When logging in to Office 365, the ${chalk.blue(commands.LOGIN)} command stores
    in memory the access token and the refresh token. Both tokens are cleared
    from memory after exiting the CLI or by calling the ${chalk.blue(commands.LOGOUT)}
    command.

    When logging in to Office 365 using the user name and password, next to the
    access and refresh token, the Office 365 CLI will store the user credentials
    so that it can automatically re-authenticate if necessary. Similarly to the
    tokens, the credentials are removed by re-authenticating using the device
    code or by calling the ${chalk.blue(commands.LOGOUT)} command.

    When logging in to the Office 365 using a certificate, the Office 365 CLI
    will store the contents of the certificate so that it can automatically
    re-authenticate if necessary. The contents of the certificate are removed
    by re-authenticating using the device code or by calling
    the ${chalk.blue(commands.LOGOUT)} command.

    To log in to Office 365 using a certificate, you will typically create
    a custom Azure AD application. To use this application with
    the Office 365 CLI, you will set the ${chalk.grey('OFFICE365CLI_AADAPPID')}
    environment variable to the application's ID and the ${chalk.grey('OFFICE365CLI_TENANT')}
    environment variable to the ID of the Azure AD tenant, where you created
    the Azure AD application.

  Examples:
  
    Log in to Office 365 using the device code
      ${commands.LOGIN}

    Log in to Office 365 using the device code in debug mode including detailed
    debug information in the console output
      ${commands.LOGIN} --debug

    Log in to Office 365 using a user name and password
      ${commands.LOGIN} --authType password --userName user@contoso.com --password pass@word1

    Log in to Office 365 using a certificate
      ${commands.LOGIN} --authType certificate --certificateFile /Users/user/dev/localhost.pfx --thumbprint 47C4885736C624E90491F32B98855AA8A7562AF1
`);
  }
}

module.exports = new LoginCommand();