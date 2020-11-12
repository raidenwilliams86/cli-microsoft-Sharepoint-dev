import * as chalk from 'chalk';
import appInsights from './appInsights';
import auth from './Auth';
import { Cli } from './cli';
import { Logger } from './cli/Logger';
import GlobalOptions from './GlobalOptions';
import { GraphResponseError } from './m365/base/GraphResponseError';
import request from './request';

export interface CommandOption {
  option: string;
  description: string;
  autocomplete?: string[]
}

export interface CommandHelp {
  (args: any, cbOrLog: (msg?: string) => void): void
}

export interface CommandTypes {
  string?: string[];
  boolean?: string[];
}

export class CommandError {
  constructor(public message: string, public code?: number) {
  }
}

export interface ODataError {
  "odata.error": {
    code: string;
    message: {
      lang: string;
      value: string;
    }
  }
}

export interface CommandArgs {
  options: GlobalOptions;
}

export default abstract class Command {
  protected _debug: boolean = false;
  protected _verbose: boolean = false;

  protected get debug(): boolean {
    return this._debug;
  }

  protected get verbose(): boolean {
    return this._verbose;
  }

  public abstract get name(): string;
  public abstract get description(): string;

  public abstract commandAction(logger: Logger, args: any, cb: () => void): void;

  protected showDeprecationWarning(logger: Logger, deprecated: string, recommended: string): void {
    const cli: Cli = Cli.getInstance();
    if (cli.currentCommandName &&
      cli.currentCommandName.indexOf(deprecated) === 0) {
      logger.logToStderr(chalk.yellow(`Command '${deprecated}' is deprecated. Please use '${recommended}' instead`));
    }
  }

  protected getUsedCommandName(): string {
    const cli: Cli = Cli.getInstance();
    const commandName: string = this.getCommandName();
    if (!cli.currentCommandName) {
      return commandName;
    }

    if (cli.currentCommandName &&
      cli.currentCommandName.indexOf(commandName) === 0) {
      return commandName;
    }

    // since the command was called by something else than its name
    // it must have aliases
    const aliases: string[] = this.alias() as string[];

    for (let i: number = 0; i < aliases.length; i++) {
      if (cli.currentCommandName.indexOf(aliases[i]) === 0) {
        return aliases[i];
      }
    }

    // shouldn't happen because the command is called either by its name or alias
    return '';
  }

  public action(logger: Logger, args: CommandArgs, cb: (err?: any) => void): void {
    auth
      .restoreAuth()
      .then((): void => {
        this.initAction(args, logger);

        if (!auth.service.connected) {
          cb(new CommandError('Log in to Microsoft 365 first'));
          return;
        }

        this.commandAction(logger, args, cb);
      }, (error: any): void => {
        cb(new CommandError(error));
      });
  }

  public getTelemetryProperties(args: any): any {
    return {
      debug: this.debug.toString(),
      verbose: this.verbose.toString(),
      output: args.options.output,
      query: typeof args.options.query !== 'undefined'
    };
  }

  public alias(): string[] | undefined {
    return;
  }

  public autocomplete(): string[] | undefined {
    return;
  }

  /**
   * Returns list of properties that should be returned in the text output.
   * Returns all properties if no default properties specified
   */
  public defaultProperties(): string[] | undefined {
    return;
  }

  public allowUnknownOptions(): boolean | undefined {
    return;
  }

  public options(): CommandOption[] {
    return [
      {
        option: '--query [query]',
        description: 'JMESPath query string. See http://jmespath.org/ for more information and examples'
      },
      {
        option: '-o, --output [output]',
        description: 'Output type. json|text. Default text',
        autocomplete: ['json', 'text']
      },
      {
        option: '--verbose',
        description: 'Runs command with verbose logging'
      },
      {
        option: '--debug',
        description: 'Runs command with debug logging'
      }
    ];
  }

  public validate(args: any): boolean | string {
    return true;
  }

  public types(): CommandTypes | undefined {
    return;
  }

  public getCommandName(): string {
    let commandName: string = this.name;
    let pos: number = commandName.indexOf('<');
    let pos1: number = commandName.indexOf('[');
    if (pos > -1 || pos1 > -1) {
      if (pos1 > -1) {
        pos = pos1;
      }

      commandName = commandName.substr(0, pos).trim();
    }

    return commandName;
  }

  protected handleRejectedODataPromise(rawResponse: any, logger: Logger, callback: (err?: any) => void): void {
    const res: any = JSON.parse(JSON.stringify(rawResponse));
    if (res.error) {
      try {
        const err: ODataError = JSON.parse(res.error);
        callback(new CommandError(err['odata.error'].message.value));
      }
      catch {
        try {
          const graphResponseError: GraphResponseError = res.error;
          if (graphResponseError.error.code) {
            callback(new CommandError(graphResponseError.error.code + " - " + graphResponseError.error.message));
          } else {
            callback(new CommandError(graphResponseError.error.message));
          }
        }
        catch {
          callback(new CommandError(res.error));
        }
      }
    }
    else {
      if (rawResponse instanceof Error) {
        callback(new CommandError(rawResponse.message));
      }
      else {
        callback(new CommandError(rawResponse));
      }
    }
  }

  protected handleRejectedODataJsonPromise(response: any, logger: Logger, callback: (err?: any) => void): void {
    if (response.error &&
      response.error['odata.error'] &&
      response.error['odata.error'].message) {
      callback(new CommandError(response.error['odata.error'].message.value));
    }
    else {
      if (response.error) {
        if (response.error.error &&
          response.error.error.message) {
          callback(new CommandError(response.error.error.message));
        }
        else {
          if (response.error.message) {
            callback(new CommandError(response.error.message));
          }
          else {
            if (response.error.error_description) {
              callback(new CommandError(response.error.error_description));
            }
            else {
              try {
                const error: any = JSON.parse(response.error);
                if (error &&
                  error.error &&
                  error.error.message) {
                  callback(new CommandError(error.error.message));
                }
                else {
                  callback(new CommandError(response.error));
                }
              }
              catch {
                callback(new CommandError(response.error));
              }
            }
          }
        }
      }
      else {
        if (response instanceof Error) {
          callback(new CommandError(response.message));
        }
        else {
          callback(new CommandError(response));
        }
      }
    }
  }

  protected handleError(rawResponse: any, logger: Logger, callback: (err?: any) => void): void {
    if (rawResponse instanceof Error) {
      callback(new CommandError(rawResponse.message));
    }
    else {
      callback(new CommandError(rawResponse));
    }
  }

  protected handleRejectedPromise(rawResponse: any, logger: Logger, callback: (err?: any) => void): void {
    this.handleError(rawResponse, logger, callback);
  }

  protected initAction(args: CommandArgs, logger: Logger): void {
    this._debug = args.options.debug || process.env.CLIMICROSOFT365_DEBUG === '1';
    this._verbose = this._debug || args.options.verbose || process.env.CLIMICROSOFT365_VERBOSE === '1';
    request.debug = this._debug;
    request.logger = logger;

    appInsights.trackEvent({
      name: this.getUsedCommandName(),
      properties: this.getTelemetryProperties(args)
    });
    appInsights.flush();
  }

  protected getUnknownOptions(options: any): any {
    const unknownOptions: any = JSON.parse(JSON.stringify(options));
    const knownOptions: CommandOption[] = this.options();
    const optionRegex: RegExp = /--([^\s]+)/;
    knownOptions.forEach(o => {
      const optionName: string = (optionRegex.exec(o.option) as RegExpExecArray)[1];
      delete unknownOptions[optionName];
    });

    return unknownOptions;
  }

  protected trackUnknownOptions(telemetryProps: any, options: any) {
    const unknownOptions: any = this.getUnknownOptions(options);
    const unknownOptionsNames: string[] = Object.getOwnPropertyNames(unknownOptions);
    unknownOptionsNames.forEach(o => {
      telemetryProps[o] = true;
    });
  }

  protected addUnknownOptionsToPayload(payload: any, options: any) {
    const unknownOptions: any = this.getUnknownOptions(options);
    const unknownOptionsNames: string[] = Object.getOwnPropertyNames(unknownOptions);
    unknownOptionsNames.forEach(o => {
      payload[o] = unknownOptions[o];
    });
  }
}