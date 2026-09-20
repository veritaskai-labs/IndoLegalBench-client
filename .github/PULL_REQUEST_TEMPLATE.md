## Sub task

<!-- Jira key and link, e.g. SCRUM-93. One PR covers one sub task. -->

SCRUM-

## What changed

<!-- Describe the change itself, not the ticket. What does the code do now
     that it did not do before? -->

## How to test

<!-- Steps a reviewer can actually follow. Which page, which command,
     what should they see? -->

1.
2.

## Contract impact

<!-- CONTRIBUTING section 6. Delete whichever line does not apply. -->

- [ ] This PR does not touch the OpenAPI contract
- [ ] This PR consumes a contract change — the server PR is linked above and the change was announced in the group chat

## Screenshots

<!-- UI changes only. Before and after if you changed something existing. -->

## Sub task checklist

Every box must be ticked before you ask for review.

- [ ] Branch is named `<type>/<pbi>-<description>` and targets `staging`
- [ ] Commits follow Conventional Commits
- [ ] `npm run lint` passes locally
- [ ] `npm run test` passes locally
- [ ] `npm run build` passes locally
- [ ] Tests added or updated for this change
- [ ] No secrets, `.env` files or credentials in the diff
- [ ] New environment variables are documented in `.env.example`
- [ ] Diff is under roughly 400 lines, or split into several PRs

## Definition of Done

The team DoD is scored per PBI, not per PR (CONTRIBUTING section 8). Tick
only what this PR actually contributes to, so the PO can trace the PBI at
sprint review.

- [ ] **Design Reviewed** — the design behind this change was reviewed before coding
- [ ] **Code Completed** — this sub task is fully implemented, nothing left as a TODO
- [ ] **Tested** — unit and integration tests run, coverage stays above 60 percent
- [ ] **No Blocker Bugs** — nothing here breaks the main flow
- [ ] **Accepted by PO** — <!-- PBI level, usually ticked on the last PR of the PBI -->
- [ ] **Live on Production** — <!-- PBI level, ticked at release time -->

## Reviewer

<!-- Tag one person. Do not merge your own PR. -->
