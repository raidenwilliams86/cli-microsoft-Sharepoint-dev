# tenant status list

Gets health status of the different services in Microsoft 365

## Usage

```sh
tenant status list [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `json|text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

## Examples

Get health status of the different services in Microsoft 365

```sh
tenant status list
```

## More information

- Microsoft 365 Service Communications API reference: [https://docs.microsoft.com/en-us/office/office-365-management-api/office-365-service-communications-api-reference#get-current-status](https://docs.microsoft.com/en-us/office/office-365-management-api/office-365-service-communications-api-reference#get-current-status)
