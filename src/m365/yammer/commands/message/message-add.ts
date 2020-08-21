import { CommandOption, CommandValidate } from '../../../../Command';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import YammerCommand from '../../../base/YammerCommand';
import commands from '../../commands';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  body: string;
  repliedToId?: number;
  directToUserIds?: string;
  groupId?: number;
  networkId?: number;
}

class YammerMessageAddCommand extends YammerCommand {
  public get name(): string {
    return commands.YAMMER_MESSAGE_ADD;
  }

  public get description(): string {
    return 'Posts a Yammer network message on behalf of the current user';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.repliedToId = args.options.repliedToId !== undefined;
    telemetryProps.directToUserIds = args.options.directToUserIds !== undefined;
    telemetryProps.groupId = args.options.groupId !== undefined;
    telemetryProps.networkId = args.options.networkId !== undefined;
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const requestOptions: any = {
      url: `${this.resource}/v1/messages.json`,
      headers: {
        accept: 'application/json;odata.metadata=none',
        'content-type': 'application/json;odata=nometadata'
      },
      json: true,
      body: {
        body: args.options.body,
        replied_to_id: args.options.repliedToId,
        direct_to_user_ids: args.options.directToUserIds,
        group_id: args.options.groupId,
        network_id: args.options.networkId
      }
    };

    request
      .post(requestOptions)
      .then((res: any): void => {
        let result = null;
        if (res.messages && res.messages.length == 1) {
          result = res.messages[0];
        }

        if (args.options.output === 'json') {
          cmd.log(result);
        }
        else {
          cmd.log({
            id: result.id
          });
        }
        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-b, --body <body>',
        description: 'The text of the message body'
      },
      {
        option: '-r, --repliedToId [repliedToId]',
        description: 'The message ID this message is in reply to. If this is set then groupId and networkId are inferred from it'
      },
      {
        option: '-d, --directToUserIds [directToUserIds]',
        description: 'Send a private message to one or more users, specified by ID. Alternatively, you can use the Yammer network e-mail addresses instead of the IDs'
      },
      {
        option: '--groupId [groupId]',
        description: 'Post the message to this group, specified by ID. If this is set then the networkId is inferred from it. A post without directToUserIds, repliedToId or groupId will default to All Company group'
      },
      {
        option: '--networkId [networkId]',
        description: 'Post a message in the "All Company" feed of this network, if repliedToId, directToUserIds and groupId are all omitted'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.body) {
        return 'Required body value is missing';
      }

      if (args.options.groupId && typeof args.options.groupId !== 'number') {
        return `${args.options.groupId} is not a number`;
      }

      if (args.options.networkId && typeof args.options.networkId !== 'number') {
        return `${args.options.networkId} is not a number`;
      }

      if (args.options.repliedToId && typeof args.options.repliedToId !== 'number') {
        return `${args.options.repliedToId} is not a number`;
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Remarks:
  
    ${chalk.yellow('Attention:')} In order to use this command, you need to grant the Azure AD
    application used by the CLI for Microsoft 365 the permission to the Yammer API.
    To do this, execute the ${chalk.blue('cli consent --service yammer')} command.
    
  Examples:
  
    Posts a message to the "All Company" feed 
      ${this.name} --body "Hello everyone!"

    Replies to a message with the ID 1231231231 
      ${this.name} --body "Hello everyone!" --repliedToId 1231231231
    
    Sends a private conversation to the user with the ID 1231231231 
      ${this.name} --body "Hello everyone!" --directToUserIds 1231231231

    Sends a private conversation to multiple users by ID
      ${this.name} --body "Hello everyone!" --directToUserIds "1231231231,1121312"

    Sends a private conversation to the user with the e-mail pl@nubo.eu and sc@nubo.eu 
      ${this.name} --body "Hello everyone!" --directToUserIds "pl@nubo.eu,sc@nubo.eu"
     
    Posts a message to the group with the ID 12312312312 
      ${this.name} --body "Hello everyone!" --groupId 12312312312

    Posts a message to the "All Company" feed of the network 11112312 
      ${this.name} --body "Hello everyone!" --networkId 11112312
    `);
  }
}

module.exports = new YammerMessageAddCommand();
