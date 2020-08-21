import commands from '../../commands';
import DateAndPeriodBasedReport from '../../../base/DateAndPeriodBasedReport';

const vorpal: Vorpal = require('../../../../vorpal-init');

class YammerReportDeviceUsageUserDetailCommand extends DateAndPeriodBasedReport {
  public get name(): string {
    return commands.YAMMER_REPORT_DEVICEUSAGEUSERDETAIL;
  }

  public get usageEndpoint(): string {
    return 'getYammerDeviceUsageUserDetail';
  }

  public get description(): string {
    return 'Gets details about Yammer device usage by user';
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Remarks:

    As this report is only available for the past 28 days, date parameter value
    should be a date from that range.

  Examples:
      
    Gets details about Yammer device usage by user for the last week
      ${commands.YAMMER_REPORT_DEVICEUSAGEUSERDETAIL} --period D7

    Gets details about Yammer device usage by user for July 1, 2019
      ${commands.YAMMER_REPORT_DEVICEUSAGEUSERDETAIL} --date 2019-07-01

    Gets details about Yammer device usage by user for the last week
    and exports the report data in the specified path in text format
      ${commands.YAMMER_REPORT_DEVICEUSAGEUSERDETAIL} --period D7 --output text --outputFile "deviceusageuserdetail.txt"

    Gets details about Yammer device usage by user for the last week
    and exports the report data in the specified path in json format
      ${commands.YAMMER_REPORT_DEVICEUSAGEUSERDETAIL} --period D7 --output json --outputFile "deviceusageuserdetail.json"
`);
  }
}

module.exports = new YammerReportDeviceUsageUserDetailCommand();