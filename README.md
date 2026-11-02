# SMA mock portals

Three small static sites for the UiPath Specialty Medication Access demo. UiPath robots work these screens
in the demo. **Every person, plan, number and program here is synthetic.** Nothing on these sites is a real
patient, provider, payer or program.

| Site | Path | Screens |
|---|---|---|
| Lakeshore Health Plan provider portal | `lakeshore/` | Sign in, member eligibility, new medical PA, documents, cases, letters inbox, appeals |
| RxAccess ePA portal | `rxaccess/` | Sign in, new request (drug search, patient, prescriber, BIN/PCN/group), question set, attachments, requests, determinations, appeals |
| Patient Savings enrollment site | `savings/` | Sign in, program choice, eligibility questions, enrollment form with consent, confirmation, foundation referral |

## How outcomes work

There is no server and no stored state. Each outcome follows from the member ID and the submission ID. A
submission ID carries its own UTC timestamp, for example `LKS-MPA-261102-143512-0377` (medical PA submitted
2026-11-02 14:35:12 UTC for the member ending 0377). A new submission shows **Pending for 3 minutes**, then
its scripted outcome. A reset is simply a new submission; each site also has `reset.html` to clear the
browser's sign-in, drafts and list of past submissions.

| Member | Site | Scripted outcome |
|---|---|---|
| LKS884210377 (hero) | Lakeshore | Eligibility active, commercial, medical and pharmacy benefits. Medical PA: Pending, then Denied (case LKS-UM-26-55017, denial letter). Appeal: Pending, then Appeal approved (LKS-PA-26-118377, appeal letter). |
| LKS884210377 (hero) | RxAccess | Pen request: Pending, then Approved (LKS-PA-26-118204, approval letter). The IV vial is refused as a medical-benefit drug. |
| LKS884210377 (hero) | Savings | Enrolled as VSP-26-40418. |
| LKS000000000 | Lakeshore | Coverage terminated 06/30/2026; no PA can be submitted. |
| Medicare or Medicaid members | Savings | Not eligible: federal or state program coverage, with a foundation referral. |
| PSM662041739 (filler F3) | RxAccess | Seeded request `RXA-SEED-F3-1739` stays Pending past 80% of its 24-hour clock. |

The optional information-request path (EX-8) is under "Demo controls" on the Lakeshore PA form.

## Test switches

- `?variant=moved` on any page: adds a maintenance banner and reorders the layout. Element ids do not change.
- `?latency=N`: holds page content for N seconds, as a slow portal would. `?variant=standard` and `?latency=0` turn them off.

## Building and checking

Pages are generated from `tools/build_pages.py` (one shell with the synthetic footer around every page).
`tools/portal-check.cjs` runs every scripted path in Playwright. Sign-ins live in Orchestrator credential
assets, not in this repository.
