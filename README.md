<p align="center"><img src="assets/myway-mark.png" width="100" alt="MyWay logo"></p>

# MyWay

### Your university goal. A pathway you can act on.

A product project by Alif · 3 engineering examples · 10 runnable tests

**[Try MyWay →](https://mywaypath.com)** · [Explore the engineering](docs/engineering.md) · [Read the build story](docs/build-story.md)

MyWay helps students explore business-related university programmes, compare their options, and turn a shortlist into a personal preparation pathway.

The challenge extends beyond displaying university information: students need to understand what matters to them, what evidence is available, and what they should prepare next.

## What I’m building

- A university and programme discovery experience with saved options and comparisons.
- A personalized pathway for shortlisted universities, with progress and preparation tracking.
- Programme-fit explanations that show the reasons behind a result.
- Account-based planning sync with explicit handling of conflicting changes.
- An operator workspace for reviewing university information, sources, and logos.

This repository presents selected working code and the decisions behind it. The complete application is maintained privately.

## Engineering you can inspect

| Example | The problem it addresses | Read the code |
| --- | --- | --- |
| Programme fit | A missing must-have should not quietly become a strong recommendation. | [Matching and recommendation rules](src/programme-fit.ts) |
| Account sync | Two browsers should not silently overwrite each other’s planning changes. | [Revision and conflict handling](src/account-sync.ts) |
| Planning reminders | An ambiguous date should not become a fabricated deadline. | [Calendar validation and reminders](src/planning-reminders.ts) |

Each example includes executable tests using synthetic data. The modules were extracted from the application’s v133 source snapshot; the tests were adapted where necessary to avoid publishing the university dataset.

## Run the examples

Use Node.js 22.13 or newer:

```sh
npm test
```

No package installation, account, API key, or production database is required. These tests exercise selected application logic; they are not a complete system or database security test.

## The work behind the screens

MyWay has been developed through repeated product, interface, data, and reliability iterations. The work includes deciding what a personal pathway should contain, distinguishing missing evidence from negative evidence, handling account conflicts, reviewing catalogue information, and testing failure cases.

Development combines product direction, iterative testing, and AI-assisted implementation. The code examples show concrete decisions and the failure cases they address.

The v133 application snapshot passed TypeScript, a production build, and 48 application tests. The three examples published here have their own ten-test suite.

## Technology

The application uses React, TypeScript, Next.js conventions with Vinext/Vite, Supabase for accounts and catalogue/planning data, and managed hosting with database and object-storage services for feedback. This small showcase runs without those production services.

## Development history

MyWay existed before this showcase repository. Its initial GitHub import is a snapshot, not the start date of the project. Repository history should not be read as a complete record of earlier development.

No production credentials, student records, database dumps, internal review notes, or deployment configuration are included.
