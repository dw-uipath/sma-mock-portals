#!/usr/bin/env python3
"""Generate the static pages of the three SMA mock portals.

Every page shares one shell (header, navigation, synthetic-data footer). Page
logic lives in <site>/<site>.js; shared data and helpers in assets/sma.js.
Run from anywhere: python3 tools/build_pages.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FOOTER = ('<footer class="synthetic" id="synthetic-footer"><strong>SYNTHETIC DEMO DATA, NOT A REAL PATIENT</strong>'
          ' &middot; Fictional payer, programs, people and numbers for UiPath demonstrations only.'
          ' Not affiliated with any real organization.</footer>')

SITES = {
    'lakeshore': {
        'name': 'Lakeshore Health Plan', 'tagline': 'Provider portal', 'mark': 'LHP', 'home': 'search.html',
        'nav': [('search', 'Eligibility'), ('pa-new', 'New medical PA'), ('cases', 'Cases'),
                ('letters', 'Letters inbox'), ('appeal', 'Appeals')],
    },
    'rxaccess': {
        'name': 'RxAccess ePA', 'tagline': 'Electronic prior authorization', 'mark': 'Rx', 'home': 'requests.html',
        'nav': [('new', 'New request'), ('requests', 'Requests'), ('appeal', 'Appeals')],
    },
    'savings': {
        'name': 'Vedolizumab Patient Savings Program', 'tagline': 'Provider enrollment', 'mark': 'VSP',
        'home': 'program.html',
        'nav': [('program', 'Enroll a patient'), ('foundation', 'Foundation referral')],
    },
}


def field(fid, label, placeholder='', hint='', kind='text'):
    ph = f' placeholder="{placeholder}"' if placeholder else ''
    h = f'<span class="hint">{hint}</span>' if hint else ''
    return (f'<div class="field"><label for="{fid}">{label}</label>'
            f'<input type="{kind}" id="{fid}" name="{fid}" autocomplete="off"{ph}>{h}</div>')


def area(fid, label, rows=6, placeholder='', hint=''):
    ph = f' placeholder="{placeholder}"' if placeholder else ''
    h = f'<span class="hint">{hint}</span>' if hint else ''
    return (f'<div class="field" style="margin-top:.9rem"><label for="{fid}">{label}</label>'
            f'<textarea id="{fid}" name="{fid}" rows="{rows}"{ph}></textarea>{h}</div>')


def select(fid, label, options, hint=''):
    opts = ''.join(f'<option value="{v}">{t}</option>' for v, t in options)
    h = f'<span class="hint">{hint}</span>' if hint else ''
    return f'<div class="field"><label for="{fid}">{label}</label><select id="{fid}" name="{fid}">{opts}</select>{h}</div>'


YES_NO = [('', 'Select'), ('Yes', 'Yes'), ('No', 'No')]


def facts(rows):
    return '<dl class="facts">' + ''.join(f'<dt>{t}</dt><dd id="{i}"></dd>' for i, t in rows) + '</dl>'


def steps(labels, on):
    return '<ol class="steps">' + ''.join(
        f'<li class="{"on" if n == on else ""}">{n} &middot; {t}</li>' for n, t in enumerate(labels, 1)) + '</ol>'


def login(site, title, lede):
    return f'''<div class="card narrow">
  <h1 id="login-title">{title}</h1>
  <p class="lede">{lede}</p>
  <form id="login-form" autocomplete="off">
    {field('login-username', 'Username')}
    <div style="height:.75rem"></div>
    {field('login-password', 'Password', kind='password')}
    <div class="actions"><button type="submit" id="login-submit">Sign in</button></div>
    <div class="alert error" id="login-error" role="alert" hidden></div>
  </form>
</div>'''


def reset(site_name):
    return f'''<div class="card narrow">
  <h1>Reset</h1>
  <p class="alert ok" id="reset-status">Resetting&hellip;</p>
  <p>Outcomes on {site_name} are scripted by member ID and submission ID. Nothing is stored on a server, so a
  new submission always starts its scripted sequence again. This page clears this browser's sign-in, drafts
  and list of past submissions.</p>
  <div class="actions"><a class="button" id="reset-sign-in" href="index.html">Sign in</a></div>
</div>'''


# ---------------------------------------------------------------- Lakeshore
LKS_PA_STEPS = ['Request details', 'Documents', 'Confirmation']
LAKESHORE = {
    'index': ('Sign in', False, login('lakeshore', 'Provider portal sign in',
              'Lakeshore Health Plan provider services: eligibility, prior authorization, letters and appeals.')),
    'search': ('Eligibility', True, f'''<div class="stack">
<section class="card">
  <h1>Member eligibility</h1>
  <p class="lede">Search by member ID and date of birth.</p>
  <form id="search-form">
    <div class="grid2">
      {field('search-member-id', 'Member ID', 'LKS000000000')}
      {field('search-dob', 'Date of birth', 'MM/DD/YYYY', 'MM/DD/YYYY')}
    </div>
    <div class="actions"><button type="submit" id="search-submit">Check eligibility</button></div>
    <div class="alert error" id="search-error" role="alert" hidden></div>
  </form>
</section>
<section class="card">
  <h2>Provider services</h2>
  <p>Provider services (800) 555-0131 &middot; Pharmacy help desk (800) 555-0136 &middot; UM fax (800) 555-0138</p>
</section>
</div>'''),
    'eligibility': ('Eligibility result', True, f'''<div class="stack">
<section class="card" id="elig-card" hidden>
  <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start">
    <div><h1 id="elig-member-name"></h1>
    <p class="lede">Eligibility response <span id="elig-reference"></span> &middot; checked <span id="elig-checked-at"></span></p></div>
    <span class="pill big-status" id="elig-status"></span>
  </div>
  <div class="alert" id="elig-status-detail"></div>
  <div style="height:1rem"></div>
  {facts([('elig-member-id', 'Member ID'), ('elig-dob', 'Date of birth'), ('elig-plan', 'Plan'),
          ('elig-coverage-type', 'Coverage type'), ('elig-employer', 'Employer group'), ('elig-group', 'Group number'),
          ('elig-effective', 'Coverage effective'), ('elig-end', 'Coverage end'),
          ('elig-medical-benefit', 'Medical benefit'), ('elig-pharmacy-benefit', 'Pharmacy benefit'),
          ('elig-pbm', 'PBM'), ('elig-rx-bin', 'Rx BIN'), ('elig-rx-pcn', 'Rx PCN'), ('elig-rx-group', 'Rx group'),
          ('elig-phones', 'Payer phone numbers')])}
  <div class="actions"><a class="button" id="elig-start-pa" href="pa-new.html">Start medical PA</a>
  <a class="button secondary" id="elig-new-search" href="search.html">New search</a></div>
</section>
<section class="card" id="elig-not-found" hidden>
  <h1>No member found</h1>
  <p id="elig-not-found-text">No member matches that member ID and date of birth.</p>
  <a class="button secondary" id="elig-back" href="search.html">Back to search</a>
</section>
</div>'''),
    'pa-new': ('New medical PA', True, f'''<div class="stack">
<section class="card">
  {steps(LKS_PA_STEPS, 1)}
  <h1>New medical prior authorization</h1>
  <p class="lede">Drugs and services billed to the medical benefit (HCPCS). Pharmacy-benefit drugs go through ePA.</p>
  <form id="pa-form">
    <div class="grid3">
      {field('pa-member-id', 'Member ID', 'LKS000000000')}
      {field('pa-prescriber-npi', 'Prescriber NPI', '10 digits')}
      {field('pa-hcpcs', 'HCPCS code', 'J0000')}
      {field('pa-drug', 'Drug')}
      {field('pa-dose', 'Dose', 'e.g. 300 mg')}
      {field('pa-doses', 'Number of doses')}
      {field('pa-site-of-care', 'Site of care')}
      {field('pa-icd10', 'ICD-10 diagnosis', 'K00.000')}
      {select('pa-urgency', 'Urgency', [('Standard', 'Standard'), ('Expedited', 'Expedited')])}
    </div>
    <details id="pa-demo-controls" style="margin-top:1rem"><summary>Demo controls</summary>
      <div style="max-width:380px;margin-top:.5rem">{select('pa-demo-scenario', 'Scripted path',
        [('standard', 'Standard scripted outcome'), ('rfi', 'Add an information request before the outcome')])}</div>
    </details>
    <div class="actions"><button type="submit" id="pa-continue">Continue to documents</button></div>
    <div class="alert error" id="pa-error" role="alert" hidden></div>
  </form>
</section>
</div>'''),
    'pa-attach': ('Supporting documents', True, f'''<div class="stack">
<section class="card">
  {steps(LKS_PA_STEPS, 2)}
  <h1>Supporting documents</h1>
  <div class="alert info" id="pa-summary"></div>
  {area('pa-letter', 'Letter of medical necessity', 12, hint='Paste the signed letter, or upload it below.')}
  {area('pa-attachment-list', 'Clinical documents attached', 4, 'One document per line')}
  <div class="field" style="margin-top:.9rem"><label for="pa-file">Upload files (optional)</label>
    <input type="file" id="pa-file" multiple><span class="hint" id="pa-file-list"></span></div>
  <div class="actions"><a class="button secondary" id="pa-back" href="pa-new.html">Back</a>
    <button type="button" id="pa-submit">Submit request</button></div>
  <div class="alert error" id="pa-attach-error" role="alert" hidden></div>
</section>
</div>'''),
    'pa-submitted': ('Request submitted', True, f'''<div class="stack">
<section class="card">
  {steps(LKS_PA_STEPS, 3)}
  <div class="alert ok" id="submission-banner">Request submitted. Keep the submission ID to check status.</div>
  <div style="height:1rem"></div>
  {facts([('submission-id', 'Submission ID'), ('submission-status', 'Status'), ('submitted-at', 'Submitted (UTC)'),
          ('submitted-at-local', 'Submitted (local)'), ('submission-case-number', 'Payer case number'),
          ('submission-member', 'Member'), ('submission-service', 'Service'), ('submission-urgency', 'Urgency'),
          ('submission-due', 'Response due by')])}
  <div class="actions"><a class="button" id="submission-view-case" href="cases.html">View case status</a>
  <a class="button secondary" id="submission-new" href="pa-new.html">New request</a></div>
</section>
</div>'''),
    'cases': ('Cases', True, f'''<div class="stack">
<section class="card">
  <h1>Prior authorization cases</h1>
  <form id="case-search-form">
    <div class="grid2">{field('case-search-id', 'Find by submission ID or appeal ID', 'LKS-MPA-...')}</div>
    <div class="actions"><button type="submit" id="case-search-submit">Open case</button></div>
    <div class="alert error" id="case-search-error" role="alert" hidden></div>
  </form>
</section>
<section class="card">
  <h2>Submitted from this browser</h2>
  <table class="list"><thead><tr><th>Submission ID</th><th>Member</th><th>Service</th><th>Submitted</th><th>Status</th></tr></thead>
  <tbody id="case-rows"></tbody></table>
  <p class="empty" id="case-empty" hidden>No submissions from this browser yet. Search by ID to open any case.</p>
</section>
</div>'''),
    'case': ('Case status', True, f'''<div class="stack">
<section class="card" id="case-card" hidden>
  <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start">
    <div><h1>Case <span id="case-submission-id"></span></h1>
    <p class="lede"><span id="case-type"></span> &middot; payer case number <span id="case-number"></span></p></div>
    <span class="pill big-status" id="case-status"></span>
  </div>
  {facts([('case-member', 'Member'), ('case-member-id', 'Member ID'), ('case-service', 'Service'),
          ('case-submitted-at', 'Submitted'), ('case-clock', 'Payer response clock'), ('case-checked-at', 'Status checked')])}
</section>
<section class="card" id="case-rfi" hidden>
  <h2>Information requested</h2>
  {facts([('case-payer-question', 'Payer question'), ('case-info-due', 'Response due'), ('case-info-date', 'Requested on')])}
  <div class="actions"><a class="button secondary" id="case-rfi-letter-link" href="#" download>Download request letter</a></div>
</section>
<section class="card" id="case-determination" hidden>
  <h2>Determination</h2>
  {facts([('det-decision', 'Decision'), ('det-date', 'Decision date'), ('det-auth-number', 'Authorization number'),
          ('det-reference', 'Payer reference'), ('det-service', 'Service'), ('det-site-of-care', 'Site of care'),
          ('det-valid-from', 'Valid from'), ('det-valid-to', 'Valid to'), ('det-reason-category', 'Denial reason category'),
          ('det-reason', 'Reason'), ('det-policy', 'Policy'), ('det-appeal-deadline', 'Appeal deadline'),
          ('det-peer-to-peer', 'Peer-to-peer'), ('det-reviewer', 'Reviewer'), ('det-letter-name', 'Letter')])}
  <div class="actions"><a class="button" id="det-letter-link" href="#" download>Download determination letter</a>
  <a class="button secondary" id="det-appeal-link" href="appeal.html">Start appeal</a></div>
</section>
<section class="card" id="case-history-card" hidden>
  <h2>Status history</h2>
  <table class="list"><thead><tr><th>When</th><th>Status</th><th>Note</th></tr></thead><tbody id="case-history"></tbody></table>
</section>
<section class="card" id="case-not-found" hidden>
  <h1>No case found</h1>
  <p>No case matches <strong id="case-not-found-id"></strong>. Check the submission ID and try again.</p>
  <a class="button secondary" href="cases.html" id="case-back">Back to cases</a>
</section>
</div>'''),
    'letters': ('Letters inbox', True, f'''<div class="stack">
<section class="card">
  <h1>Letters inbox</h1>
  <p class="lede">Determination and information-request letters for your submissions.</p>
  <form id="letters-search-form">
    <div class="grid2">{field('letters-search-id', 'Show letters for a submission ID', 'LKS-MPA-...')}</div>
    <div class="actions"><button type="submit" id="letters-search-submit">Find letters</button></div>
    <div class="alert error" id="letters-search-error" role="alert" hidden></div>
  </form>
</section>
<section class="card">
  <table class="list"><thead><tr><th>Posted</th><th>Letter</th><th>Case</th><th>Member</th><th></th></tr></thead>
  <tbody id="letters-rows"></tbody></table>
  <p class="empty" id="letters-empty" hidden>No letters yet for submissions from this browser.</p>
</section>
</div>'''),
    'appeal': ('Appeals', True, f'''<div class="stack">
<section class="card">
  <h1>Submit an appeal</h1>
  <p class="lede">First-level provider appeal of a denied prior authorization.</p>
  <form id="appeal-find-form">
    <div class="grid2">{field('appeal-reference', 'Payer case number or submission ID', 'LKS-UM-26-00000')}</div>
    <div class="actions"><button type="submit" id="appeal-find">Find denied case</button></div>
    <div class="alert error" id="appeal-error" role="alert" hidden></div>
  </form>
  <div id="appeal-details" hidden>
    <div class="alert info" id="appeal-case-summary"></div>
    {area('appeal-letter', 'Appeal letter', 12)}
    {area('appeal-p2p', 'Peer-to-peer preparation (optional)', 6)}
    <div class="actions"><button type="button" id="appeal-submit">Submit appeal</button></div>
    <div class="alert error" id="appeal-submit-error" role="alert" hidden></div>
  </div>
</section>
</div>'''),
    'appeal-submitted': ('Appeal submitted', True, f'''<div class="stack">
<section class="card">
  <div class="alert ok">Appeal submitted. Track it on the case page with the appeal ID.</div>
  <div style="height:1rem"></div>
  {facts([('appeal-submission-id', 'Appeal ID'), ('appeal-status', 'Status'), ('appeal-submitted-at', 'Submitted (UTC)'),
          ('appeal-case-number', 'Original case'), ('appeal-member', 'Member')])}
  <div class="actions"><a class="button" id="appeal-view-case" href="cases.html">View appeal status</a></div>
</section>
</div>'''),
    'reset': ('Reset', False, reset('the Lakeshore provider portal')),
}

# ---------------------------------------------------------------- RxAccess
RX_STEPS = ['Drug and patient', 'Questions', 'Attachments', 'Submitted']
RXACCESS = {
    'index': ('Sign in', False, login('rxaccess', 'RxAccess sign in',
              'Electronic prior authorization for pharmacy-benefit drugs, across plans and PBMs.')),
    'new': ('New request', True, f'''<div class="stack">
<section class="card">
  {steps(RX_STEPS, 1)}
  <h1>New ePA request</h1>
  <form id="rx-drug-form">
    <div class="grid2">{field('rx-drug-query', 'Drug', 'Search by drug name')}</div>
    <div class="actions"><button type="submit" id="rx-drug-search">Search drugs</button></div>
  </form>
  <div class="drug-results" id="rx-drug-results"></div>
  <div class="alert warn" id="rx-drug-note" hidden></div>
</section>
<section class="card">
  <h2>Patient</h2>
  <div class="grid2">
    {field('rx-patient-first', 'First name')}{field('rx-patient-last', 'Last name')}
    {field('rx-patient-dob', 'Date of birth', 'MM/DD/YYYY')}{field('rx-member-id', 'Member ID')}
  </div>
</section>
<section class="card">
  <h2>Prescriber</h2>
  <div class="grid2">{field('rx-prescriber-name', 'Prescriber name')}{field('rx-prescriber-npi', 'Prescriber NPI', '10 digits')}</div>
</section>
<section class="card">
  <h2>Pharmacy benefit</h2>
  <div class="grid3">{field('rx-bin', 'BIN')}{field('rx-pcn', 'PCN')}{field('rx-group', 'Rx group')}</div>
  <div class="actions"><button type="button" id="rx-continue">Continue to questions</button></div>
  <div class="alert error" id="rx-new-error" role="alert" hidden></div>
</section>
</div>'''),
    'questions': ('Question set', True, f'''<div class="stack">
<section class="card">
  {steps(RX_STEPS, 2)}
  <h1>Question set</h1>
  <p class="lede" id="q-set-title"></p>
  <div class="alert info" id="q-request-summary"></div>
  <div style="height:1rem"></div>
  <div class="grid2">
    {field('q-diagnosis', '1. Diagnosis (ICD-10)', 'K00.000')}
    {select('q-severity', '2. Is the disease moderate to severe?', YES_NO + [('See attached letter', 'See attached letter of medical necessity')])}
    {field('q-specialty', '3. Prescriber specialty')}
    {select('q-urgency', '6. Standard or expedited review', [('Standard', 'Standard'), ('Expedited', 'Expedited')])}
  </div>
  {area('q-conventional', '4. Conventional therapy tried, and outcome', 4)}
  <h2 style="margin-top:1.1rem">5. Preferred biologic tried</h2>
  <div class="grid3">{field('q-biologic-name', 'Name')}{field('q-biologic-dates', 'Dates')}{field('q-biologic-outcome', 'Outcome')}</div>
  <div class="actions"><a class="button secondary" href="new.html" id="q-back">Back</a>
    <button type="button" id="q-continue">Continue to attachments</button></div>
  <div class="alert error" id="q-error" role="alert" hidden></div>
</section>
</div>'''),
    'attachments': ('Attachments', True, f'''<div class="stack">
<section class="card">
  {steps(RX_STEPS, 3)}
  <h1>Attachments</h1>
  <div class="alert info" id="rx-attach-summary"></div>
  {area('rx-letter', 'Letter of medical necessity', 12)}
  {area('rx-attachment-list', 'Clinical documents attached', 4, 'One document per line')}
  <div class="field" style="margin-top:.9rem"><label for="rx-file">Upload files (optional)</label>
    <input type="file" id="rx-file" multiple><span class="hint" id="rx-file-list"></span></div>
  <div class="actions"><a class="button secondary" href="questions.html" id="rx-attach-back">Back</a>
    <button type="button" id="rx-submit">Submit request</button></div>
  <div class="alert error" id="rx-attach-error" role="alert" hidden></div>
</section>
</div>'''),
    'submitted': ('Request submitted', True, f'''<div class="stack">
<section class="card">
  {steps(RX_STEPS, 4)}
  <div class="alert ok">Request sent to the plan. Use the request ID to check status.</div>
  <div style="height:1rem"></div>
  {facts([('rx-submission-id', 'Request ID'), ('rx-submission-status', 'Status'), ('rx-submitted-at', 'Submitted (UTC)'),
          ('rx-submitted-at-local', 'Submitted (local)'), ('rx-submission-drug', 'Drug'), ('rx-submission-patient', 'Patient'),
          ('rx-submission-plan', 'Plan / PBM'), ('rx-submission-urgency', 'Urgency'), ('rx-submission-due', 'Response due by')])}
  <div class="actions"><a class="button" id="rx-view-request" href="requests.html">View request</a>
  <a class="button secondary" id="rx-new-request" href="new.html">New request</a></div>
</section>
</div>'''),
    'requests': ('Requests', True, f'''<div class="stack">
<section class="card">
  <h1>Requests</h1>
  <form id="rx-find-form">
    <div class="grid2">{field('rx-find-id', 'Find by request ID', 'RXA-...')}</div>
    <div class="actions"><button type="submit" id="rx-find-submit">Open request</button></div>
    <div class="alert error" id="rx-find-error" role="alert" hidden></div>
  </form>
</section>
<section class="card">
  <h2>Open and recent requests</h2>
  <table class="list"><thead><tr><th>Request ID</th><th>Patient</th><th>Drug</th><th>Plan</th><th>Submitted</th><th>Clock</th><th>Status</th></tr></thead>
  <tbody id="rx-request-rows"></tbody></table>
</section>
</div>'''),
    'request': ('Request status', True, f'''<div class="stack">
<section class="card" id="rx-req-card" hidden>
  <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start">
    <div><h1>Request <span id="rx-req-id"></span></h1><p class="lede" id="rx-req-type"></p></div>
    <span class="pill big-status" id="rx-req-status"></span>
  </div>
  <div class="alert warn" id="rx-req-clock-alert" hidden></div>
  {facts([('rx-req-patient', 'Patient'), ('rx-req-member-id', 'Member ID'), ('rx-req-plan', 'Plan / PBM'),
          ('rx-req-drug', 'Drug'), ('rx-req-submitted-at', 'Submitted'), ('rx-req-clock', 'Plan response clock'),
          ('rx-req-checked-at', 'Status checked')])}
</section>
<section class="card" id="rx-determination" hidden>
  <h2>Determination</h2>
  {facts([('rx-det-decision', 'Decision'), ('rx-det-date', 'Decision date'), ('rx-det-auth-number', 'Authorization number'),
          ('rx-det-drug', 'Drug'), ('rx-det-quantity', 'Quantity'), ('rx-det-valid-from', 'Valid from'),
          ('rx-det-valid-to', 'Valid to'), ('rx-det-dispense', 'Dispensing requirement'), ('rx-det-reason', 'Reason'),
          ('rx-det-letter-name', 'Letter')])}
  <div class="actions"><a class="button" id="rx-letter-link" href="#" download>Download determination letter</a>
  <a class="button secondary" id="rx-det-appeal-link" href="appeal.html">Start appeal</a></div>
</section>
<section class="card" id="rx-history-card" hidden>
  <h2>Status history</h2>
  <table class="list"><thead><tr><th>When</th><th>Status</th><th>Note</th></tr></thead><tbody id="rx-req-history"></tbody></table>
</section>
<section class="card" id="rx-req-not-found" hidden>
  <h1>No request found</h1>
  <p>No request matches <strong id="rx-req-not-found-id"></strong>.</p>
  <a class="button secondary" href="requests.html" id="rx-req-back">Back to requests</a>
</section>
</div>'''),
    'appeal': ('Appeals', True, f'''<div class="stack">
<section class="card">
  <h1>Submit a pharmacy appeal</h1>
  <p class="lede">Appeal or redetermination request for a pharmacy-benefit prior authorization.</p>
  <form id="rx-appeal-find-form">
    <div class="grid2">{field('rx-appeal-reference', 'Request ID or plan reference number', 'RXA-... or LKS-PA-26-...')}</div>
    <div class="actions"><button type="submit" id="rx-appeal-find">Find request</button></div>
    <div class="alert error" id="rx-appeal-error" role="alert" hidden></div>
  </form>
  <div id="rx-appeal-details" hidden>
    <div class="alert info" id="rx-appeal-summary"></div>
    {area('rx-appeal-letter', 'Appeal letter', 12)}
    {area('rx-appeal-p2p', 'Peer-to-peer preparation (optional)', 6)}
    <div class="actions"><button type="button" id="rx-appeal-submit">Submit appeal</button></div>
    <div class="alert error" id="rx-appeal-submit-error" role="alert" hidden></div>
  </div>
</section>
</div>'''),
    'appeal-submitted': ('Appeal submitted', True, f'''<div class="stack">
<section class="card">
  <div class="alert ok">Appeal sent to the plan.</div>
  <div style="height:1rem"></div>
  {facts([('rx-appeal-submission-id', 'Appeal ID'), ('rx-appeal-status', 'Status'), ('rx-appeal-submitted-at', 'Submitted (UTC)'),
          ('rx-appeal-ref', 'Appealed request'), ('rx-appeal-member', 'Patient')])}
  <div class="actions"><a class="button" id="rx-appeal-view" href="requests.html">View appeal status</a></div>
</section>
</div>'''),
    'reset': ('Reset', False, reset('RxAccess')),
}

# ---------------------------------------------------------------- Patient Savings
VSP_STEPS = ['Program', 'Eligibility', 'Enrollment', 'Confirmation']
SAVINGS = {
    'index': ('Sign in', False, login('savings', 'Provider enrollment sign in',
              'Enroll eligible patients in the Vedolizumab Patient Savings Program.')),
    'program': ('Choose a program', True, f'''<div class="stack">
<section class="card">
  {steps(VSP_STEPS, 1)}
  <h1>Enroll a patient</h1>
  <p class="lede">Choose the program the patient has consented to.</p>
  <div class="stack" style="gap:.6rem">
    <label class="check card" for="program-vsp"><input type="radio" name="program" id="program-vsp" value="vsp">
      <span><strong>Vedolizumab Patient Savings Program</strong><br>Commercially insured patients pay $5 per pen fill or infusion;
      the program pays the rest up to $20,000 a year (synthetic figures). <a href="Vedolizumab_Patient_Savings_Program_Terms.pdf" id="program-vsp-terms">Program terms</a></span></label>
    <label class="check card" for="program-hpaf"><input type="radio" name="program" id="program-hpaf" value="hpaf">
      <span><strong>Harbor Patient Aid Foundation</strong> (independent charity)<br>Referral information for patients with federal or
      state program coverage, including Medicare. Applications go to the foundation directly.</span></label>
  </div>
  <div class="actions"><button type="button" id="program-continue">Continue</button></div>
  <div class="alert error" id="program-error" role="alert" hidden></div>
</section>
</div>'''),
    'eligibility': ('Eligibility questions', True, f'''<div class="stack">
<section class="card">
  {steps(VSP_STEPS, 2)}
  <h1>Eligibility questions</h1>
  <p class="lede">Vedolizumab Patient Savings Program</p>
  <div class="grid2">
    {select('elig-resident', 'Is the patient a US resident?', YES_NO)}
    {select('elig-prescribed', 'Has the patient been prescribed vedolizumab?', YES_NO)}
    {select('elig-commercial', 'Does the patient have commercial (employer or private) insurance?', YES_NO)}
    {select('elig-government', 'Does the patient have Medicare, Medicaid, TRICARE, VA or any other federal or state health program coverage, even alongside commercial insurance?', YES_NO)}
  </div>
  <div class="actions"><a class="button secondary" href="program.html" id="elig-back">Back</a>
    <button type="button" id="elig-continue">Continue</button></div>
  <div class="alert error" id="elig-error" role="alert" hidden></div>
</section>
</div>'''),
    'enroll': ('Enrollment form', True, f'''<div class="stack">
<section class="card">
  {steps(VSP_STEPS, 3)}
  <h1>Enrollment form</h1>
  <h2>Patient</h2>
  <div class="grid3">
    {field('enroll-first', 'First name')}{field('enroll-last', 'Last name')}{field('enroll-dob', 'Date of birth', 'MM/DD/YYYY')}
    {field('enroll-address', 'Street address')}{field('enroll-city', 'City')}{field('enroll-state', 'State')}
    {field('enroll-zip', 'ZIP')}{field('enroll-phone', 'Phone')}
  </div>
  <h2 style="margin-top:1.1rem">Insurance and prescriber</h2>
  <div class="grid3">
    {field('enroll-member-id', 'Member ID')}{field('enroll-bin', 'Rx BIN')}{field('enroll-pcn', 'Rx PCN')}
    {field('enroll-group', 'Rx group')}{field('enroll-npi', 'Prescriber NPI')}
  </div>
  <h2 style="margin-top:1.1rem">Consent</h2>
  <label class="check" for="enroll-consent"><input type="checkbox" id="enroll-consent">
    <span>The patient consents to enroll and to share the information above with the program administrator.</span></label>
  <div class="grid3" style="margin-top:.6rem">{field('enroll-consent-date', 'Consent date', 'MM/DD/YYYY')}</div>
  <div class="actions"><a class="button secondary" href="eligibility.html" id="enroll-back">Back</a>
    <button type="button" id="enroll-submit">Submit enrollment</button></div>
  <div class="alert error" id="enroll-error" role="alert" hidden></div>
</section>
</div>'''),
    'confirmation': ('Enrollment confirmed', True, f'''<div class="stack">
<section class="card">
  {steps(VSP_STEPS, 4)}
  <div class="alert ok" id="conf-banner">Enrollment complete.</div>
  <div style="height:1rem"></div>
  {facts([('conf-enrollment-id', 'Enrollment ID'), ('conf-status', 'Status'), ('conf-patient', 'Patient'),
          ('conf-member-id', 'Member ID'), ('conf-effective', 'Effective'), ('conf-benefit', 'Benefit'),
          ('conf-program-ids', 'Program BIN / PCN / group'), ('conf-administrator', 'Administrator')])}
  <div class="actions"><a class="button" href="program.html" id="conf-new">Enroll another patient</a></div>
</section>
</div>'''),
    'not-eligible': ('Not eligible', True, f'''<div class="stack">
<section class="card">
  <h1>Enrollment result</h1>
  <p class="alert error"><strong id="ne-status"></strong></p>
  <p id="ne-detail"></p>
  <div class="actions"><a class="button" href="foundation.html" id="ne-foundation-link">Harbor Patient Aid Foundation</a>
  <a class="button secondary" href="program.html" id="ne-back">Back to programs</a></div>
</section>
</div>'''),
    'foundation': ('Foundation referral', True, '''<div class="stack">
<section class="card">
  <h1>Harbor Patient Aid Foundation</h1>
  <p class="lede">An independent charity. The manufacturer program cannot enroll patients with federal or state program coverage.</p>
  <dl class="facts">
    <dt>Eligible</dt><dd id="hpaf-eligible">Insured patients with an IBD, psoriasis or atopic dermatitis diagnosis, household income at or below 500% of the federal poverty level, any insurance type including Medicare</dd>
    <dt>Grant</dt><dd id="hpaf-grant">Up to $10,000 a year toward out-of-pocket costs (synthetic)</dd>
    <dt>Phone</dt><dd id="hpaf-phone">(888) 555-0149</dd>
  </dl>
  <div class="actions"><a class="button" href="Harbor_Patient_Aid_Foundation_Grant_Terms.pdf" id="hpaf-terms">Grant terms (PDF)</a>
  <a class="button secondary" href="program.html" id="hpaf-back">Back to programs</a></div>
</section>
</div>'''),
    'reset': ('Reset', False, reset('the Patient Savings enrollment site')),
}


def shell(site, page, title, auth, body):
    s = SITES[site]
    nav = ''
    user = ''
    if auth:
        current = ' aria-current="page"'
        nav = '<nav class="mainnav" id="mainnav">' + ''.join(
            f'<a href="{p}.html" id="nav-{p}"{current if p == page else ""}>{t}</a>'
            for p, t in s['nav']) + '</nav>'
        user = ('<div class="userbox"><span>Signed in as <strong id="nav-user"></strong></span>'
                '<a href="index.html" id="nav-logout">Sign out</a></div>')
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title} | {s['name']}</title>
<link rel="stylesheet" href="../assets/portal.css">
</head>
<body class="site-{site}" data-site="{site}" data-page="{page}" data-auth="{'required' if auth else 'none'}">
<header class="topbar"><div class="inner">
  <a class="brand" id="brand" href="{s['home'] if auth else 'index.html'}"><span class="mark">{s['mark']}</span><span>{s['name']}<small>{s['tagline']}</small></span></a>
  {nav}
  {user}
</div></header>
<div class="loading" id="loading" hidden>Loading&hellip;</div>
<main id="main">
{body}
</main>
{FOOTER}
<script src="../assets/sma.js"></script>
<script src="{site}.js"></script>
</body>
</html>
'''


HUB = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>SMA mock portals</title>
<link rel="stylesheet" href="assets/portal.css">
</head>
<body class="site-hub">
<header class="topbar"><div class="inner"><span class="brand"><span class="mark">SMA</span><span>Specialty Medication Access<small>Mock payer and program sites</small></span></span></div></header>
<main id="main">
<div class="stack">
<section class="card">
  <h1>Mock sites for the Specialty Medication Access demo</h1>
  <p class="lede">Three small static sites that UiPath robots work in the demo. Outcomes are scripted by member ID and
  submission ID; nothing is stored on a server, so a new submission restarts its scripted path. Sign-ins live in
  Orchestrator credential assets.</p>
  <table class="list"><thead><tr><th>Site</th><th>Used for</th><th>Reset</th></tr></thead><tbody>
    <tr><td><a href="lakeshore/" id="hub-lakeshore">Lakeshore Health Plan provider portal</a></td><td>Eligibility, medical PA, letters, appeals</td><td><a href="lakeshore/reset.html" id="hub-lakeshore-reset">Reset</a></td></tr>
    <tr><td><a href="rxaccess/" id="hub-rxaccess">RxAccess ePA portal</a></td><td>Pharmacy PA question set and determinations</td><td><a href="rxaccess/reset.html" id="hub-rxaccess-reset">Reset</a></td></tr>
    <tr><td><a href="savings/" id="hub-savings">Patient Savings enrollment site</a></td><td>Copay program enrollment</td><td><a href="savings/reset.html" id="hub-savings-reset">Reset</a></td></tr>
  </tbody></table>
</section>
<section class="card">
  <h2>Scripted outcomes</h2>
  <ul>
    <li>Member LKS884210377 (hero): medical PA Pending, then Denied with the denial letter; appeal Pending, then approved with the appeal letter; pen ePA Pending, then Approved with the approval letter.</li>
    <li>A new submission shows Pending for {{PENDING}} minutes, then its scripted outcome.</li>
    <li>Member LKS000000000: coverage terminated 06/30/2026.</li>
    <li>Medicare or Medicaid members on the savings site: not eligible, with a foundation referral.</li>
    <li>Filler case F3 (Prairie State Medicaid) stays Pending on RxAccess past 80% of its 24-hour clock.</li>
  </ul>
</section>
</div>
</main>
{FOOTER}
</body>
</html>
'''


def main():
    for site, pages in (('lakeshore', LAKESHORE), ('rxaccess', RXACCESS), ('savings', SAVINGS)):
        for page, (title, auth, body) in pages.items():
            (ROOT / site / f'{page}.html').write_text(shell(site, page, title, auth, body), encoding='utf-8')
    (ROOT / 'index.html').write_text(HUB.replace('{PENDING}', '3'), encoding='utf-8')
    (ROOT / '.nojekyll').write_text('', encoding='utf-8')


if __name__ == '__main__':
    main()
