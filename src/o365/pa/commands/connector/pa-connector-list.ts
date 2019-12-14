import commands from '../../commands';
import flowCommands from '../../../flow/commands';
import GlobalOptions from '../../../../GlobalOptions';
import {
  CommandOption,
  CommandValidate
} from '../../../../Command';
import { AzmgmtItemsListCommand } from '../../../base/AzmgmtItemsListCommand';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  environment: string;
}

class PaConnectorListCommand extends AzmgmtItemsListCommand<{ name: string, properties: { displayName: string } }> {
  public get name(): string {
    return commands.CONNECTOR_LIST;
  }

  public get description(): string {
    return 'Lists custom connectors in the given environment';
  }

  public alias(): string[] | undefined {
    return [flowCommands.CONNECTOR_LIST];
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const url: string = `${this.resource}providers/Microsoft.PowerApps/apis?api-version=2016-11-01&$filter=environment%20eq%20%27${encodeURIComponent(args.options.environment)}%27%20and%20IsCustomApi%20eq%20%27True%27`;

    this
      .getAllItems(url, cmd, true)
      .then((): void => {
        if (this.items.length > 0) {
          if (args.options.output === 'json') {
            cmd.log(this.items);
          }
          else {
            cmd.log(this.items.map(f => {
              return {
                name: f.name,
                displayName: f.properties.displayName
              };
            }));
          }
        }
        else {
          if (this.verbose) {
            cmd.log('No custom connectors found');
          }
        }

        cb();
      }, (rawRes: any): void => this.handleRejectedODataJsonPromise(rawRes, cmd, cb));
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-e, --environment <environment>',
        description: 'The name of the environment for which to retrieve custom connectors'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.environment) {
        return 'Required option environment missing';
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(commands.CONNECTOR_LIST).helpInformation());
    log(
      `  Remarks:

    ${chalk.yellow('Attention:')} This command is based on an API that is currently
    in preview and is subject to change once the API reached general
    availability.
  
  Examples:
  
    List all custom connectors in the given environment
      ${this.getCommandName()} --environment Default-d87a7535-dd31-4437-bfe1-95340acd55c5
`);
  }
}

module.exports = new PaConnectorListCommand();