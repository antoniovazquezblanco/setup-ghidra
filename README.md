# Setup Ghidra Action

[![CI](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/main.yml/badge.svg)](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/main.yml)
[![CodeQL](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/codeql.yml/badge.svg)](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/codeql.yml)

This action sets up a Ghidra environment for use in actions.
Specific Ghidra versions can be selected and even releases from custom forks can be used.

This action will automatically set the `GHIDRA_INSTALL_PATH` variable in your environment.

The action will fail if no matching versions are found.

## Usage

**Basic:**

This example just clones your code, setups java and setups Ghidra from the oficial repo to the latest release found.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-java@v4
  - uses: antoniovazquezblanco/setup-ghidra@v2.0.12
```

**Advanced:**

This example tries to build a module project using different Ghidra versions.

```yaml
strategy:
  matrix:
    ghidra:
      - "11.3.2"
      - "11.2.1"
      - "11.1.2"

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-java@v4
  - uses: gradle/actions/setup-gradle@v3
  - uses: antoniovazquezblanco/setup-ghidra@v2.0.12
    with:
      auth_token: ${{ secrets.GITHUB_TOKEN }}
      version: ${{ matrix.ghidra }}
  - name: Build something with Ghidra ${{ matrix.ghidra }}
    run: gradle -PGHIDRA_INSTALL_DIR=${{ env.GHIDRA_INSTALL_DIR }}
```

**Reference:**

For a full reference of action parameters see [action.yml](action.yml)

```yaml
- uses: antoniovazquezblanco/setup-ghidra@v2.0.12
  with:
    # A distribution download URL to directly download and install it.
    # If this argument is specified, both the repository and version arguments
    # will be ignored.
    # Example:
    # download_url: 'https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_10.4_build/ghidra_10.4_PUBLIC_20230928.zip'
    download_url: ""

    # The owner of the repository to look for Ghidra releases. By default, NSA
    # official user is used.
    owner: "NationalSecurityAgency"

    # A repository on which to find releases. By default, NSA official repo
    # name is used.
    repository: "ghidra"

    # Version spec to use. Please use SemVer notation. It also accepts the
    # 'latest' alias to download the latest version available.
    version: "latest"

    # SHA256 sum value to check the downloaded tool against. You may use the
    # keyworkd 'skip' to not perform this check or the keyworkd 'online' to
    # check against the release notes in the repository. Otherwise, a valid
    # hexadecimal string is expected.
    sha256sum: "online"

    # Github authentication token to avoid API limiting.
    # This is optional.
    auth_token: ${{ secrets.GITHUB_TOKEN }}
```
