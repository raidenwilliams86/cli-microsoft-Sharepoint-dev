# cli consent

Consent additional permissions for the Azure AD application used by the Office 365 CLI

## Usage

```sh
cli consent [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-s, --service <service>`|Service for which to consent permissions. Allowed values: `yammer`
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `json,text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

## Remarks

Using the `cli consent` command you can consent additional permissions for the Azure AD application used by the Office 365 CLI. This is for example necessary to use Yammer commands, which require the Yammer API permission that isn't granted to the CLI by default.

After executing the command, the Office 365 CLI will present you with a URL that you need to open in the web browser in order to consent the permissions for the selected Office 365 service.

To simplify things, rather than wondering which permissions you should grant for which CLI commands, this command allows you to easily grant all the necessary permissions for using commands for the specified Office 365 service, like Yammer.

## Examples

Consent permissions to the Yammer API

```sh
cli consent --service yammer
```
