# spo page list

Lists all modern pages in the given site

## Usage

```sh
spo page list [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-u, --webUrl <webUrl>`|URL of the site from which to retrieve available pages
`-o, --output [output]`|Output type. `json|text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

!!! important
    Before using this command, log in to a SharePoint Online site, using the [spo login](../login.md) command.

## Remarks

To list all modern pages in the specific site, you have to first log in to a SharePoint site using the [spo login](../login.md) command, eg. `spo login https://contoso.sharepoint.com`.

## Examples

List all modern pages in the specific site

```sh
spo page list --webUrl https://contoso.sharepoint.com/sites/team-a
```