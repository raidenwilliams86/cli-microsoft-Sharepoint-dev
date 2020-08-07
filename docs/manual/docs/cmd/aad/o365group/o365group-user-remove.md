# aad o365group user remove

Removes the specified user from specified Office 365 Group or Microsoft Teams team

## Usage

```sh
aad o365group user remove [options]
```

## Alias

```sh
aad teams user remove
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-i, --groupId [groupId]`|The ID of the Office 365 Group from which to remove the user
`--teamId [teamId]`|The ID of the Microsoft Teams team from which to remove the user
`-n, --userName <userName>`|User's UPN (user principal name), eg. `johndoe@example.com`
`--confirm`|Don't prompt for confirming removing the user from the specified Office 365 Group or Microsoft Teams team
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `json,text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

## Remarks

You can remove users from a Office 365 Group or Microsoft Teams team if you are owner of that group or team.

## Examples

Removes user from the specified Office 365 Group

```sh
aad o365group user remove --groupId '00000000-0000-0000-0000-000000000000' --userName 'anne.matthews@contoso.onmicrosoft.com'
```

Removes user from the specified Office 365 Group without confirmation

```sh
aad o365group user remove --groupId '00000000-0000-0000-0000-000000000000' --userName 'anne.matthews@contoso.onmicrosoft.com' --confirm
```

Removes user from the specified Microsoft Teams team

```sh
aad teams user remove --teamId '00000000-0000-0000-0000-000000000000' --userName 'anne.matthews@contoso.onmicrosoft.com'
```