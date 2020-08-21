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
  id: number;
}

class YammerMessageGetCommand extends YammerCommand {
  public get name(): string {
    return `${commands.YAMMER_MESSAGE_GET}`;
  }

  public get description(): string {
    return 'Returns a Yammer message';
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const requestOptions: any = {
      url: `${this.resource}/v1/messages/${args.options.id}.json`,
      headers: {
        accept: 'application/json;odata.metadata=none',
        'content-type': 'application/json;odata=nometadata'
      },
      json: true
    };

    request
      .get(requestOptions)
      .then((res: any): void => {
        if (args.options.output === 'json') {
          cmd.log(res);
        }
        else {
          cmd.log({
            id: res.id, 
            sender_id: res.sender_id, 
            replied_to_id: res.replied_to_id, 
            thread_id: res.thread_id, 
            group_id: res.group_id,
            created_at: res.created_at,
            direct_message: res.direct_message,   
            system_message: res.system_message,
            privacy: res.privacy,
            message_type: res.message_type,
            content_excerpt: res.content_excerpt
          });
        }
        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '--id <id>',
        description: 'The id of the Yammer message'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.id) {
        return 'Required id value is missing';
      }
      if (typeof args.options.id !== 'number') {
        return `${args.options.id} is not a number`;
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
  
    Returns the Yammer message with the id 1239871123
      ${this.name} --id 1239871123

    Returns the Yammer message with the id 1239871123 in JSON format
      ${this.name} --id 1239871123 --output json
    `);
  }
}

module.exports = new YammerMessageGetCommand();
