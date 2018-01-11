import auth from '../../AadAuth';
import config from '../../../../config';
import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import * as request from 'request-promise-native';
import {
  CommandOption,
  CommandValidate
} from '../../../../Command';
import Utils from '../../../../Utils';
import AadCommand from '../../AadCommand';
import { OAuth2PermissionGrant } from './OAuth2PermissionGrant';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  clientId: string;
}

class Oauth2GrantListCommand extends AadCommand {
  public get name(): string {
    return commands.OAUTH2GRANT_LIST;
  }

  public get description(): string {
    return 'Lists OAuth2 permission grants for the specified service principal';
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    auth
      .ensureAccessToken(auth.service.resource, cmd, this.debug)
      .then((accessToken: string): Promise<{ value: OAuth2PermissionGrant[] }> => {
        if (this.debug) {
          cmd.log(`Retrieved access token ${accessToken}. Retrieving list of OAuth grants for the service principal...`);
        }

        if (this.verbose) {
          cmd.log(`Retrieving list of OAuth grants for the service principal...`);
        }

        const requestOptions: any = {
          url: `${auth.service.resource}/myorganization/oauth2PermissionGrants?api-version=1.6&$filter=clientId eq '${encodeURIComponent(args.options.clientId)}'`,
          headers: Utils.getRequestHeaders({
            authorization: `Bearer ${accessToken}`,
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
      .then((res: { value: OAuth2PermissionGrant[] }): void => {
        if (this.debug) {
          cmd.log('Response:');
          cmd.log(res);
          cmd.log('');
        }

        if (res.value && res.value.length > 0) {
          if (args.options.output === 'json') {
            cmd.log(res.value);
          }
          else {
            cmd.log(res.value.map(g => {
              return {
                objectId: g.objectId,
                resourceId: g.resourceId,
                scope: g.scope
              };
            }));
          }
        }

        cb();
      }, (rawRes: any): void => this.handleRejectedODataJsonPromise(rawRes, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-i, --clientId <clientId>',
        description: 'objectId of the service principal for which the configured OAuth2 permission grants should be retrieved'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.clientId) {
        return 'Required option clientId missing';
      }

      if (!Utils.isValidGuid(args.options.clientId)) {
        return `${args.options.clientId} is not a valid GUID`;
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(commands.OAUTH2GRANT_LIST).helpInformation());
    log(
      `  ${chalk.yellow('Important:')} before using this command, connect to Azure Active Directory Graph,
      using the ${chalk.blue(commands.CONNECT)} command.

  Remarks:
  
    To get information about service principal OAuth2 permission grants, you have to first connect
    to Azure Active Directory Graph using the ${chalk.blue(commands.CONNECT)} command.

    In order to list existing OAuth2 permissions granted to a service principal, you need its ${chalk.grey('objectId')}.
    You can retrieve it using the ${chalk.blue(commands.SP_GET)} command.

    When using the text output type (default), the command lists only the values of the ${chalk.grey('objectId')},
    ${chalk.grey('resourceId')} and ${chalk.grey('scope')} properties of the OAuth grant. When setting the output
    type to JSON, all available properties are included in the command output.
   
  Examples:
  
    List OAuth2 permissions granted to service principal with objectId ${chalk.grey('b2307a39-e878-458b-bc90-03bc578531d6')}.
      ${chalk.grey(config.delimiter)} ${commands.OAUTH2GRANT_LIST} --clientId b2307a39-e878-458b-bc90-03bc578531d6

  More information:
  
    Application and service principal objects in Azure Active Directory (Azure AD)
      https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-application-objects
`);
  }
}

module.exports = new Oauth2GrantListCommand();