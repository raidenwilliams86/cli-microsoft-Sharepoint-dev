# spo set

Sets the URL of the root SharePoint site collection for use in SPO commands

## Usage

```sh
spo set [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-u, --url <url>`|The URL of the root SharePoint site collection to use in SPO commands
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `json,text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

## Remarks

Office 365 CLI automatically discovers the URL of the root SharePoint site collection/SharePoint tenant admin site (whichever is needed to run the particular command). In specific cases, like when managing multi-geo Office 365 tenants, it could be desirable to make the CLI manage the specific geography. For such cases, you can use this command to explicitly specify the SPO URL that should be used when executing SPO commands.

## Examples

Set SPO URL to the specified URL

```sh
spo set --url https://contoso.sharepoint.com
```
