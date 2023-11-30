[![CI](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/main.yml/badge.svg)](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/main.yml)

# setup-ghidra

This action sets up a Ghidra environment for use in actions.
Specific Ghidra versions can be selected and even releases from custom forks can be used.

This action will automatically set the `GHIDRA_INSTALL_PATH` variable in your environment.

The action will fail if no matching versions are found.


## Inputs

### `version`

**Required** Version of Ghidra. Default `"latest"`.

## Usage

Before setup Ghidra, you need to setup Java 11.0.x environment using `actions/setup-java`.
This action doesn't use Docker, so you can use both Windows, Linux and MacOS for `runs-on` environment.

```yaml
runs-on: ${{ matrix.os }}
strategy:
  matrix:
    os: [macos-latest, windows-latest, ubuntu-latest]
steps:
  - uses: actions/checkout@v1
  - uses: actions/setup-java@v1
    java-version: "11.0.x"
    java-package: jdk
    architecture: x64
  - uses: er28-0652/setup-ghidra@master
    with:
      version: "9.1.1"
```
