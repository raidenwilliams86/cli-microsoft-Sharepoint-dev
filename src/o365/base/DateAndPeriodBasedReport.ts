import {
  CommandOption, CommandValidate
} from '../../Command';
import PeriodBasedReport, { OutputFileOptions } from './PeriodBasedReport';
import * as path from 'path';
import * as fs from 'fs';

interface CommandArgs {
  options: DateAndPeriodBasedOptions;
}

interface DateAndPeriodBasedOptions extends OutputFileOptions {
  period?: string;
  date?: string;
}

export default abstract class DateAndPeriodBasedReport extends PeriodBasedReport {
  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const periodParameter: string = args.options.period ? `${this.usageEndpoint}(period='${encodeURIComponent(args.options.period)}')` : '';
    const dateParameter: string = args.options.date ? `${this.usageEndpoint}(date=${encodeURIComponent(args.options.date)})` : '';
    const endpoint: string = `${this.resource}/v1.0/reports/${(args.options.period ? periodParameter : dateParameter)}`;
    this.executeReport(endpoint, cmd, args.options.output, args.options.outputFile, cb);
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.period = args.options.period;
    telemetryProps.date = typeof args.options.date !== 'undefined';
    return telemetryProps;
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-d, --date [date]',
        description: 'The date for which you would like to view the users who performed any activity. Supported date format is YYYY-MM-DD. Specify the date or period, but not both.'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.period && !args.options.date) {
        return 'Specify period or date, one is required.';
      }

      if (args.options.outputFile && !fs.existsSync(path.dirname(args.options.outputFile))) {
        return `The specified path ${path.dirname(args.options.outputFile)} doesn't exist`;
      }

      if (args.options.period && args.options.date) {
        return 'Specify period or date but not both.';
      }

      if (args.options.date && !((args.options.date as string).match(/^\d{4}-\d{2}-\d{2}$/))) {
        return `${args.options.date} is not a valid date. The supported date format is YYYY-MM-DD`;
      }

      return this.validatePeriod(args.options.period);
    };
  }
}