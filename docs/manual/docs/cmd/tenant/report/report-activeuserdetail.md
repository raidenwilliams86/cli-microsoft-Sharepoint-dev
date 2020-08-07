# tenant report activeuserdetail

Gets details about Office 365 active users

## Usage

```sh
tenant report activeuserdetail [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-d, --date [date]`|The date for which you would like to view the users who performed any activity. Supported date format is `YYYY-MM-DD`. Specify the date or period, but not both.
`-p, --period [period]`|The length of time over which the report is aggregated. Supported values `D7,D30,D90,D180`
`-f, --outputFile [outputFile]`|Path to the file where the report should be stored in
`--query [query]`|JMESPath query string. See [http://jmespath.org/](http://jmespath.org/) for more information and examples
`-o, --output [output]`|Output type. `text,json`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

## Remarks

As this report is only available for the past 28 days, date parameter value should be a date from that range.

## Examples

Gets details about Office 365 active users for the last week

```sh
tenant report activeuserdetail --period D7
```

Gets details about Office 365 active users for May 1, 2019

```sh
tenant report activeuserdetail --date 2019-05-01
```

Gets details about Office 365 active users for the last week and exports the report data in the specified path in text format

```sh
tenant report activeuserdetail --period D7 --output text --outputFile "activeuserdetail.txt"
```

Gets details about Office 365 active users for the last week and exports the report data in the specified path in json format

```sh
tenant report activeuserdetail --period D7 --output json --outputFile "activeuserdetail.json"
```
