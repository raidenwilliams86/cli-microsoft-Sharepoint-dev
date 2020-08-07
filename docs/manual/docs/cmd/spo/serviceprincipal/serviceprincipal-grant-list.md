# spo serviceprincipal grant list

Lists permissions granted to the service principal

## Usage

```sh
spo serviceprincipal grant list [options]
```

## Alias

```sh
spo sp grant list
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `json,text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

!!! important
    To use this command you have to have permissions to access the tenant admin site.

## Examples

List all permissions granted to the service principal

```sh
spo serviceprincipal grant list
```