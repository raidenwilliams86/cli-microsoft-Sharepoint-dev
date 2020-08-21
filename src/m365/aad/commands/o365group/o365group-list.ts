import commands from '../../commands';
import request from '../../../../request';
import GlobalOptions from '../../../../GlobalOptions';
import {
  CommandOption, CommandValidate
} from '../../../../Command';
import { Group } from './Group';
import { GraphItemsListCommand } from '../../../base/GraphItemsListCommand';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  displayName?: string;
  mailNickname?: string;
  includeSiteUrl: boolean;
  deleted?: boolean;
  orphaned?: boolean;
}

class AadO365GroupListCommand extends GraphItemsListCommand<Group> {
  public get name(): string {
    return `${commands.O365GROUP_LIST}`;
  }

  public get description(): string {
    return 'Lists Microsoft 365 Groups in the current tenant';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.displayName = typeof args.options.displayName !== 'undefined';
    telemetryProps.mailNickname = typeof args.options.mailNickname !== 'undefined';
    telemetryProps.includeSiteUrl = args.options.includeSiteUrl;
    telemetryProps.deleted = args.options.deleted;
    telemetryProps.orphaned = args.options.orphaned;
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const groupFilter: string = `?$filter=groupTypes/any(c:c+eq+'Unified')`;
    const displayNameFilter: string = args.options.displayName ? ` and startswith(DisplayName,'${encodeURIComponent(args.options.displayName).replace(/'/g, `''`)}')` : '';
    const mailNicknameFilter: string = args.options.mailNickname ? ` and startswith(MailNickname,'${encodeURIComponent(args.options.mailNickname).replace(/'/g, `''`)}')` : '';
    const expandOwners: string = args.options.orphaned ? '&$expand=owners' : '';
    const topCount: string = '&$top=100';

    let endpoint: string = `${this.resource}/v1.0/groups${groupFilter}${displayNameFilter}${mailNicknameFilter}${expandOwners}${topCount}`;

    if (args.options.deleted) {
      endpoint = `${this.resource}/v1.0/directory/deletedItems/Microsoft.Graph.Group${groupFilter}${displayNameFilter}${mailNicknameFilter}${topCount}`;
    }

    this
      .getAllItems(endpoint, cmd, true)
      .then((): Promise<any> => {
        if (args.options.orphaned) {
          const orphanedGroups: Group[] = [];

          this.items.forEach((group, index) => {
            if (!group.owners || group.owners.length === 0) {
              orphanedGroups.push(group);
            }
          });

          this.items = orphanedGroups;
        }

        if (args.options.includeSiteUrl) {
          return Promise.all(this.items.map(g => this.getGroupSiteUrl(g.id, cmd)));
        }
        else {
          return Promise.resolve();
        }
      })
      .then((res?: { id: string, url: string }[]): void => {
        if (res) {
          res.forEach(r => {
            for (let i: number = 0; i < this.items.length; i++) {
              if (this.items[i].id !== r.id) {
                continue;
              }

              this.items[i].siteUrl = r.url;
              break;
            }
          });
        }

        if (args.options.output === 'json') {
          cmd.log(this.items);
        }
        else {
          cmd.log(this.items.map(g => {
            const group: any = {
              id: g.id,
              displayName: g.displayName,
              mailNickname: g.mailNickname
            };

            if (args.options.deleted) {
              group.deletedDateTime = g.deletedDateTime;
            }

            if (args.options.includeSiteUrl) {
              group.siteUrl = g.siteUrl;
            }

            return group;
          }));
        }

        if (this.verbose) {
          cmd.log(vorpal.chalk.green('DONE'));
        }

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  private getGroupSiteUrl(groupId: string, cmd: CommandInstance): Promise<{ id: string, url: string }> {
    return new Promise<{ id: string, url: string }>((resolve: (siteInfo: { id: string, url: string }) => void, reject: (error: any) => void): void => {
      const requestOptions: any = {
        url: `${this.resource}/v1.0/groups/${groupId}/drive?$select=webUrl`,
        headers: {
          accept: 'application/json;odata.metadata=none'
        },
        json: true
      };

      request
        .get<{ webUrl: string }>(requestOptions)
        .then((res: { webUrl: string }): void => {
          resolve({
            id: groupId,
            url: res.webUrl ? res.webUrl.substr(0, res.webUrl.lastIndexOf('/')) : ''
          });
        }, (err: any): void => {
          reject(err);
        });
    });
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-d, --displayName [displayName]',
        description: 'Retrieve only groups with displayName starting with the specified value'
      },
      {
        option: '-m, --mailNickname [displayName]',
        description: 'Retrieve only groups with mailNickname starting with the specified value'
      },
      {
        option: '--includeSiteUrl',
        description: 'Set to retrieve the site URL for each group'
      },
      {
        option: '--deleted',
        description: 'Set to only retrieve deleted groups'
      },
      {
        option: '--orphaned',
        description: 'Set to only retrieve groups without owners'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (args.options.deleted && args.options.includeSiteUrl) {
        return 'You can\'t retrieve site URLs of deleted Microsoft 365 Groups';
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Remarks:

    Using the ${chalk.blue('--includeSiteUrl')} option, you can retrieve the URL
    of the site associated with the particular Microsoft 365 Group. If you however
    retrieve too many groups and will try to get their site URLs, you will most
    likely get an error as the command will get throttled, issuing too many
    requests, too frequently. If you get an error, consider narrowing down
    the result set using the ${chalk.blue('--displayName')} and ${chalk.blue('--mailNickname')} filters.
    
    Retrieving the URL of the site associated with the particular
    Microsoft 365 Group is not possible when retrieving deleted groups.

    Using the ${chalk.blue('--orphaned')} option, you can retrieve Microsoft 365 Groups without
    owners.

  Examples:
  
    List all Microsoft 365 Groups in the tenant
      ${this.name}

    List Microsoft 365 Groups with display name starting with ${chalk.grey(`Project`)}
      ${this.name} --displayName Project

    List Microsoft 365 Groups mail nick name starting with ${chalk.grey(`team`)}
      ${this.name} --mailNickname team

    List deleted Microsoft 365 Groups with display name starting with ${chalk.grey(`Project`)}
      ${this.name} --displayName Project --deleted

    List deleted Microsoft 365 Groups with mail nick name starting with ${chalk.grey(`team`)}
      ${this.name} --mailNickname team --deleted

    List Microsoft 365 Groups with display name starting with ${chalk.grey(`Project`)} including
    the URL of the corresponding SharePoint site
      ${this.name} --displayName Project --includeSiteUrl

    List Microsoft 365 Groups without owners
      ${this.name} --orphaned
`);
  }
}

module.exports = new AadO365GroupListCommand();