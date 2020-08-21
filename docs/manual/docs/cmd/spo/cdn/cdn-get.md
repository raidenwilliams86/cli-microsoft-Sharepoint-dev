# spo cdn get

View current status of the specified Microsoft 365 CDN

## Usage

```sh
spo cdn get [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-t, --type [type]`|Type of CDN to manage. `Public,Private`. Default `Public`
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `json,text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

!!! important
    To use this command you have to have permissions to access the tenant admin site.

## Remarks

Using the `-t, --type` option you can choose whether you want to manage the settings of the Public (default) or Private CDN. If you don't use the option, the command will use the Public CDN.

## Examples

Show if the Public CDN is currently enabled or not

```sh
spo cdn get
```

Show if the Private CDN is currently enabled or not

```sh
spo cdn get -t Private
```

## More information

- General availability of Microsoft 365 CDN: [https://dev.office.com/blogs/general-availability-of-office-365-cdn](https://dev.office.com/blogs/general-availability-of-office-365-cdn)