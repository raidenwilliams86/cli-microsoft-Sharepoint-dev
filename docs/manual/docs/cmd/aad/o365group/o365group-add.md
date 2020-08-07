# aad o365group add

Creates Office 365 Group

## Usage

```sh
aad o365group add [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-n, --displayName <displayName>`|Display name for the Office 365 Group
`-d, --description <description>`|Description for the Office 365 Group
`-m, --mailNickname <mailNickname>`|Name to use in the group e-mail (part before the `@`)
`--owners [owners]`|Comma-separated list of Office 365 Group owners
`--members [members]`|Comma-separated list of Office 365 Group members
`--isPrivate [isPrivate]`|Set to `true` if the Office 365 Group should be private and to `false` if it should be public (default)
`-l, --logoPath [logoPath]`|Local path to the image file to use as group logo
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `json,text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

## Remarks

When specifying the path to the logo image you can use both relative and absolute paths. Note, that ~ in the path, will not be resolved and will most likely result in an error.

## Examples

Create a public Office 365 Group

```sh
aad o365group add --displayName Finance --description 'This is the Contoso Finance Group. Please come here and check out the latest news, posts, files, and more.' --mailNickname finance
```

Create a private Office 365 Group

```sh
aad o365group add --displayName Finance --description 'This is the Contoso Finance Group. Please come here and check out the latest news, posts, files, and more.' --mailNickname finance --isPrivate true
```

Create a public Office 365 Group and set specified users as its owners

```sh
aad o365group add --displayName Finance --description 'This is the Contoso Finance Group. Please come here and check out the latest news, posts, files, and more.' --mailNickname finance --owners "DebraB@contoso.onmicrosoft.com,DiegoS@contoso.onmicrosoft.com"
```

Create a public Office 365 Group and set specified users as its members

```sh
aad o365group add --displayName Finance --description 'This is the Contoso Finance Group. Please come here and check out the latest news, posts, files, and more.' --mailNickname finance --members "DebraB@contoso.onmicrosoft.com,DiegoS@contoso.onmicrosoft.com"
```

Create a public Office 365 Group and set its logo

```sh
aad o365group add --displayName Finance --description 'This is the Contoso Finance Group. Please come here and check out the latest news, posts, files, and more.' --mailNickname finance --logoPath images/logo.png
```
