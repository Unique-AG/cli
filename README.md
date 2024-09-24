qcli
=================

Unique CLI, wrapping the most common actions needed by Uniques clients into a single command line tool.

> [!NOTE]
> The Unique CLI is incubating. Until version 1.0.0 also minor versions can contain breaking changes 💥

<!-- toc -->

<!-- tocstop -->

## Contributing
See the [contributing guide](CONTRIBUTING.md) for more information.

## Usage
<!-- usage -->
```sh-session
$ npm install -g @unique-ag/cli
$ qcli COMMAND
running command...
$ qcli (--version)
@unique-ag/cli/0.4.1 darwin-arm64 node-v20.14.0
$ qcli --help [COMMAND]
USAGE
  $ qcli COMMAND
...
```
<!-- usagestop -->
## Commands
<!-- commands -->
* [`qcli az acr import [FILE]`](#qcli-az-acr-import-file)
* [`qcli help [COMMAND]`](#qcli-help-command)
* [`qcli mirror charts`](#qcli-mirror-charts)
* [`qcli mirror images`](#qcli-mirror-images)
* [`qcli plugins`](#qcli-plugins)
* [`qcli plugins:inspect PLUGIN...`](#qcli-pluginsinspect-plugin)
* [`qcli plugins install PLUGIN`](#qcli-plugins-install-plugin)
* [`qcli plugins link PATH`](#qcli-plugins-link-path)
* [`qcli plugins reset`](#qcli-plugins-reset)
* [`qcli plugins uninstall [PLUGIN]`](#qcli-plugins-uninstall-plugin)
* [`qcli plugins update`](#qcli-plugins-update)

## `qcli az acr import [FILE]`

describe the command here

```
USAGE
  $ qcli az acr import [FILE] [-f] [-n <value>]

ARGUMENTS
  FILE  file to read

FLAGS
  -f, --force
  -n, --name=<value>  name to print

DESCRIPTION
  describe the command here

EXAMPLES
  $ qcli az acr import
```

_See code: [src/commands/az/acr/import.ts](https://github.com/Unique-AG/cli/blob/v0.4.1/src/commands/az/acr/import.ts)_

## `qcli help [COMMAND]`

Display help for qcli.

```
USAGE
  $ qcli help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for qcli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.6/src/commands/help.ts)_

## `qcli mirror charts`

Pulls charts from a source and pushes them to a new registry.

```
USAGE
  $ qcli mirror charts -f <value> [-k] [-p <value>] [-s <value>] [-t <value>]

FLAGS
  -f, --chart-list-file=<value>    (required) [default: examples/mirror-charts.schema.yaml] Path to file that contains a
                                   list of charts to mirror.
  -k, --keep                       If true, keeps the downloaded tarballs.
  -p, --push-plugin=<value>        [default: push] Which plugin will be used to "push" charts to the target.
                                   Defaults to native helm push but could be set to e.g. "cm-push" (for ChartMuseum).
                                   Note: The plugin must be pre-installed using "helm plugin install".
  -s, --source-repository=<value>  Source repository from where the charts will be pulled, this overrides the value
                                   specified in the chart-list-file.
  -t, --target-repository=<value>  Target repository where the charts will go, this overrides the value specified in the
                                   chart-list-file.

DESCRIPTION

  Pulls charts from a source and pushes them to a new registry.
  The "chart-list-file" flag specifies which charts to mirror. You can find an example config file in
  https://github.com/Unique-AG/cli/tree/main/examples.

  For security reasons, the active session must be preemptively logged in to both OCI registries.

ALIASES
  $ qcli m c

EXAMPLES
  export SOURCE_OCI_REGISTRY: <VALUE>
  export SOURCE_OCI_USERNAME: <SENSITIVE_VALUE>
  export SOURCE_OCI_PASSWORD: <SENSITIVE_VALUE>
  export TARGET_OCI_REGISTRY: <VALUE>
  export TARGET_OCI_USERNAME: <SENSITIVE_VALUE>
  export TARGET_OCI_PASSWORD: <SENSITIVE_VALUE>
  docker login $SOURCE_OCI_REGISTRY -u $SOURCE_OCI_USERNAME -p $SOURCE_OCI_PASSWORD
  docker login $TARGET_OCI_REGISTRY -u $TARGET_OCI_USERNAME -p $TARGET_OCI_PASSWORD
  $ qcli mirror charts

  export SOURCE_OCI_REGISTRY: <VALUE>
  export SOURCE_OCI_USERNAME: <SENSITIVE_VALUE>
  export SOURCE_OCI_PASSWORD: <SENSITIVE_VALUE>
  docker login $SOURCE_OCI_REGISTRY -u $SOURCE_OCI_USERNAME -p $SOURCE_OCI_PASSWORD
  az acr login --name <REGISTRY_NAME>
  $ qcli mirror charts
```

_See code: [src/commands/mirror/charts.ts](https://github.com/Unique-AG/cli/blob/v0.4.1/src/commands/mirror/charts.ts)_

## `qcli mirror images`

Pulls images from a source, retags them, and pushes them to a new registry.

```
USAGE
  $ qcli mirror images -f <value> [-b <value>] [-s <value>] [-t <value>]

FLAGS
  -b, --batch-size=<value>       [default: 2] Number of images to transfer in a single batch in parallel. The higher the
                                 number, the more resources will be consumed.
  -f, --image-list-file=<value>  (required) [default: examples/mirror-images.schema.yaml] Path to file that contains a
                                 list of images to mirror.
  -s, --source-registry=<value>  Source registry from where the images will be pulled, this overrides the value
                                 specified in the image-list-file.
  -t, --target-registry=<value>  Target registry where the images will go, this overrides the value specified in the
                                 image-list-file.

DESCRIPTION

  Pulls images from a source, retags them, and pushes them to a new registry.
  The "image-list-file" flag specifies which images to mirror. You can find an example config file in
  https://github.com/Unique-AG/cli/tree/main/examples.

  For security reasons, the active session must be preemptively logged in to both OCI registries.

ALIASES
  $ qcli m i

EXAMPLES
  export SOURCE_OCI_REGISTRY: <VALUE>
  export SOURCE_OCI_USERNAME: <SENSITIVE_VALUE>
  export SOURCE_OCI_PASSWORD: <SENSITIVE_VALUE>
  export TARGET_OCI_REGISTRY: <VALUE>
  export TARGET_OCI_USERNAME: <SENSITIVE_VALUE>
  export TARGET_OCI_PASSWORD: <SENSITIVE_VALUE>
  docker login $SOURCE_OCI_REGISTRY -u $SOURCE_OCI_USERNAME -p $SOURCE_OCI_PASSWORD
  docker login $TARGET_OCI_REGISTRY -u $TARGET_OCI_USERNAME -p $TARGET_OCI_PASSWORD
  $ qcli mirror images

  export SOURCE_OCI_REGISTRY: <VALUE>
  export SOURCE_OCI_USERNAME: <SENSITIVE_VALUE>
  export SOURCE_OCI_PASSWORD: <SENSITIVE_VALUE>
  docker login $SOURCE_OCI_REGISTRY -u $SOURCE_OCI_USERNAME -p $SOURCE_OCI_PASSWORD
  az acr login --name <REGISTRY_NAME>
  $ qcli mirror images
```

_See code: [src/commands/mirror/images.ts](https://github.com/Unique-AG/cli/blob/v0.4.1/src/commands/mirror/images.ts)_

## `qcli plugins`

List installed plugins.

```
USAGE
  $ qcli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ qcli plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.7/src/commands/plugins/index.ts)_

## `qcli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ qcli plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ qcli plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.7/src/commands/plugins/inspect.ts)_

## `qcli plugins install PLUGIN`

Installs a plugin into qcli.

```
USAGE
  $ qcli plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into qcli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the QCLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the QCLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ qcli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ qcli plugins install myplugin

  Install a plugin from a github url.

    $ qcli plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ qcli plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.7/src/commands/plugins/install.ts)_

## `qcli plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ qcli plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ qcli plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.7/src/commands/plugins/link.ts)_

## `qcli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ qcli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.7/src/commands/plugins/reset.ts)_

## `qcli plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ qcli plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ qcli plugins unlink
  $ qcli plugins remove

EXAMPLES
  $ qcli plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.7/src/commands/plugins/uninstall.ts)_

## `qcli plugins update`

Update installed plugins.

```
USAGE
  $ qcli plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.7/src/commands/plugins/update.ts)_
<!-- commandsstop -->

## Examples
For some commands, you find example files in [examples](https://github.com/Unique-AG/cli/tree/main/examples) folder. Most commands with example files also have a default example file that is used if no file is specified.
