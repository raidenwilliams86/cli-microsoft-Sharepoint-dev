# spo web clientsidewebpart list

Lists available client-side web parts

## Usage

```sh
spo web clientsidewebpart list [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-u, --webUrl <webUrl>`|URL of the site for which to retrieve the information
`-o, --output [output]`|Output type. `json|text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

!!! important
    Before using this command, log in to a SharePoint Online site, using the [spo login](../login.md) command.

## Remarks

To get the list of available client-side web parts, you have to first log in to a SharePoint site using the [spo login](../login.md) command, eg. `spo login https://contoso.sharepoint.com`.

## Examples

Lists all the available client-side web parts for the specified site

```sh
spo web clientsidewebpart list --webUrl https://contoso.sharepoint.com
```