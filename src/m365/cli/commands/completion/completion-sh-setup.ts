import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import AnonymousCommand from '../../../base/AnonymousCommand';
import { autocomplete } from '../../../../autocomplete';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: GlobalOptions;
}

class CliCompletionShSetupCommand extends AnonymousCommand {
  public get name(): string {
    return commands.COMPLETION_SH_SETUP;
  }

  public get description(): string {
    return 'Sets up command completion for Zsh, Bash and Fish';
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    if (this.debug) {
      cmd.log('Generating command completion...');
    }

    autocomplete.generateShCompletion(vorpal);

    if (this.debug) {
      cmd.log('Registering command completion with the shell...');
    }

    autocomplete.setupShCompletion();

    cmd.log('Command completion successfully registered. Restart your shell to load the completion');

    if (this.verbose) {
      cmd.log(vorpal.chalk.green('DONE'));
    }
    cb();
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    log(vorpal.find(commands.COMPLETION_SH_SETUP).helpInformation());
    log(
      `  Examples:
  
    Set up command completion for Zsh, Bash or Fish
      ${this.getCommandName()}

  More information:

    Command completion
      https://pnp.github.io/office365-cli/concepts/completion/
`);
  }
}

module.exports = new CliCompletionShSetupCommand();