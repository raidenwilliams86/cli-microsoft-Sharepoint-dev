# spo theme apply

Applies theme to the specified site

## Usage

```sh
spo theme apply [options]
```

## Options

Option|Description
------|-----------
`--help`|output usage information
`-n, --name <name>`|Name of the theme to apply
`-u, --webUrl <webUrl>`|URL of the site to which the theme should be applied
`--sharePointTheme`|Set to specify if the supplied theme name is a standard SharePoint theme
`-o, --output [output]`|Output type. `json|text`. Default `text`
`--verbose`|Runs command with verbose logging
`--debug`|Runs command with debug logging

!!! important
    To use this command you have to have permissions to access the tenant admin site.

## Remarks

Following standard SharePoint themes are supported by the Office 365 CLI: Blue, Orange, Red, Purple, Green, Gray, Dark Yellow and Dark Blue.

## Examples

Apply theme to the specified site

```sh
spo theme apply --name Contoso-Blue --webUrl https://contoso.sharepoint.com/sites/project-x
```

Apply a standard SharePoint theme to the specified site

```sh
spo theme apply --name Blue --webUrl https://contoso.sharepoint.com/sites/project-x --sharePointTheme
```

## More information

- SharePoint site theming: [https://docs.microsoft.com/en-us/sharepoint/dev/declarative-customization/site-theming/sharepoint-site-theming-overview](https://docs.microsoft.com/en-us/sharepoint/dev/declarative-customization/site-theming/sharepoint-site-theming-overview)
- Theme Generator: [https://developer.microsoft.com/en-us/fabric#/styles/themegenerator](https://developer.microsoft.com/en-us/fabric#/styles/themegenerator)