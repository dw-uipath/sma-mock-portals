/*
 * SMA mock portals: shared data and helpers.
 * Every person, plan, number and program on these sites is synthetic.
 *
 * There is no server state. Each outcome follows from the member ID and the
 * submission ID; the ID carries the submission time (UTC), the member's last
 * four digits and flags. A reset is simply a new submission.
 */
(function () {
  'use strict';

  var PENDING_MINUTES = 3;   // a new submission shows Pending for this long, then its scripted outcome
  var MINUTE = 60000;

  var LOGIN_HASH = {         // sha256("<username>:<password>"); logins live in Orchestrator credential assets
    lakeshore: '2730737bf16c51b21f61fba4f4237c355728a386b384a49703fa263fcaff31cd',
    rxaccess: '6074e90445fb34bd339848c201434f4699f8f3fb7cb6efc99687788877f3959a',
    savings: '155272e3e59ecb8d6797b0c597cca68d04f337dde3f08b50ff8e4f22311aabb2'
  };

  var PRESCRIBERS = {
    '1548390272': { name: 'Morgan Patel, MD', specialty: 'Gastroenterology', practice: 'Northlake GI Associates' },
    '1762048531': { name: 'Avery Chen, MD', specialty: 'Dermatology', practice: 'Harbor City Dermatology' },
    '1928374656': { name: 'Jordan Okafor, MD', specialty: 'Neurology', practice: 'Lakefront Neurology Group' }
  };

  function lakeshoreMember(m) {
    m.payer = 'Lakeshore Health Plan';
    m.plan = m.plan || 'Lakeshore Health Plan PPO';
    m.coverageType = 'Commercial';
    m.government = false;
    m.pbm = 'Lakeshore Rx Solutions';
    m.bin = '999901';
    m.pcn = 'LKSRX';
    m.lakeshore = true;
    m.city = 'Harbor City'; m.state = 'IL'; m.zip = '60699';
    return m;
  }

  var MEMBERS = {
    LKS884210377: lakeshoreMember({ first: 'Dana', last: 'Reyes', dob: '04/12/1991', sex: 'Female',
      address: '418 Lantern Way', phone: '(312) 555-0142', employer: 'Harbor City Public Schools',
      group: '70412-HCPS', rxGroup: 'HCPS01', status: 'Active', effective: '08/01/2026', terminated: '',
      role: 'hero' }),
    LKS000000000: lakeshoreMember({ first: 'Casey', last: 'Lindqvist', dob: '02/17/1983', sex: 'Male',
      address: '77 Breakwater Ct', phone: '(312) 555-0161', employer: 'Harbor City Public Schools',
      group: '70412-HCPS', rxGroup: 'HCPS01', status: 'Terminated', effective: '01/01/2024', terminated: '06/30/2026',
      role: 'inactive' }),
    LKS710338264: lakeshoreMember({ first: 'Priya', last: 'Nair', dob: '08/03/1987', sex: 'Female',
      address: '1290 Gull Point Rd', phone: '(312) 555-0151', employer: 'Lakeview Credit Union',
      group: '70533-LVCU', rxGroup: 'LVCU01', status: 'Active', effective: '01/01/2025', terminated: '', role: 'F1' }),
    LKS552907183: lakeshoreMember({ first: 'Tom', last: 'Alvarez', dob: '05/14/1968', sex: 'Male',
      address: '35 Ferry Slip Ln', phone: '(312) 555-0152', employer: 'Harbor City Transit',
      group: '70618-HCT', rxGroup: 'HCT01', status: 'Active', effective: '01/01/2022', terminated: '', role: 'F4' }),
    LKS639184520: lakeshoreMember({ first: 'Grace', last: 'Kim', dob: '02/09/1990', sex: 'Female',
      address: '804 Signal Hill Ave', phone: '(312) 555-0153', employer: 'Northshore Design Studio',
      group: '70745-NDS', rxGroup: 'NDS01', status: 'Active', effective: '03/01/2024', terminated: '', role: 'F5' }),
    LKS447120938: lakeshoreMember({ first: 'Marcus', last: 'Hill', dob: '07/19/1984', sex: 'Male',
      address: '61 Driftwood Ter', phone: '(312) 555-0154', employer: 'Brightwater Foods',
      group: '70812-BWF', rxGroup: 'BWF01', status: 'Active', effective: '01/01/2026', terminated: '',
      plan: 'Lakeshore Health Plan PPO Saver', role: 'F6' }),
    LKS305871649: lakeshoreMember({ first: 'Ray', last: 'Thompson', dob: '03/27/1961', sex: 'Male',
      address: '2017 Anchor Bay Dr', phone: '(312) 555-0155', employer: 'Pier 9 Manufacturing',
      group: '70927-P9M', rxGroup: 'P9M01', status: 'Active', effective: '06/01/2023', terminated: '', role: 'F8' }),
    LKS918263075: lakeshoreMember({ first: 'Lena', last: 'Ortiz', dob: '09/15/1995', sex: 'Female',
      address: '9 Lighthouse Row', phone: '(312) 555-0156', employer: 'Harbor City Public Schools',
      group: '70412-HCPS', rxGroup: 'HCPS01', status: 'Active', effective: '08/01/2025', terminated: '', role: 'F9' }),
    SLV220451883: { first: 'Walter', last: 'Brooks', dob: '01/22/1952', sex: 'Male', address: '146 Harborview Blvd',
      city: 'Harbor City', state: 'IL', zip: '60699', phone: '(312) 555-0157', payer: 'Silverline Health',
      plan: 'Silverline Medicare Part D (PDP)', coverageType: 'Medicare Part D', government: true,
      pbm: 'Silverline Rx', bin: '999911', pcn: 'SLVPD', rxGroup: 'SLV26D', group: 'SLV-PDP-26',
      status: 'Active', effective: '01/01/2026', terminated: '', lakeshore: false, role: 'F2' },
    PSM662041739: { first: 'Keisha', last: 'Monroe', dob: '11/30/1979', sex: 'Female', address: '512 Canal St Apt 3',
      city: 'Harbor City', state: 'IL', zip: '60699', phone: '(312) 555-0158', payer: 'Prairie State Medicaid',
      plan: 'Prairie State Medicaid Managed Care', coverageType: 'Medicaid', government: true,
      pbm: 'Prairie State Medicaid Pharmacy Program', bin: '999921', pcn: 'PSMCD', rxGroup: 'PSM26', group: 'PSM-MCD',
      status: 'Active', effective: '04/01/2025', terminated: '', lakeshore: false, role: 'F3' },
    SLV220993140: { first: 'Helen', last: 'Dubois', dob: '12/02/1949', sex: 'Female', address: '33 Old Pier Rd',
      city: 'Harbor City', state: 'IL', zip: '60699', phone: '(312) 555-0159', payer: 'Silverline Health',
      plan: 'Silverline Medicare Advantage (HMO)', coverageType: 'Medicare Advantage', government: true,
      pbm: 'Silverline Rx', bin: '999911', pcn: 'SLVMA', rxGroup: 'SLV26A', group: 'SLV-MA-26',
      status: 'Active', effective: '01/01/2026', terminated: '', lakeshore: false, role: 'F7' }
  };
  Object.keys(MEMBERS).forEach(function (k) { MEMBERS[k].id = k; });

  // Scripted determinations: values match the letters in the hero record set word for word.
  var HERO = {
    umCase: 'LKS-UM-26-55017',
    rfi: {
      status: 'Information requested', referenceNumber: 'LKS-UM-26-55017', requestDate: '10/08/2026',
      question: 'Please provide a colonoscopy or Mayo score dated within 90 days.', dueDate: '10/13/2026',
      letterFile: 'Lakeshore_Letter_2026-10-08_Request_for_Information_LKS-UM-26-55017.pdf',
      letterTitle: 'Request for information'
    },
    denial: {
      decision: 'Denied', referenceNumber: 'LKS-UM-26-55017', authNumber: '', decisionDate: '10/09/2026',
      service: 'vedolizumab 300 mg IV, J3380, 2 doses (induction, weeks 0 and 2)',
      reasonCategory: 'Step therapy',
      reason: 'The submitted records do not document a trial of a preferred biologic as required by policy LHP-RX-114 section 3.4. The medication history provided lists no prior biologic therapy.',
      policyClause: 'LHP-RX-114 section 3.4', appealDeadline: '04/07/2027', appealWindow: '180 days',
      peerToPeer: 'Available by 10/23/2026 (14 days) at (800) 555-0131',
      reviewer: 'Elaine Fairbrook, PharmD, BCPS, Clinical Pharmacist Reviewer',
      validFrom: '', validTo: '', quantity: '', siteOfCare: 'Riverbend Health Infusion Center',
      letterFile: 'Lakeshore_Letter_2026-10-09_IV_Denial_LKS-UM-26-55017.pdf', letterTitle: 'Determination: denied'
    },
    appeal: {
      decision: 'Approved', detail: 'Overturned on appeal; approved', referenceNumber: 'LKS-UM-26-55017',
      authNumber: 'LKS-PA-26-118377', decisionDate: '10/15/2026', appealReceived: '10/12/2026',
      service: 'vedolizumab 300 mg IV, J3380, 2 doses', siteOfCare: 'Riverbend Health Infusion Center',
      validFrom: '10/16/2026', validTo: '12/31/2026', reasonCategory: '', reason: '', policyClause: '',
      appealDeadline: '', peerToPeer: '', reviewer: 'Gregory Thale, MD', quantity: '',
      letterFile: 'Lakeshore_Letter_2026-10-15_Appeal_Approval_LKS-PA-26-118377.pdf', letterTitle: 'Appeal determination: approved'
    },
    pen: {
      decision: 'Approved', referenceNumber: 'LKS-PA-26-118204', authNumber: 'LKS-PA-26-118204', decisionDate: '10/09/2026',
      service: 'vedolizumab SC pen 108 mg', quantity: '2 pens per 28 days', validFrom: '10/09/2026', validTo: '04/08/2027',
      dispense: 'Lakeshore Rx specialty network', reasonCategory: '', reason: '', policyClause: '', appealDeadline: '',
      peerToPeer: '', reviewer: '',
      letterFile: 'Lakeshore_Letter_2026-10-09_Pen_Approval_LKS-PA-26-118204.pdf', letterTitle: 'Determination: approved'
    }
  };

  var F3_SEED_ID = 'RXA-SEED-F3-1739';
  var F3_SEED_AGE_MINUTES = 19 * 60 + 20;   // 81% of a 24-hour expedited clock

  // ---------- small helpers ----------
  function $(id) { return document.getElementById(id); }
  function setText(id, value) { var e = $(id); if (e) e.textContent = value == null ? '' : String(value); }
  function show(id, on) { var e = $(id); if (e) e.hidden = !on; }
  function qs(name) { return new URLSearchParams(window.location.search).get(name) || ''; }
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  function normMember(s) { return String(s || '').toUpperCase().replace(/[\s-]/g, ''); }
  function normDob(s) {
    s = String(s || '').trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return pad(m[1]) + '/' + pad(m[2]) + '/' + m[3];
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return pad(m[2]) + '/' + pad(m[3]) + '/' + m[1];
    return s;
  }
  function memberByLast4(last4) {
    var keys = Object.keys(MEMBERS);
    for (var i = 0; i < keys.length; i++) if (keys[i].slice(-4) === last4) return MEMBERS[keys[i]];
    return null;
  }
  function fullName(m) { return m ? m.first + ' ' + m.last : ''; }

  function stamp(d) {
    return pad(d.getUTCFullYear() % 100) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + '-' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
  }
  function parseStamp(ymd, hms) {
    return new Date(Date.UTC(2000 + +ymd.slice(0, 2), +ymd.slice(2, 4) - 1, +ymd.slice(4, 6),
      +hms.slice(0, 2), +hms.slice(2, 4), +hms.slice(4, 6)));
  }
  function isoUtc(d) { return d.toISOString().replace(/\.\d{3}Z$/, 'Z'); }
  function mdy(d) { return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear(); }
  function localTime(d) {
    return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric',
      minute: '2-digit', timeZoneName: 'short' });
  }
  function addMinutes(d, n) { return new Date(d.getTime() + n * MINUTE); }
  function hashNum(s, mod) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h % mod;
  }

  // ---------- submission IDs ----------
  // Flags: E = expedited, R = information-request demo scenario.
  var ID_PATTERNS = [
    { kind: 'medical-pa', re: /^LKS-MPA-(\d{6})-(\d{6})-(\d{4})([ER]{0,2})$/ },
    { kind: 'medical-appeal', re: /^LKS-APL-(\d{6})-(\d{6})-(\d{4})([ER]{0,2})$/ },
    { kind: 'pharmacy-appeal', re: /^RXA-APL-(\d{6})-(\d{6})-(\d{4})([ER]{0,2})$/ },
    { kind: 'pharmacy-pa', re: /^RXA-(\d{6})-(\d{6})-(\d{4})([ER]{0,2})$/ }
  ];
  var PREFIX = { 'medical-pa': 'LKS-MPA-', 'medical-appeal': 'LKS-APL-', 'pharmacy-pa': 'RXA-', 'pharmacy-appeal': 'RXA-APL-' };

  function makeId(kind, memberId, when, flags) {
    return PREFIX[kind] + stamp(when) + '-' + normMember(memberId).slice(-4) + (flags || '');
  }

  function parseId(raw) {
    var id = String(raw || '').trim().toUpperCase();
    if (id === F3_SEED_ID) {
      return { id: id, kind: 'pharmacy-pa', member: MEMBERS.PSM662041739, flags: 'E', seed: true,
        submittedAt: addMinutes(new Date(), -F3_SEED_AGE_MINUTES) };
    }
    for (var i = 0; i < ID_PATTERNS.length; i++) {
      var m = id.match(ID_PATTERNS[i].re);
      if (!m) continue;
      var when = parseStamp(m[1], m[2]);
      if (isNaN(when.getTime()) || when.getTime() > Date.now() + 5 * MINUTE) return null;
      var member = memberByLast4(m[3]);
      if (!member) return null;
      return { id: id, kind: ID_PATTERNS[i].kind, member: member, flags: m[4] || '', submittedAt: when, seed: false };
    }
    return null;
  }

  // ---------- scripted timelines ----------
  function genericApproval(info, kind, at) {
    var n = hashNum(info.id, 90000) + 10000;
    var to = new Date(at.getTime()); to.setMonth(to.getMonth() + 6); to.setDate(to.getDate() - 1);
    return {
      decision: 'Approved', detail: kind === 'appeal' ? 'Overturned on appeal; approved' : '',
      referenceNumber: (info.kind.indexOf('pharmacy') === 0 ? 'RXA-DET-' : 'LKS-UM-26-') + n,
      authNumber: 'LKS-PA-26-1' + pad(n, 5), decisionDate: mdy(at), service: info.service || '',
      quantity: '', validFrom: mdy(at), validTo: mdy(to), reasonCategory: '', reason: '', policyClause: '',
      appealDeadline: '', peerToPeer: '', reviewer: '', letterFile: '', letterTitle: ''
    };
  }

  function clockFor(info) {
    var hours = info.flags.indexOf('E') >= 0 ? 24 : 72;
    var elapsedMin = Math.max(0, (Date.now() - info.submittedAt.getTime()) / MINUTE);
    return { hours: hours, urgency: hours === 24 ? 'Expedited' : 'Standard', elapsedMinutes: elapsedMin,
      percent: Math.min(100, Math.round(elapsedMin / (hours * 60) * 100)), dueAt: addMinutes(info.submittedAt, hours * 60) };
  }

  // Returns { status, history[], determination|null, rfi|null, clock }
  function timeline(info) {
    var t0 = info.submittedAt, now = Date.now(), P = PENDING_MINUTES;
    var m = info.member, hero = m.role === 'hero';
    var history = [], status, det = null, rfi = null;
    function at(min) { return addMinutes(t0, min); }
    function passed(min) { return now >= at(min).getTime(); }

    if (info.kind === 'medical-pa') {
      history.push({ at: t0, status: 'Received', note: 'Request received through the provider portal' });
      history.push({ at: t0, status: 'Pending', note: 'Clinical review in progress' });
      status = 'Pending';
      if (m.status !== 'Active') {
        det = genericApproval(info, 'pa', at(0));
        det.decision = 'Denied'; det.reasonCategory = 'Eligibility'; det.authNumber = '';
        det.reason = 'Coverage terminated ' + m.terminated + '. The member was not eligible on the date of service.';
        det.validFrom = ''; det.validTo = '';
        status = 'Denied';
        history.push({ at: t0, status: 'Denied', note: det.reason });
      } else if (hero) {
        var finalAt = P;
        if (info.flags.indexOf('R') >= 0) {
          finalAt = 2 * P;
          if (passed(P)) {
            status = 'Information requested'; rfi = HERO.rfi;
            history.push({ at: at(P), status: 'Information requested', note: HERO.rfi.question + ' Due ' + HERO.rfi.dueDate });
          }
        }
        if (passed(finalAt)) {
          status = 'Denied'; det = HERO.denial; rfi = null;
          history.push({ at: at(finalAt), status: 'Denied', note: 'Determination letter posted to the letters inbox' });
        }
      } else if (passed(P)) {
        status = 'Approved'; det = genericApproval(info, 'pa', at(P));
        history.push({ at: at(P), status: 'Approved', note: 'Determination posted' });
      }
    } else if (info.kind === 'medical-appeal' || info.kind === 'pharmacy-appeal') {
      history.push({ at: t0, status: 'Appeal received', note: 'Appeal received; original denial under re-review' });
      history.push({ at: t0, status: 'Pending', note: 'Appeal review in progress' });
      status = 'Pending';
      if (passed(P)) {
        status = 'Appeal approved';
        det = hero && info.kind === 'medical-appeal' ? HERO.appeal : genericApproval(info, 'appeal', at(P));
        history.push({ at: at(P), status: 'Appeal approved', note: det.letterFile ? 'Appeal determination letter posted' : 'Appeal determination posted' });
      }
    } else if (info.kind === 'pharmacy-pa') {
      history.push({ at: t0, status: 'Received', note: 'ePA request received and routed to ' + m.pbm });
      history.push({ at: t0, status: 'Pending', note: 'Plan review in progress' });
      status = 'Pending';
      if (m.role === 'F3') {
        history.push({ at: addMinutes(t0, 60), status: 'Pending', note: 'No plan response yet' });
      } else if (passed(P)) {
        status = 'Approved'; det = hero ? HERO.pen : genericApproval(info, 'pa', at(P));
        history.push({ at: at(P), status: 'Approved', note: det.letterFile ? 'Approval letter available' : 'Determination posted' });
      }
    }
    return { status: status, history: history, determination: det, rfi: rfi, clock: clockFor(info) };
  }

  function umCaseFor(info) {
    if (info.member.role === 'hero') return HERO.umCase;
    return 'LKS-UM-26-' + (hashNum(info.id, 90000) + 10000);
  }

  // ---------- per-browser list of this browser's submissions (display only) ----------
  var store = {
    key: function (site) { return 'sma.' + site + '.items'; },
    list: function (site) {
      try { return JSON.parse(localStorage.getItem(store.key(site)) || '[]'); } catch (e) { return []; }
    },
    add: function (site, item) {
      try { var l = store.list(site); l.unshift(item); localStorage.setItem(store.key(site), JSON.stringify(l.slice(0, 50))); } catch (e) { /* storage off: list stays empty */ }
    },
    reset: function (site) {
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sma.' + site + '.') === 0) localStorage.removeItem(k); });
        Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf('sma.') === 0) sessionStorage.removeItem(k); });
      } catch (e) { /* nothing stored */ }
    },
    draft: function (site, value) {   // multi-step forms keep their draft in the tab session
      var k = 'sma.' + site + '.draft';
      try {
        if (value === undefined) return JSON.parse(sessionStorage.getItem(k) || '{}');
        if (value === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(value));
      } catch (e) { return {}; }
      return value;
    }
  };

  // ---------- login ----------
  function sha256hex(text) {
    if (!(window.crypto && window.crypto.subtle)) return Promise.reject(new Error('Open the portal over https to sign in.'));
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return pad(b.toString(16)); }).join('');
    });
  }
  var auth = {
    key: function (site) { return 'sma.auth.' + site; },
    user: function (site) { try { return sessionStorage.getItem(auth.key(site)) || ''; } catch (e) { return ''; } },
    login: function (site, user, pass) {
      return sha256hex(String(user).trim() + ':' + String(pass)).then(function (h) {
        if (h !== LOGIN_HASH[site]) return false;
        try { sessionStorage.setItem(auth.key(site), String(user).trim()); } catch (e) { /* session only */ }
        return true;
      });
    },
    logout: function (site) { try { sessionStorage.removeItem(auth.key(site)); } catch (e) { /* none */ } }
  };

  // ---------- page settings: ?variant=moved (layout shift test) and ?latency=N (slow portal test) ----------
  function readSetting(name) {
    var v = qs(name);
    try {
      if (v === 'standard' || v === '0') { sessionStorage.removeItem('sma.' + name); return ''; }
      if (v) { sessionStorage.setItem('sma.' + name, v); return v; }
      return sessionStorage.getItem('sma.' + name) || '';
    } catch (e) { return v; }
  }

  function boot(pages) {
    var body = document.body, site = body.getAttribute('data-site'), page = body.getAttribute('data-page');
    var variant = readSetting('variant'), latency = parseInt(readSetting('latency'), 10) || 0;
    if (variant === 'moved') {
      body.classList.add('variant-moved');
      var banner = document.createElement('div');
      banner.className = 'maintenance-banner';
      banner.id = 'maintenance-banner';
      banner.textContent = 'Scheduled maintenance tonight 11:00 PM to 1:00 AM CT. Some screens have a new layout.';
      body.insertBefore(banner, body.firstChild);
    }
    if (body.getAttribute('data-auth') === 'required' && !auth.user(site)) {
      window.location.replace('index.html?next=' + encodeURIComponent(page + '.html' + window.location.search));
      return;
    }
    setText('nav-user', auth.user(site));
    var out = $('nav-logout');
    if (out) out.addEventListener('click', function (e) { e.preventDefault(); auth.logout(site); window.location.href = 'index.html'; });

    var main = $('main');
    function start() {
      if (main) { main.hidden = false; main.removeAttribute('aria-busy'); }
      show('loading', false);
      if (pages[page]) pages[page]();
    }
    if (latency > 0 && main) {
      main.hidden = true; main.setAttribute('aria-busy', 'true'); show('loading', true);
      window.setTimeout(start, latency * 1000);
    } else start();
  }

  // ---------- tab-session values (search terms, prefills, confirmation details) ----------
  var session = {
    get: function (k) { try { return JSON.parse(sessionStorage.getItem('sma.' + k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem('sma.' + k, JSON.stringify(v)); } catch (e) { /* session only */ } }
  };

  // ---------- UI helpers shared by the three sites ----------
  var ui = {
    val: function (id) { var e = $(id); return e ? String(e.value || '').trim() : ''; },
    fill: function (id, v) { var e = $(id); if (e && v != null) e.value = v; },
    err: function (id, msg) { var e = $(id); if (!e) return false; e.textContent = msg || ''; e.hidden = !msg; return false; },
    pill: function (id, status, big) {
      var e = $(id); if (!e) return;
      e.textContent = status;
      e.className = 'pill ' + (big ? 'big-status ' : '') + String(status).replace(/\s+/g, '-');
    },
    dash: function (v) { return v ? v : '—'; },
    findItem: function (site, id) {
      var l = store.list(site);
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    history: function (tbodyId, history) {
      var tb = $(tbodyId); if (!tb) return;
      tb.innerHTML = '';
      history.forEach(function (h, i) {
        var tr = document.createElement('tr');
        tr.id = tbodyId + '-row-' + (i + 1);
        [localTime(h.at), h.status, h.note].forEach(function (t, c) {
          var td = document.createElement('td');
          if (c === 1) { var p = document.createElement('span'); p.className = 'pill ' + h.status.replace(/\s+/g, '-'); p.textContent = t; td.appendChild(p); }
          else td.textContent = t;
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
    },
    row: function (tb, id, cells) {
      var tr = document.createElement('tr'); tr.id = id;
      cells.forEach(function (c) { var td = document.createElement('td'); if (c instanceof Node) td.appendChild(c); else td.textContent = c; tr.appendChild(td); });
      tb.appendChild(tr);
      return tr;
    },
    link: function (href, text, id, download) {
      var a = document.createElement('a'); a.href = href; a.textContent = text; if (id) a.id = id; if (download) a.setAttribute('download', '');
      return a;
    }
  };

  function loginPage(site, home) {
    return function () {
      var form = $('login-form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        ui.err('login-error', '');
        var user = ui.val('login-username'), pass = $('login-password').value;
        if (!user || !pass) { ui.err('login-error', 'Enter your username and password.'); return; }
        $('login-submit').disabled = true;
        auth.login(site, user, pass).then(function (ok) {
          $('login-submit').disabled = false;
          if (!ok) { ui.err('login-error', 'The username or password is incorrect.'); return; }
          var next = qs('next');
          window.location.href = /^[a-z-]+\.html(\?[^#]*)?$/.test(next) ? next : home;
        }, function (er) { $('login-submit').disabled = false; ui.err('login-error', er.message); });
      });
    };
  }

  function resetPage(site) {
    return function () {
      store.reset(site);
      auth.logout(site);
      setText('reset-status', 'Reset complete. This browser is back at the start state.');
    };
  }

  window.SMA = {
    PENDING_MINUTES: PENDING_MINUTES, MEMBERS: MEMBERS, PRESCRIBERS: PRESCRIBERS, HERO: HERO, F3_SEED_ID: F3_SEED_ID,
    $: $, setText: setText, show: show, qs: qs, pad: pad, normMember: normMember, normDob: normDob, fullName: fullName,
    stamp: stamp, isoUtc: isoUtc, mdy: mdy, localTime: localTime, addMinutes: addMinutes, hashNum: hashNum,
    makeId: makeId, parseId: parseId, timeline: timeline, umCaseFor: umCaseFor,
    store: store, session: session, auth: auth, ui: ui, loginPage: loginPage, resetPage: resetPage, boot: boot
  };
})();
