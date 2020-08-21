import commands from '../../commands';
import Command, {
  CommandOption, CommandError, CommandAction, CommandValidate
} from '../../../../Command';
import GlobalOptions from '../../../../GlobalOptions';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Project, ExternalConfiguration, External } from './model';

const vorpal: Vorpal = require('../../../../vorpal-init');
import rules = require('./project-externalize/DefaultRules');
import { BasicDependencyRule } from './project-externalize/rules';
import { ExternalizeEntry, FileEdit } from './project-externalize/';
import { BaseProjectCommand } from './base-project-command';

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  outputFile?: string;
}

class SpfxProjectExternalizeCommand extends BaseProjectCommand {
  public constructor() {
    super();
  }

  private projectVersion: string | undefined;
  private supportedVersions: string[] = [
    '1.0.0',
    '1.0.1',
    '1.0.2',
    '1.1.0',
    '1.1.1',
    '1.1.3',
    '1.2.0',
    '1.3.0',
    '1.3.1',
    '1.3.2',
    '1.3.4',
    '1.4.0',
    '1.4.1',
    '1.5.0',
    '1.5.1',
    '1.6.0',
    '1.7.0',
    '1.7.1',
    '1.8.0',
    '1.8.1',
    '1.8.2',
    '1.9.1'
  ];
  private allFindings: ExternalizeEntry[] = [];
  private allEditSuggestions: FileEdit[] = [];
  public static ERROR_NO_PROJECT_ROOT_FOLDER: number = 1;
  public static ERROR_NO_VERSION: number = 3;
  public static ERROR_UNSUPPORTED_VERSION: number = 2;

  public get name(): string {
    return commands.PROJECT_EXTERNALIZE;
  }

  public get description(): string {
    return 'Externalizes SharePoint Framework project dependencies';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.outputFile = typeof args.options.outputFile !== 'undefined';
    return telemetryProps;
  }

  public action(): CommandAction {
    const cmd: Command = this;
    return function (this: CommandInstance, args: CommandArgs, cb: (err?: any) => void) {
      args = (cmd as any).processArgs(args);
      (cmd as any).initAction(args, this);
      cmd.commandAction(this, args, cb);
    }
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: (err?: any) => void): void {
    if (args.options.output !== 'json' || this.verbose) {
      cmd.log(`This command is currently in preview. Feedback welcome at https://github.com/pnp/office365-cli/issues${os.EOL}`);
    }

    this.projectRootPath = this.getProjectRoot(process.cwd());
    if (this.projectRootPath === null) {
      cb(new CommandError(`Couldn't find project root folder`, SpfxProjectExternalizeCommand.ERROR_NO_PROJECT_ROOT_FOLDER));
      return;
    }

    this.projectVersion = this.getProjectVersion();
    if (!this.projectVersion) {
      cb(new CommandError(`Unable to determine the version of the current SharePoint Framework project`, SpfxProjectExternalizeCommand.ERROR_NO_VERSION));
      return;
    }

    if (this.projectVersion && this.supportedVersions.indexOf(this.projectVersion) < 0) {
      cb(new CommandError(`CLI for Microsoft 365 doesn't support externalizing dependencies of SharePoint Framework projects of version ${this.projectVersion}. Supported versions are ${this.supportedVersions.join(', ')}`, SpfxProjectExternalizeCommand.ERROR_UNSUPPORTED_VERSION));
      return;
    }

    if (this.verbose) {
      cmd.log('Collecting project...');
    }
    const project: Project = this.getProject(this.projectRootPath);

    if (this.debug) {
      cmd.log('Collected project');
      cmd.log(project);
    }

    const asyncRulesResults = (rules as BasicDependencyRule[]).map(r => r.visit(project));
    Promise
      .all(asyncRulesResults)
      .then((rulesResults) => {
        this.allFindings.push(...rulesResults.map(x => x.entries).reduce((x, y) => [...x, ...y]));
        this.allEditSuggestions.push(...rulesResults.map(x => x.suggestions).reduce((x, y) => [...x, ...y]));
        //removing duplicates
        this.allFindings = this.allFindings.filter((x, i) => this.allFindings.findIndex(y => y.key === x.key) === i);
        this.writeReport(this.allFindings, this.allEditSuggestions, cmd, args.options);
        cb();
      }).catch((err) => {
        cb(new CommandError(err));
      });
  }

  private writeReport(findingsToReport: ExternalizeEntry[], editsToReport: FileEdit[], cmd: CommandInstance, options: Options): void {
    let report;

    switch (options.output) {
      case 'json':
        report = { externalConfiguration: this.serializeJsonReport(findingsToReport), edits: editsToReport };
        break;
      case 'md':
        report = this.serializeMdReport(findingsToReport, editsToReport);
        break;
      default:
        report = this.serializeTextReport(findingsToReport, editsToReport);
        break;
    }

    if (options.outputFile) {
      fs.writeFileSync(path.resolve(options.outputFile), options.output === 'json' ? JSON.stringify(report, null, 2) : report, 'utf-8');
    }
    else {
      cmd.log(report);
    }
  }

  private serializeMdReport(findingsToReport: ExternalizeEntry[], editsToReport: FileEdit[]): string {
    const lines = [
      `# Externalizing dependencies of project ${path.basename(this.projectRootPath as string)}`, os.EOL,
      os.EOL,
      `Date: ${(new Date().toLocaleDateString())}`, os.EOL,
      os.EOL,
      '## Findings', os.EOL,
      os.EOL,
      '### Modify files', os.EOL,
      os.EOL,
      '#### [config.json](config/config.json)', os.EOL,
      os.EOL,
      'Replace the externals property (or add if not defined) with', os.EOL,
      os.EOL,
      '```json', os.EOL,
      JSON.stringify(this.serializeJsonReport(findingsToReport), null, 2), os.EOL,
      '```', os.EOL,
      ...this.getReportForFileEdit(this.getGroupedFileEdits(editsToReport, 'add')),
      ...this.getReportForFileEdit(this.getGroupedFileEdits(editsToReport, 'remove')),
    ];
    return lines.join('');
  }

  private getReportForFileEdit(suggestions: FileEdit[][]): string[] {
    const initialReport = suggestions
      .map(x => [
        `#### [${x[0].path}](${x[0].path})`, os.EOL,
        x[0].action, os.EOL,
        '```JavaScript', os.EOL,
        ...x.map(y => [y.targetValue, os.EOL]).reduce((y, z) => [...y, ...z]), '```', os.EOL]);

    if (initialReport.length > 0) {
      return initialReport.reduce((x, y) => [...x, ...y]);
    }
    else {
      return [];
    }
  }

  private getGroupedFileEdits(editsToReport: FileEdit[], action: "add" | "remove"): FileEdit[][] {
    const editsMatchingAction = editsToReport.filter(x => x.action === action);
    return editsMatchingAction
      .filter((x, i) => editsMatchingAction.findIndex(y => y.path === x.path) === i)
      .map(x => editsMatchingAction.filter(y => y.path === x.path));
  }
  private serializeJsonReport(findingsToReport: ExternalizeEntry[]): { externals: ExternalConfiguration } {
    const result: ExternalConfiguration = {};
    findingsToReport.forEach((f) => {
      if (!f.globalName) {
        result[f.key] = f.path;
      }
      else {
        result[f.key] = {
          path: f.path,
          globalName: f.globalName,
          globalDependencies: f.globalDependencies
        } as External;
      }
    });

    return {
      externals: result
    };
  }

  private serializeTextReport(findingsToReport: ExternalizeEntry[], editsToReport: FileEdit[]): string {
    const s: string[] = [
      'In the config/config.json file update the externals property to:', os.EOL,
      os.EOL,
      JSON.stringify({ externalConfiguration: this.serializeJsonReport(findingsToReport), edits: editsToReport }, null, 2)
    ];

    return s.join('').trim();
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-f, --outputFile [outputFile]',
        description: 'Path to the file where the report should be stored in'
      } as CommandOption
    ];

    const parentOptions: CommandOption[] = super.options();
    parentOptions.forEach(o => {
      if (o.option.indexOf('--output') > -1) {
        o.description = 'Output type. json|text|md. Default text';
        o.autocomplete = ['json', 'text', 'md'];
      }
    });
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (args.options.outputFile) {
        const dirPath: string = path.dirname(path.resolve(args.options.outputFile));
        if (!fs.existsSync(dirPath)) {
          return `Directory ${dirPath} doesn't exist. Please check the path and try again.`;
        }
      }

      return true;
    };
  }

  public commandHelp(args: any, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(commands.PROJECT_EXTERNALIZE).helpInformation());
    log(
      `   ${chalk.yellow('Important:')} Run this command in the folder where the project for which you
    want to externalize dependencies is located. This command doesn't change
    your project files.

  Remarks:

    ${chalk.yellow('Attention:')} This command is in preview and could change
    once it's officially released. If you see any room for improvement, we'd
    love to hear from you at https://github.com/pnp/office365-cli/issues.

    The ${chalk.blue(this.name)} command helps you externalize your SharePoint
    Framework project dependencies using the unpkg CDN.

    This command doesn't change your project files. Instead, it gives you
    a report with all steps necessary to externalize your project dependencies.
    Externalizing project dependencies is error-prone, especially when it comes
    to updating your solution's code. This is why at this moment, this command
    produces a report that you can use yourself to perform the necessary changes
    and verify that everything is working as expected.

  Examples:

    Get instructions to externalize dependencies for the current SharePoint
    Framework project and save the findings in a Markdown file
      ${this.name} --output md --outputFile "deps-report.md"

    Get instructions to externalize the current SharePoint Framework project
    dependencies and show the summary of the findings in the terminal
      ${this.name}
`);
  }
}

module.exports = new SpfxProjectExternalizeCommand();
