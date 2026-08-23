# Security model

MeepleReach is local-first and performs no network requests in its core or CLI. The browser demo fetches only the bundled `sample.json` from the same origin.

## Trust boundaries

- Scenario JSON is untrusted input. The validator rejects unknown fields, invalid numbers, unresolved references, and invalid geometry.
- Labels are user-controlled. SVG and HTML renderers escape markup before insertion.
- CSV includes slug IDs and numeric/boolean values, not free-form labels, avoiding spreadsheet formula cells.
- Output paths are caller-controlled. An existing directory is rejected unless `--force`; force overwrites only the four known artifact filenames and does not recursively delete the directory.
- Unexpected errors are not swallowed. The CLI prints a stack and exits `1`.

## Data handling

No telemetry, cookies, accounts, remote APIs, or persistence are included. Reports contain the scenario supplied by the user, so review labels and measurements before sharing a report publicly.

Report vulnerabilities privately through the repository's GitHub security advisory interface. Do not include sensitive personal measurements in a public issue.
