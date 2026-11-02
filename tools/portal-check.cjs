/*
 * End-to-end check of the scripted paths on the three mock portals.
 *   NODE_PATH=<dir with playwright> BASE=http://127.0.0.1:8765 node tools/portal-check.cjs
 * Logins come from DEMO-LOGINS.local.md (never committed) or the SMA_LOGINS env var (JSON).
 * Time travel: outcomes follow from the submission ID alone, so a check re-stamps an ID a few
 * minutes earlier instead of waiting.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.BASE || 'http://127.0.0.1:8765').replace(/\/$/, '');
const results = [];

function logins() {
  if (process.env.SMA_LOGINS) return JSON.parse(process.env.SMA_LOGINS);
  const md = fs.readFileSync(path.join(__dirname, '..', 'DEMO-LOGINS.local.md'), 'utf8');
  const out = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^\| (lakeshore|rxaccess|savings) \| [^|]+ \| ([^|]+) \| ([^|]+) \|$/);
    if (m) out[m[1]] = { user: m[2].trim(), pass: m[3].trim() };
  }
  return out;
}
const CREDS = logins();

function shiftId(id, minutes) {
  const m = id.match(/^(.*?)(\d{6})-(\d{6})-(\d{4}[ER]*)$/);
  const d = new Date(Date.UTC(2000 + +m[2].slice(0, 2), +m[2].slice(2, 4) - 1, +m[2].slice(4, 6),
    +m[3].slice(0, 2), +m[3].slice(2, 4), +m[3].slice(4, 6)) - minutes * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${m[1]}${p(d.getUTCFullYear() % 100)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}-${m[4]}`;
}

async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log('FAIL', name, '-', e.message.split('\n')[0]); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }
const text = (page, id) => page.locator('#' + id).innerText();

async function login(page, site) {
  await page.goto(`${BASE}/${site}/index.html`);
  await page.fill('#login-username', CREDS[site].user);
  await page.fill('#login-password', CREDS[site].pass);
  await page.click('#login-submit');
  await page.waitForURL((u) => !u.pathname.endsWith('/index.html'));
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  // ---------------- Lakeshore
  await check('lakeshore: wrong password is refused', async () => {
    await page.goto(`${BASE}/lakeshore/index.html`);
    await page.fill('#login-username', CREDS.lakeshore.user);
    await page.fill('#login-password', 'not-the-password');
    await page.click('#login-submit');
    await page.locator('#login-error').waitFor({ state: 'visible' });
  });
  await check('lakeshore: protected page redirects to sign-in', async () => {
    await page.goto(`${BASE}/lakeshore/cases.html`);
    await page.waitForURL(/index\.html\?next=cases\.html/);
  });
  await check('lakeshore: sign in', async () => { await login(page, 'lakeshore'); expect(page.url().includes('search.html'), page.url()); });

  await check('lakeshore: hero eligibility is active commercial with both benefits', async () => {
    await page.goto(`${BASE}/lakeshore/search.html`);
    await page.fill('#search-member-id', 'LKS884210377');
    await page.fill('#search-dob', '04/12/1991');
    await page.click('#search-submit');
    await page.locator('#elig-card').waitFor({ state: 'visible' });
    expect((await text(page, 'elig-status')) === 'Active', 'status');
    expect((await text(page, 'elig-coverage-type')) === 'Commercial', 'coverage type');
    expect((await text(page, 'elig-status-detail')) === 'Coverage active since 08/01/2026', 'detail');
    expect((await text(page, 'elig-medical-benefit')).startsWith('Active'), 'medical');
    expect((await text(page, 'elig-pharmacy-benefit')).startsWith('Active'), 'pharmacy');
    expect((await text(page, 'elig-rx-bin')) === '999901' && (await text(page, 'elig-rx-pcn')) === 'LKSRX' && (await text(page, 'elig-rx-group')) === 'HCPS01', 'rx ids');
    expect((await text(page, 'elig-group')) === '70412-HCPS', 'group');
    expect(/^ELG-\d{6}-\d{6}-0377$/.test(await text(page, 'elig-reference')), 'reference');
  });
  await check('lakeshore: LKS000000000 coverage terminated 06/30/2026', async () => {
    await page.goto(`${BASE}/lakeshore/search.html`);
    await page.fill('#search-member-id', 'LKS000000000');
    await page.fill('#search-dob', '02/17/1983');
    await page.click('#search-submit');
    await page.locator('#elig-card').waitFor({ state: 'visible' });
    expect((await text(page, 'elig-status')) === 'Terminated', 'status');
    expect((await text(page, 'elig-status-detail')) === 'Coverage terminated 06/30/2026', 'detail');
    expect(!(await page.locator('#elig-start-pa').isVisible()), 'start PA hidden');
  });
  await check('lakeshore: unknown member shows a search error', async () => {
    await page.goto(`${BASE}/lakeshore/search.html`);
    await page.fill('#search-member-id', 'SLV220451883');
    await page.fill('#search-dob', '01/22/1952');
    await page.click('#search-submit');
    await page.locator('#search-error').waitFor({ state: 'visible' });
  });

  async function submitMedical(member, scenario) {
    await page.goto(`${BASE}/lakeshore/pa-new.html`);
    await page.fill('#pa-member-id', member);
    await page.fill('#pa-prescriber-npi', '1548390272');
    await page.fill('#pa-hcpcs', 'J3380');
    await page.fill('#pa-drug', 'vedolizumab');
    await page.fill('#pa-dose', '300 mg');
    await page.fill('#pa-doses', '2');
    await page.fill('#pa-site-of-care', 'Riverbend Health Infusion Center');
    await page.fill('#pa-icd10', 'K51.011');
    await page.selectOption('#pa-urgency', 'Standard');
    if (scenario) { await page.click('#pa-demo-controls summary'); await page.selectOption('#pa-demo-scenario', scenario); }
    await page.click('#pa-continue');
  }

  let heroId = '';
  await check('lakeshore: hero medical PA submits and returns a submission ID', async () => {
    await submitMedical('LKS884210377');
    await page.waitForURL(/pa-attach\.html/);
    await page.fill('#pa-letter', 'Letter of medical necessity (synthetic test).');
    await page.fill('#pa-attachment-list', 'Clinic note 09/10/2024 (packet p. 11)');
    await page.click('#pa-submit');
    await page.waitForURL(/pa-submitted\.html/);
    heroId = await text(page, 'submission-id');
    expect(/^LKS-MPA-\d{6}-\d{6}-0377$/.test(heroId), heroId);
    expect((await text(page, 'submission-status')) === 'Received', 'received');
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(await text(page, 'submitted-at')), 'iso time');
    expect((await text(page, 'submission-case-number')) === 'LKS-UM-26-55017', 'case number');
  });
  await check('lakeshore: status call 1 is Pending', async () => {
    await page.goto(`${BASE}/lakeshore/cases.html`);
    await page.fill('#case-search-id', heroId);
    await page.click('#case-search-submit');
    await page.locator('#case-card').waitFor({ state: 'visible' });
    expect((await text(page, 'case-status')) === 'Pending', await text(page, 'case-status'));
    expect(!(await page.locator('#case-determination').isVisible()), 'no determination yet');
  });
  await check('lakeshore: after the pending window the hero PA is Denied with the denial letter', async () => {
    await page.goto(`${BASE}/lakeshore/case.html?id=${shiftId(heroId, 4)}`);
    expect((await text(page, 'case-status')) === 'Denied', 'denied');
    expect((await text(page, 'det-reason')).includes('The medication history provided lists no prior biologic therapy.'), 'reason');
    expect((await text(page, 'det-reason-category')) === 'Step therapy', 'category');
    expect((await text(page, 'det-appeal-deadline')).startsWith('04/07/2027'), 'deadline');
    const href = await page.locator('#det-letter-link').getAttribute('href');
    expect(href.endsWith('Lakeshore_Letter_2026-10-09_IV_Denial_LKS-UM-26-55017.pdf'), href);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#det-letter-link')]);
    expect(dl.suggestedFilename() === 'Lakeshore_Letter_2026-10-09_IV_Denial_LKS-UM-26-55017.pdf', dl.suggestedFilename());
  });
  await check('lakeshore: information-request scenario walks Pending, Information requested, Denied', async () => {
    await submitMedical('LKS884210377', 'rfi');
    await page.waitForURL(/pa-attach\.html/);
    await page.fill('#pa-letter', 'Letter (synthetic test).');
    await page.click('#pa-submit');
    await page.waitForURL(/pa-submitted\.html/);
    const id = await text(page, 'submission-id');
    expect(id.endsWith('R'), id);
    await page.goto(`${BASE}/lakeshore/case.html?id=${shiftId(id, 4)}`);
    expect((await text(page, 'case-status')) === 'Information requested', 'rfi');
    expect((await text(page, 'case-payer-question')) === 'Please provide a colonoscopy or Mayo score dated within 90 days.', 'question');
    expect((await text(page, 'case-info-due')) === '10/13/2026', 'due');
    await page.goto(`${BASE}/lakeshore/case.html?id=${shiftId(id, 7)}`);
    expect((await text(page, 'case-status')) === 'Denied', 'denied after rfi');
  });
  await check('lakeshore: letters inbox lists the denial letter', async () => {
    await page.goto(`${BASE}/lakeshore/letters.html?id=${shiftId(heroId, 4)}`);
    const href = await page.locator('#letter-link-1').getAttribute('href');
    expect(href.includes('IV_Denial'), href);
  });
  let appealId = '';
  await check('lakeshore: hero appeal on LKS-UM-26-55017 submits', async () => {
    await page.goto(`${BASE}/lakeshore/appeal.html`);
    await page.fill('#appeal-reference', 'LKS-UM-26-55017');
    await page.click('#appeal-find');
    await page.locator('#appeal-details').waitFor({ state: 'visible' });
    await page.fill('#appeal-letter', 'Appeal letter citing packet page 11 (synthetic test).');
    await page.fill('#appeal-p2p', 'Peer-to-peer preparation (synthetic test).');
    await page.click('#appeal-submit');
    await page.waitForURL(/appeal-submitted\.html/);
    appealId = await text(page, 'appeal-submission-id');
    expect(/^LKS-APL-\d{6}-\d{6}-0377$/.test(appealId), appealId);
  });
  await check('lakeshore: appeal is Pending, then Appeal approved with the appeal letter', async () => {
    await page.goto(`${BASE}/lakeshore/case.html?id=${appealId}`);
    expect((await text(page, 'case-status')) === 'Pending', 'pending');
    await page.goto(`${BASE}/lakeshore/case.html?id=${shiftId(appealId, 4)}`);
    expect((await text(page, 'case-status')) === 'Appeal approved', 'approved');
    expect((await text(page, 'det-auth-number')) === 'LKS-PA-26-118377', 'auth');
    expect((await page.locator('#det-letter-link').getAttribute('href')).endsWith('Appeal_Approval_LKS-PA-26-118377.pdf'), 'letter');
  });
  await check('lakeshore: appeal of a non-denied reference is refused', async () => {
    await page.goto(`${BASE}/lakeshore/appeal.html`);
    await page.fill('#appeal-reference', heroId);
    await page.click('#appeal-find');
    await page.locator('#appeal-error').waitFor({ state: 'visible' });
  });
  await check('lakeshore: PA for the terminated member is refused', async () => {
    await submitMedical('LKS000000000');
    await page.locator('#pa-error').waitFor({ state: 'visible' });
    expect((await text(page, 'pa-error')).includes('Coverage terminated 06/30/2026'), 'message');
  });
  await check('lakeshore: moved layout keeps element ids working', async () => {
    await page.goto(`${BASE}/lakeshore/search.html?variant=moved`);
    await page.locator('#maintenance-banner').waitFor({ state: 'visible' });
    await page.fill('#search-member-id', 'LKS884210377');
    await page.fill('#search-dob', '04/12/1991');
    await page.click('#search-submit');
    expect((await text(page, 'elig-status')) === 'Active', 'still works');
    await page.goto(`${BASE}/lakeshore/search.html?variant=standard`);
  });
  await check('lakeshore: slow portal shows content after the latency', async () => {
    await page.goto(`${BASE}/lakeshore/search.html?latency=2`);
    expect(await page.locator('#loading').isVisible(), 'loading visible');
    await page.locator('#search-member-id').waitFor({ state: 'visible', timeout: 5000 });
    await page.goto(`${BASE}/lakeshore/search.html?latency=0`);
  });
  await check('lakeshore: reset clears the sign-in', async () => {
    await page.goto(`${BASE}/lakeshore/reset.html`);
    expect((await text(page, 'reset-status')).startsWith('Reset complete'), 'reset');
    await page.goto(`${BASE}/lakeshore/search.html`);
    await page.waitForURL(/index\.html/);
  });

  // ---------------- RxAccess
  await check('rxaccess: sign in', async () => { await login(page, 'rxaccess'); });
  async function fillRxNew(query, pick) {
    await page.goto(`${BASE}/rxaccess/new.html`);
    await page.fill('#rx-drug-query', query);
    await page.click('#rx-drug-search');
    await page.click('#' + pick);
    await page.fill('#rx-patient-first', 'Dana');
    await page.fill('#rx-patient-last', 'Reyes');
    await page.fill('#rx-patient-dob', '04/12/1991');
    await page.fill('#rx-member-id', 'LKS884210377');
    await page.fill('#rx-prescriber-name', 'Morgan Patel, MD');
    await page.fill('#rx-prescriber-npi', '1548390272');
    await page.fill('#rx-bin', '999901');
    await page.fill('#rx-pcn', 'LKSRX');
    await page.fill('#rx-group', 'HCPS01');
    await page.click('#rx-continue');
  }
  await check('rxaccess: drug search ranks the pen first and refuses the IV vial', async () => {
    await page.goto(`${BASE}/rxaccess/new.html`);
    await page.fill('#rx-drug-query', 'vedolizumab');
    await page.click('#rx-drug-search');
    expect((await page.locator('#rx-drug-result-1').getAttribute('data-code')) === 'vedolizumab-pen', 'pen first');
    await fillRxNew('vedolizumab', 'rx-drug-result-2');
    await page.locator('#rx-new-error').waitFor({ state: 'visible' });
    expect((await text(page, 'rx-new-error')).includes('medical benefit'), 'medical message');
  });
  let penId = '';
  await check('rxaccess: hero pen request submits through the question set', async () => {
    await fillRxNew('vedolizumab SC pen 108 mg', 'rx-drug-result-1');
    await page.waitForURL(/questions\.html/);
    expect((await text(page, 'q-set-title')).includes('LHP-RX-114'), 'question set title');
    await page.fill('#q-diagnosis', 'K51.011');
    await page.selectOption('#q-severity', 'Yes');
    await page.fill('#q-specialty', 'Gastroenterology');
    await page.selectOption('#q-urgency', 'Standard');
    await page.fill('#q-conventional', 'Mesalamine 4.8 g/day since 2021, inadequate response; azathioprine stopped 2022 for intolerance');
    await page.fill('#q-biologic-name', 'infliximab-dyyb (Inflectra)');
    await page.fill('#q-biologic-dates', '03/2023 to 09/2024');
    await page.fill('#q-biologic-outcome', 'Secondary loss of response with antibodies to infliximab');
    await page.click('#q-continue');
    await page.waitForURL(/attachments\.html/);
    await page.fill('#rx-letter', 'Letter (synthetic test).');
    await page.click('#rx-submit');
    await page.waitForURL(/submitted\.html/);
    penId = await text(page, 'rx-submission-id');
    expect(/^RXA-\d{6}-\d{6}-0377$/.test(penId), penId);
  });
  await check('rxaccess: pen is Pending on the first check and Approved on the second', async () => {
    await page.goto(`${BASE}/rxaccess/requests.html`);
    await page.fill('#rx-find-id', penId);
    await page.click('#rx-find-submit');
    await page.locator('#rx-req-card').waitFor({ state: 'visible' });
    expect((await text(page, 'rx-req-status')) === 'Pending', 'pending');
    await page.goto(`${BASE}/rxaccess/request.html?id=${shiftId(penId, 4)}`);
    expect((await text(page, 'rx-req-status')) === 'Approved', 'approved');
    expect((await text(page, 'rx-det-auth-number')) === 'LKS-PA-26-118204', 'auth');
    expect((await text(page, 'rx-det-valid-to')) === '04/08/2027', 'valid to');
    expect((await page.locator('#rx-letter-link').getAttribute('href')).endsWith('Pen_Approval_LKS-PA-26-118204.pdf'), 'letter');
  });
  await check('rxaccess: F3 stays Pending past 80% of its 24-hour clock', async () => {
    await page.goto(`${BASE}/rxaccess/requests.html`);
    await page.click('#rx-request-link-1');
    expect((await text(page, 'rx-req-status')) === 'Pending', 'pending');
    expect((await text(page, 'rx-req-patient')) === 'Keisha Monroe', 'patient');
    await page.locator('#rx-req-clock-alert').waitFor({ state: 'visible' });
    expect(/at (8\d|9\d)% of 24 hours/.test(await text(page, 'rx-req-clock-alert')), await text(page, 'rx-req-clock-alert'));
  });
  await check('rxaccess: pharmacy appeal submits and is approved after the window', async () => {
    await page.goto(`${BASE}/rxaccess/appeal.html`);
    await page.fill('#rx-appeal-reference', penId);
    await page.click('#rx-appeal-find');
    await page.locator('#rx-appeal-details').waitFor({ state: 'visible' });
    await page.fill('#rx-appeal-letter', 'Appeal (synthetic test).');
    await page.click('#rx-appeal-submit');
    await page.waitForURL(/appeal-submitted\.html/);
    const id = await text(page, 'rx-appeal-submission-id');
    expect(/^RXA-APL-\d{6}-\d{6}-0377$/.test(id), id);
    await page.goto(`${BASE}/rxaccess/request.html?id=${shiftId(id, 4)}`);
    expect((await text(page, 'rx-req-status')) === 'Appeal approved', 'approved');
  });

  // ---------------- Patient Savings
  await check('savings: sign in', async () => { await login(page, 'savings'); });
  async function enroll(p, govAnswer) {
    await page.goto(`${BASE}/savings/program.html`);
    await page.check('#program-vsp');
    await page.click('#program-continue');
    await page.selectOption('#elig-resident', 'Yes');
    await page.selectOption('#elig-prescribed', 'Yes');
    await page.selectOption('#elig-commercial', 'Yes');
    await page.selectOption('#elig-government', govAnswer);
    await page.click('#elig-continue');
    if (govAnswer === 'Yes') return;
    await page.waitForURL(/enroll\.html/);
    for (const [id, v] of Object.entries(p)) await page.fill('#' + id, v);
    await page.check('#enroll-consent');
    await page.click('#enroll-submit');
  }
  const hero = { 'enroll-first': 'Dana', 'enroll-last': 'Reyes', 'enroll-dob': '04/12/1991', 'enroll-address': '418 Lantern Way',
    'enroll-city': 'Harbor City', 'enroll-state': 'IL', 'enroll-zip': '60699', 'enroll-phone': '(312) 555-0142',
    'enroll-member-id': 'LKS884210377', 'enroll-bin': '999901', 'enroll-pcn': 'LKSRX', 'enroll-group': 'HCPS01',
    'enroll-npi': '1548390272', 'enroll-consent-date': '10/08/2026' };
  await check('savings: hero enrolls as VSP-26-40418', async () => {
    await enroll(hero, 'No');
    await page.waitForURL(/confirmation\.html/);
    expect((await text(page, 'conf-enrollment-id')) === 'VSP-26-40418', await text(page, 'conf-enrollment-id'));
    expect((await text(page, 'conf-status')) === 'Enrolled', 'enrolled');
  });
  await check('savings: Medicare Part D member is not eligible even if the question was answered No', async () => {
    await enroll({ ...hero, 'enroll-first': 'Walter', 'enroll-last': 'Brooks', 'enroll-dob': '01/22/1952', 'enroll-member-id': 'SLV220451883',
      'enroll-bin': '999911', 'enroll-pcn': 'SLVPD', 'enroll-group': 'SLV26D', 'enroll-phone': '(312) 555-0157', 'enroll-address': '146 Harborview Blvd' }, 'No');
    await page.waitForURL(/not-eligible\.html/);
    expect((await text(page, 'ne-status')) === 'Not eligible: federal or state program coverage', await text(page, 'ne-status'));
    expect((await page.locator('#ne-foundation-link').getAttribute('href')) === 'foundation.html', 'foundation link');
  });
  await check('savings: answering Yes to federal or state coverage is not eligible', async () => {
    await enroll(hero, 'Yes');
    await page.waitForURL(/not-eligible\.html/);
    expect((await text(page, 'ne-status')).startsWith('Not eligible: federal or state program coverage'), 'status');
  });
  await check('savings: consent is required', async () => {
    await page.goto(`${BASE}/savings/program.html`);
    await page.check('#program-vsp');
    await page.click('#program-continue');
    for (const id of ['elig-resident', 'elig-prescribed', 'elig-commercial']) await page.selectOption('#' + id, 'Yes');
    await page.selectOption('#elig-government', 'No');
    await page.click('#elig-continue');
    for (const [id, v] of Object.entries(hero)) await page.fill('#' + id, v);
    await page.click('#enroll-submit');
    await page.locator('#enroll-error').waitFor({ state: 'visible' });
  });

  await check('every page shows the synthetic footer', async () => {
    const pages = [];
    for (const site of ['lakeshore', 'rxaccess', 'savings']) {
      for (const f of fs.readdirSync(path.join(__dirname, '..', site))) if (f.endsWith('.html')) pages.push(`${site}/${f}`);
    }
    pages.push('index.html');
    for (const p of pages) {
      const html = await (await page.request.get(`${BASE}/${p}`)).text();
      expect(html.includes('SYNTHETIC DEMO DATA, NOT A REAL PATIENT'), p);
    }
  });
  await check('no script errors on any page visited', async () => { expect(!consoleErrors.length, consoleErrors.join(' | ')); });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed against ${BASE}`);
  process.exit(failed.length ? 1 : 0);
})();
