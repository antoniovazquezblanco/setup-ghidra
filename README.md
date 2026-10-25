# Setup Ghidra Action

[![CI](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/main.yml/badge.svg)](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/main.yml)
[![CodeQL](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/codeql.yml/badge.svg)](https://github.com/antoniovazquezblanco/setup-ghidra/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/antoniovazquezblanco/setup-ghidra/badge)](https://scorecard.dev/viewer/?uri=github.com/antoniovazquezblanco/setup-ghidra)

This action sets up a Ghidra environment for use in actions.
Specific Ghidra versions can be selected and even releases from custom forks can be used.

This action will automatically set the `GHIDRA_INSTALL_DIR` variable in your environment.
The installed Ghidra version is exposed as the `version` output and the Java
version it requires as the `java_version` output.

The action will fail if no matching versions are found.

## Usage

**Basic:**

This example just clones your code, setups Ghidra from the oficial repo to the latest release found and setups the java version it requires.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: antoniovazquezblanco/setup-ghidra@v2
    id: setup-ghidra
  - uses: actions/setup-java@v6
    with:
      distribution: temurin
      java-version: ${{ steps.setup-ghidra.outputs.java_version }}
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
  - uses: antoniovazquezblanco/setup-ghidra@v2
    id: setup-ghidra
    with:
      auth_token: ${{ secrets.GITHUB_TOKEN }}
      version: ${{ matrix.ghidra }}
  - uses: actions/setup-java@v6
    with:
      distribution: temurin
      java-version: ${{ steps.setup-ghidra.outputs.java_version }}
  - uses: gradle/actions/setup-gradle@v3
  - name: Build something with Ghidra ${{ matrix.ghidra }}
    run: gradle
```

**Using the installed version:**

The `version` output contains the version that has been installed. This is
specially useful when installing the `latest` version and its exact number is
needed afterwards.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: antoniovazquezblanco/setup-ghidra@v2
    id: setup-ghidra
  - uses: actions/setup-java@v6
    with:
      distribution: temurin
      java-version: ${{ steps.setup-ghidra.outputs.java_version }}
  - name: Build the extension
    run: gradle
  - uses: actions/upload-artifact@v4
    with:
      name: MyGhidraExtension-ci-ghidra-${{ steps.setup-ghidra.outputs.version }}
      path: dist/*.zip
```

**Using the required Java version:**

The `java_version` output contains the Java version needed to build against the
installed Ghidra, as Ghidra sets the source and target compatibility of
extensions to it. Run setup-ghidra before setup-java to use it; this is fine
because setup-ghidra itself does not need Java.

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Install Ghidra
    id: setup-ghidra
    uses: antoniovazquezblanco/setup-ghidra@v2
    with:
      auth_token: ${{ secrets.GITHUB_TOKEN }}
  - name: Install Java
    uses: actions/setup-java@v6
    with:
      distribution: temurin
      java-version: ${{ steps.setup-ghidra.outputs.java_version }}
  - name: Build the extension
    run: gradle
```

**Reference:**

For a full reference of action parameters see [action.yml](action.yml)

```yaml
- uses: antoniovazquezblanco/setup-ghidra@v2
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

## Outputs

| Name           | Description                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `version`      | Version of the Ghidra distribution that has been installed, e.g. `11.3.2`.                            |
| `java_version` | Java version required to build against the installed Ghidra (`application.java.compiler`), e.g. `25`. |
