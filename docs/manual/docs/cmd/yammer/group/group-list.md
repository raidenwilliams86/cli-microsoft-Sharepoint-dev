# yammer group list

Returns the list of groups in a Yammer network or the groups for a specific user

## Usage

```sh
yammer group list [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`--userId [userId]`|Returns the groups for a specific user
`--limit [limit]`|Limits the groups returned
`-o, --output [output]`|Output type. `json,text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

## Remarks

!!! attention
    In order to use this command, you need to grant the Azure AD application used by the Office 365 CLI the permission to the Yammer API. To do this, execute the `cli consent --service yammer` command.

## Examples

Returns all Yammer network groups

```sh
yammer group list
```

Returns all Yammer network groups for the user with the ID `5611239081`

```sh
yammer group list --userId 5611239081
```

Returns the first 10 Yammer network groups

```sh
yammer group list --limit 10
```

Returns the first 10 Yammer network groups for the user with the ID `5611239081`

```sh
yammer group list --userId 5611239081 --limit 10
```
