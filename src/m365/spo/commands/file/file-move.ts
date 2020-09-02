import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import {
  CommandOption,
  CommandValidate,
  CommandCancel
} from '../../../../Command';
import SpoCommand from '../../../base/SpoCommand';
import { ContextInfo } from '../../spo';
import * as url from 'url';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  webUrl: string;
  sourceUrl: string;
  targetUrl: string;
  deleteIfAlreadyExists?: boolean;
  allowSchemaMismatch?: boolean;
}

class SpoFileMoveCommand extends SpoCommand {
  private dots?: string;
  private timeout?: NodeJS.Timer;

  public get name(): string {
    return commands.FILE_MOVE;
  }

  public get description(): string {
    return 'Moves a file to another location';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.deleteIfAlreadyExists = args.options.deleteIfAlreadyExists || false;
    telemetryProps.allowSchemaMismatch = args.options.allowSchemaMismatch || false;
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const webUrl = args.options.webUrl;
    const parsedUrl: url.UrlWithStringQuery = url.parse(webUrl);
    const tenantUrl: string = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

    // Check if the source file exists.
    // Called on purpose, we explicitly check if user specified file
    // in the sourceUrl option.
    // The CreateCopyJobs endpoint accepts file, folder or batch from both.
    // A user might enter folder instead of file as source url by mistake
    // then there are edge cases when deleteIfAlreadyExists flag is set
    // the user can receive misleading error message.
    this
      .fileExists(tenantUrl, webUrl, args.options.sourceUrl)
      .then((): Promise<void> => {
        if (args.options.deleteIfAlreadyExists) {
          // try delete target file, if deleteIfAlreadyExists flag is set
          const filename: string = args.options.sourceUrl.replace(/^.*[\\\/]/, '');
          return this.recycleFile(tenantUrl, args.options.targetUrl, filename, cmd);
        }

        return Promise.resolve();
      })
      .then((): Promise<void> => {
        // all preconditions met, now create copy job
        const sourceAbsoluteUrl: string = this.urlCombine(webUrl, args.options.sourceUrl);
        const allowSchemaMismatch: boolean = args.options.allowSchemaMismatch || false;
        const requestUrl: string = this.urlCombine(webUrl, '/_api/site/CreateCopyJobs');
        const requestOptions: any = {
          url: requestUrl,
          headers: {
            'accept': 'application/json;odata=nometadata'
          },
          body: {
            exportObjectUris: [sourceAbsoluteUrl],
            destinationUri: this.urlCombine(tenantUrl, args.options.targetUrl),
            options: {
              "AllowSchemaMismatch": allowSchemaMismatch,
              "IgnoreVersionHistory": true,
              "IsMoveMode": true,
            }
          },
          json: true
        };

        return request.post(requestOptions);
      })
      .then((jobInfo: any): Promise<any> => {
        return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
          this.dots = '';

          const copyJobInfo: any = jobInfo.value[0];
          const progressPollInterval: number = 1800; // 30 * 60; //used previously implemented interval. The API does not provide guidance on what value should be used.

          this.timeout = setTimeout(() => {
            this.waitUntilCopyJobFinished(copyJobInfo, webUrl, progressPollInterval, resolve, reject, cmd, this.dots, this.timeout)
          }, progressPollInterval);
        });
      })
      .then((): void => {
        if (this.verbose) {
          cmd.log('DONE');
        }
        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  /**
   * Checks if a file exists on the server relative url
   */
  private fileExists(tenantUrl: string, webUrl: string, sourceUrl: string): Promise<void> {
    const webServerRelativeUrl: string = webUrl.replace(tenantUrl, '');
    const fileServerRelativeUrl: string = `${webServerRelativeUrl}${sourceUrl}`;

    const requestUrl = `${webUrl}/_api/web/GetFileByServerRelativeUrl('${encodeURIComponent(fileServerRelativeUrl)}')/`;
    const requestOptions: any = {
      url: requestUrl,
      method: 'GET',
      headers: {
        'accept': 'application/json;odata=nometadata'
      },
      json: true
    };

    return request.get(requestOptions);
  }

  /**
   * Moves file in the site recycle bin
   */
  private recycleFile(tenantUrl: string, targetUrl: string, filename: string, cmd: CommandInstance): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
      const targetFolderAbsoluteUrl: string = this.urlCombine(tenantUrl, targetUrl);

      // since the target WebFullUrl is unknown we can use getRequestDigest
      // to get it from target folder absolute url.
      // Similar approach used here Microsoft.SharePoint.Client.Web.WebUrlFromFolderUrlDirect
      this.getRequestDigest(targetFolderAbsoluteUrl)
        .then((contextResponse: ContextInfo): void => {
          if (this.debug) {
            cmd.log(`contextResponse.WebFullUrl: ${contextResponse.WebFullUrl}`);
          }

          if (targetUrl.charAt(0) !== '/') {
            targetUrl = `/${targetUrl}`;
          }
          if (targetUrl.lastIndexOf('/') !== targetUrl.length - 1) {
            targetUrl = `${targetUrl}/`;
          }

          const requestUrl: string = `${contextResponse.WebFullUrl}/_api/web/GetFileByServerRelativeUrl('${encodeURIComponent(`${targetUrl}${filename}`)}')/recycle()`;
          const requestOptions: any = {
            url: requestUrl,
            method: 'POST',
            headers: {
              'X-HTTP-Method': 'DELETE',
              'If-Match': '*',
              'accept': 'application/json;odata=nometadata'
            },
            json: true
          };

          request.post(requestOptions)
            .then((): void => {
              resolve();
            })
            .catch((err: any): any => {
              if (err.statusCode === 404) {
                // file does not exist so can proceed
                return resolve();
              }

              if (this.debug) {
                cmd.log(`recycleFile error...`);
                cmd.log(err);
              }

              reject(err);
            });
        }, (e: any) => reject(e));
    });
  }

  public cancel(): CommandCancel {
    return (): void => {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
    }
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-u, --webUrl <webUrl>',
        description: 'The URL of the site where the file is located'
      },
      {
        option: '-s, --sourceUrl <sourceUrl>',
        description: 'Site-relative URL of the file to move'
      },
      {
        option: '-t, --targetUrl <targetUrl>',
        description: 'Server-relative URL where to move the file'
      },
      {
        option: '--deleteIfAlreadyExists',
        description: 'If a file already exists at the targetUrl, it will be moved to the recycle bin. If omitted, the move operation will be canceled if the file already exists at the targetUrl location'
      },
      {
        option: '--allowSchemaMismatch',
        description: 'Ignores any missing fields in the target document library and moves the file anyway'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.webUrl) {
        return 'Required parameter webUrl missing';
      }

      const isValidSharePointUrl: boolean | string = SpoCommand.isValidSharePointUrl(args.options.webUrl);
      if (isValidSharePointUrl !== true) {
        return isValidSharePointUrl;
      }

      if (!args.options.sourceUrl) {
        return 'Required parameter sourceUrl missing';
      }

      if (!args.options.targetUrl) {
        return 'Required parameter targetUrl missing';
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Remarks:

    When you move a file using the ${chalk.grey(this.name)} command,
    all of the versions are being moved.

  Examples:

    Move file to a document library in another site collection
      ${commands.FILE_MOVE} --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test2/Shared%20Documents/

    Move file to a document library in the same site collection
        ${commands.FILE_MOVE} --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test1/HRDocuments/

    Move file to a document library in another site collection. If a file with
    the same name already exists in the target document library, move it
    to the recycle bin
        ${commands.FILE_MOVE} --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test2/Shared%20Documents/ --deleteIfAlreadyExists

    Moves file to a document library in another site collection. Will ignore any missing fields in the target destination and move anyway
      ${commands.FILE_MOVE} --webUrl https://contoso.sharepoint.com/sites/test1 --sourceUrl /Shared%20Documents/sp1.pdf --targetUrl /sites/test2/Shared%20Documents/ --allowSchemaMismatch

  More information:

    Move items from a SharePoint document library
      https://support.office.com/en-us/article/move-or-copy-items-from-a-sharepoint-document-library-00e2f483-4df3-46be-a861-1f5f0c1a87bc
    `);
  }
}

module.exports = new SpoFileMoveCommand();
