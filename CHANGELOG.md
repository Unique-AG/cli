# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2024-09-24

### Added
#### `az:acr:import`
The `az:acr:import` command imports images from a source container registry to a Azure Container Registry but using the ACRs native import feature. Read the two commands help for more information on the difference.


## [0.4.1] - 2024-08-14

### Changed
#### `mirror:charts`
- Command now supports flag `-p`/`--push-plugin` to select different helm plugins to push the charts to the destination registry. Refer to the command documentation for more detail.

## [0.4.0] - 2024-08-06

### Changed
#### `mirror:images`
- **Breaking💥**: Flag syntax now uses lower-kebab-case instead of camelCase to adhere to [`oclif` best practices](https://github.com/oclif/oclif/blob/main/src/commands/readme.ts).
- Stop using `ux.action` as it is not compatible with parallel processing (it is a singleton so it only updates one status at a time).
- Revert CoPilot changes to the command to make it sequential in batches again.

### Added
#### `mirror:charts`
The `mirror:charts` command mirrors Helm charts from a source to a destination repository equal to what `mirror:images` does for container images.

## [0.3.1] - 2024-08-05

### Changed
- Automatically trigger publish when a release is created.

#### `mirror:images`
- Add example file [`mirror-images.schema.yaml`](./examples/mirror-images.schema.yaml)to documentation.
- Improve description of the command itself. Ensuring immutability is not yet enforced and might be added later.
