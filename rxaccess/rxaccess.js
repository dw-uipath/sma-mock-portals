/* RxAccess ePA portal (synthetic): pharmacy-benefit PA requests, question sets and determinations. */
(function () {
  'use strict';
  var S = window.SMA, $ = S.$, set = S.setText, ui = S.ui, SITE = 'rxaccess';

  var DRUGS = [
    { code: 'vedolizumab-pen', name: 'Entyvio Pen (vedolizumab) 108 mg/0.68 mL subcutaneous pen', ndc: '99999-0108-02',
      generic: 'vedolizumab', qset: 'vedolizumab', keywords: 'vedolizumab entyvio pen sc subcutaneous 108 0.68 injection' },
    { code: 'vedolizumab-iv', name: 'Entyvio (vedolizumab) 300 mg vial for IV infusion', ndc: '99999-0300-20',
      generic: 'vedolizumab', medical: true, keywords: 'vedolizumab entyvio iv intravenous infusion vial 300' },
    { code: 'dupilumab-pen', name: 'Dupixent (dupilumab) 300 mg/2 mL pen', ndc: '99999-0302-02', generic: 'dupilumab', keywords: 'dupilumab dupixent pen sc 300' },
    { code: 'adalimumab-adaz', name: 'Hyrimoz (adalimumab-adaz) 40 mg/0.4 mL pen', ndc: '99999-0040-04', generic: 'adalimumab-adaz', keywords: 'adalimumab adaz hyrimoz pen sc 40' },
    { code: 'ustekinumab-biosimilar', name: 'ustekinumab biosimilar 90 mg/mL prefilled syringe', ndc: '99999-0090-01', generic: 'ustekinumab', keywords: 'ustekinumab biosimilar syringe sc 90' },
    { code: 'risankizumab', name: 'Skyrizi (risankizumab) 180 mg on-body injector', ndc: '99999-0180-01', generic: 'risankizumab', keywords: 'risankizumab skyrizi on-body injector 180' },
    { code: 'secukinumab', name: 'Cosentyx (secukinumab) 150 mg/mL pen', ndc: '99999-0150-01', generic: 'secukinumab', keywords: 'secukinumab cosentyx pen 150' },
    { code: 'semaglutide', name: 'Ozempic (semaglutide) 1 mg pen', ndc: '99999-0001-04', generic: 'semaglutide', keywords: 'semaglutide ozempic pen' },
    { code: 'zelvatinib', name: 'zelvatinib (fictional) 50 mg tablet', ndc: '99999-0050-30', generic: 'zelvatinib', keywords: 'zelvatinib tablet oral 50' }
  ];
  var STOP = { mg: 1, ml: 1, per: 1, the: 1, of: 1, and: 1, for: 1 };
  var F3_DRUG = 'ustekinumab biosimilar 90 mg/mL prefilled syringe';

  function drugByCode(code) { return DRUGS.filter(function (d) { return d.code === code; })[0] || null; }

  function searchDrugs(q) {
    var tokens = String(q || '').toLowerCase().split(/[^a-z0-9.-]+/).filter(function (t) { return t.length >= 2 && !STOP[t]; });
    if (!tokens.length) return [];
    return DRUGS.map(function (d, i) {
      var hay = (d.name + ' ' + d.keywords).toLowerCase();
      return { d: d, i: i, score: tokens.filter(function (t) { return hay.indexOf(t) >= 0; }).length };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.i - b.i; })
      .map(function (r) { return r.d; });
  }

  function pharmacyInfo(raw) {
    var info = S.parseId(raw);
    return info && (info.kind === 'pharmacy-pa' || info.kind === 'pharmacy-appeal') ? info : null;
  }

  function drugFor(info, item) {
    if (item && item.drug) return item.drug;
    if (info.member.role === 'hero') return info.kind === 'pharmacy-pa' ? DRUGS[0].name : 'Appeal: ' + DRUGS[0].name;
    if (info.member.role === 'F3') return F3_DRUG;
    return '';
  }

  function resolveRequest(raw) {
    var r = String(raw || '').trim().toUpperCase();
    if (!r) return { error: 'Enter the request ID or the plan reference number.' };
    if (r === S.HERO.pen.authNumber) return { member: S.MEMBERS.LKS884210377, ref: r, drug: DRUGS[0].name, status: 'Approved' };
    var info = S.parseId(r);
    if (info && info.kind === 'pharmacy-pa') {
      return { member: info.member, ref: info.id, drug: drugFor(info, ui.findItem(SITE, info.id)), status: S.timeline(info).status };
    }
    return { error: 'No request found for "' + raw + '".' };
  }

  function renderResults(list, selected) {
    var box = $('rx-drug-results');
    box.innerHTML = '';
    list.forEach(function (d, i) {
      var label = document.createElement('label'), input = document.createElement('input');
      input.type = 'radio'; input.name = 'rx-drug'; input.id = 'rx-drug-result-' + (i + 1); input.value = d.code;
      input.setAttribute('data-code', d.code);
      input.checked = d.code === selected;
      label.htmlFor = input.id;
      label.id = 'rx-drug-result-' + (i + 1) + '-label';
      label.appendChild(input);
      label.appendChild(document.createTextNode(d.name + ' · NDC ' + d.ndc + (d.medical ? ' · medical benefit' : '')));
      box.appendChild(label);
    });
    if (!list.length) { var p = document.createElement('p'); p.className = 'empty'; p.id = 'rx-drug-none'; p.textContent = 'No drugs match that search.'; box.appendChild(p); }
  }

  function selectedDrug() {
    var c = document.querySelector('input[name="rx-drug"]:checked');
    return c ? drugByCode(c.value) : null;
  }

  var pages = {
    index: S.loginPage(SITE, 'requests.html'),
    reset: S.resetPage(SITE),

    new: function () {
      var d = S.store.draft(SITE);
      ['rx-patient-first', 'rx-patient-last', 'rx-patient-dob', 'rx-member-id', 'rx-prescriber-name', 'rx-prescriber-npi',
        'rx-bin', 'rx-pcn', 'rx-group'].forEach(function (id) { ui.fill(id, d[id]); });
      if (d.query) { ui.fill('rx-drug-query', d.query); renderResults(searchDrugs(d.query), d.drugCode); }
      $('rx-drug-form').addEventListener('submit', function (e) {
        e.preventDefault();
        S.show('rx-drug-note', false);
        renderResults(searchDrugs(ui.val('rx-drug-query')), '');
      });
      $('rx-drug-results').addEventListener('change', function () {
        var drug = selectedDrug();
        if (drug && drug.medical) {
          set('rx-drug-note', drug.name + ' is billed to the medical benefit. Submit it on the health plan provider portal, not through ePA.');
          S.show('rx-drug-note', true);
        } else S.show('rx-drug-note', false);
      });
      $('rx-continue').addEventListener('click', function () {
        ui.err('rx-new-error', '');
        var drug = selectedDrug();
        if (!drug) return ui.err('rx-new-error', 'Search for the drug and select it.');
        if (drug.medical) return ui.err('rx-new-error', drug.name + ' is billed to the medical benefit. Submit it on the health plan provider portal.');
        var v = {};
        ['rx-patient-first', 'rx-patient-last', 'rx-patient-dob', 'rx-member-id', 'rx-prescriber-name', 'rx-prescriber-npi',
          'rx-bin', 'rx-pcn', 'rx-group'].forEach(function (id) { v[id] = ui.val(id); });
        var missing = Object.keys(v).filter(function (k) { return !v[k]; });
        if (missing.length) return ui.err('rx-new-error', 'Complete every patient, prescriber and pharmacy benefit field.');
        var m = S.MEMBERS[S.normMember(v['rx-member-id'])];
        var dob = S.normDob(v['rx-patient-dob']);
        if (!m || m.dob !== dob || m.last.toLowerCase() !== v['rx-patient-last'].toLowerCase()) {
          return ui.err('rx-new-error', 'Patient not found at this plan. Check the member ID, last name and date of birth.');
        }
        if (m.bin !== v['rx-bin'] || m.pcn.toUpperCase() !== v['rx-pcn'].toUpperCase() || m.rxGroup.toUpperCase() !== v['rx-group'].toUpperCase()) {
          return ui.err('rx-new-error', 'BIN, PCN and Rx group do not match the patient\'s pharmacy benefit.');
        }
        if (!/^\d{10}$/.test(v['rx-prescriber-npi'].replace(/\D/g, ''))) return ui.err('rx-new-error', 'Prescriber NPI must be 10 digits.');
        v.query = ui.val('rx-drug-query'); v.drugCode = drug.code; v.member = m.id;
        S.store.draft(SITE, Object.assign(d, v));
        window.location.href = 'questions.html';
      });
    },

    questions: function () {
      var d = S.store.draft(SITE), drug = drugByCode(d.drugCode), m = S.MEMBERS[d.member];
      if (!drug || !m) { window.location.replace('new.html'); return; }
      set('q-set-title', m.payer + ' · ' + (drug.qset === 'vedolizumab'
        ? 'Vedolizumab (Entyvio) IV and SC question set · clinical policy LHP-RX-114'
        : drug.generic + ' · specialty drug question set'));
      set('q-request-summary', S.fullName(m) + ' (' + m.id + ') · ' + drug.name + ' · ' + d['rx-prescriber-name'] + ', NPI ' + d['rx-prescriber-npi']);
      var a = d.answers || {};
      Object.keys(a).forEach(function (k) { ui.fill(k, a[k]); });
      $('q-continue').addEventListener('click', function () {
        var ids = ['q-diagnosis', 'q-severity', 'q-specialty', 'q-urgency', 'q-conventional', 'q-biologic-name', 'q-biologic-dates', 'q-biologic-outcome'];
        var v = {};
        ids.forEach(function (id) { v[id] = ui.val(id); });
        if (ids.some(function (id) { return !v[id]; })) return ui.err('q-error', 'Answer every question. Enter "None" where no preferred biologic was tried.');
        if (!/^[A-Z]\d{2}(\.[0-9A-Z]{1,4})?$/.test(v['q-diagnosis'].toUpperCase())) return ui.err('q-error', 'Diagnosis must be an ICD-10 code such as K51.011.');
        d.answers = v;
        S.store.draft(SITE, d);
        window.location.href = 'attachments.html';
      });
    },

    attachments: function () {
      var d = S.store.draft(SITE), drug = drugByCode(d.drugCode), m = S.MEMBERS[d.member];
      if (!drug || !m || !d.answers) { window.location.replace('new.html'); return; }
      set('rx-attach-summary', S.fullName(m) + ' · ' + drug.name + ' · ' + d.answers['q-urgency'] + ' review');
      var files = [];
      $('rx-file').addEventListener('change', function (e) {
        files = Array.prototype.map.call(e.target.files, function (f) { return f.name; });
        set('rx-file-list', files.length ? 'Attached: ' + files.join(', ') : '');
      });
      $('rx-submit').addEventListener('click', function () {
        var letter = ui.val('rx-letter');
        if (!letter && !files.length) return ui.err('rx-attach-error', 'Paste the letter of medical necessity or upload it.');
        var now = new Date(), expedited = d.answers['q-urgency'] === 'Expedited';
        var id = S.makeId('pharmacy-pa', m.id, now, expedited ? 'E' : '');
        S.store.add(SITE, { id: id, member: m.id, drug: drug.name, plan: m.plan + ' / ' + m.pbm, submittedAt: S.isoUtc(now),
          urgency: d.answers['q-urgency'], answers: d.answers,
          documents: ui.val('rx-attachment-list').split(/\n+/).filter(Boolean).concat(files) });
        S.store.draft(SITE, null);
        window.location.href = 'submitted.html?id=' + encodeURIComponent(id);
      });
    },

    submitted: function () {
      var info = S.parseId(S.qs('id'));
      if (!info || info.kind !== 'pharmacy-pa') { set('rx-submission-id', 'Unknown request'); return; }
      var item = ui.findItem(SITE, info.id), clock = S.timeline(info).clock;
      set('rx-submission-id', info.id);
      ui.pill('rx-submission-status', 'Received');
      set('rx-submitted-at', S.isoUtc(info.submittedAt));
      set('rx-submitted-at-local', S.localTime(info.submittedAt));
      set('rx-submission-drug', drugFor(info, item));
      set('rx-submission-patient', S.fullName(info.member) + ' (' + info.member.id + ')');
      set('rx-submission-plan', info.member.plan + ' / ' + info.member.pbm);
      set('rx-submission-urgency', clock.urgency + ' (' + clock.hours + '-hour clock)');
      set('rx-submission-due', S.localTime(clock.dueAt));
      $('rx-view-request').href = 'request.html?id=' + encodeURIComponent(info.id);
    },

    requests: function () {
      var tb = $('rx-request-rows');
      var ids = [S.F3_SEED_ID].concat(S.store.list(SITE).map(function (it) { return it.id; }));
      ids.forEach(function (id, i) {
        var info = pharmacyInfo(id);
        if (!info) return;
        var tl = S.timeline(info), st = document.createElement('span');
        st.className = 'pill ' + tl.status.replace(/\s+/g, '-'); st.textContent = tl.status;
        ui.row(tb, 'rx-request-row-' + (i + 1), [ui.link('request.html?id=' + encodeURIComponent(info.id), info.id, 'rx-request-link-' + (i + 1)),
          S.fullName(info.member), drugFor(info, ui.findItem(SITE, info.id)), info.member.plan, S.localTime(info.submittedAt),
          tl.clock.percent + '% of ' + tl.clock.hours + ' h', st]);
      });
      $('rx-find-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var raw = ui.val('rx-find-id');
        if (!pharmacyInfo(raw)) return ui.err('rx-find-error', 'No request found for "' + raw + '".');
        window.location.href = 'request.html?id=' + encodeURIComponent(raw.toUpperCase());
      });
    },

    request: function () {
      var raw = S.qs('id'), info = pharmacyInfo(raw);
      if (!info) { S.show('rx-req-not-found', true); set('rx-req-not-found-id', raw || '(none)'); return; }
      var tl = S.timeline(info), m = info.member, item = ui.findItem(SITE, info.id), d = tl.determination;
      S.show('rx-req-card', true); S.show('rx-history-card', true);
      set('rx-req-id', info.id);
      set('rx-req-type', info.kind === 'pharmacy-pa' ? 'Pharmacy prior authorization' : 'Pharmacy appeal');
      ui.pill('rx-req-status', tl.status, true);
      set('rx-req-patient', S.fullName(m)); set('rx-req-member-id', m.id); set('rx-req-plan', m.plan + ' / ' + m.pbm);
      set('rx-req-drug', ui.dash(drugFor(info, item)));
      set('rx-req-submitted-at', S.localTime(info.submittedAt) + ' (' + S.isoUtc(info.submittedAt) + ')');
      set('rx-req-clock', tl.clock.urgency + ', ' + tl.clock.hours + ' h · ' + tl.clock.percent + '% elapsed · due ' + S.localTime(tl.clock.dueAt));
      set('rx-req-checked-at', S.localTime(new Date()));
      if (!d && tl.clock.percent >= 80) {
        set('rx-req-clock-alert', 'Plan response clock at ' + tl.clock.percent + '% of ' + tl.clock.hours + ' hours with no determination.');
        S.show('rx-req-clock-alert', true);
      }
      if (d) {
        S.show('rx-determination', true);
        set('rx-det-decision', d.detail || d.decision); set('rx-det-date', d.decisionDate);
        set('rx-det-auth-number', ui.dash(d.authNumber)); set('rx-det-drug', ui.dash(d.service || drugFor(info, item)));
        set('rx-det-quantity', ui.dash(d.quantity)); set('rx-det-valid-from', ui.dash(d.validFrom)); set('rx-det-valid-to', ui.dash(d.validTo));
        set('rx-det-dispense', ui.dash(d.dispense)); set('rx-det-reason', ui.dash(d.reason));
        set('rx-det-letter-name', d.letterFile || 'No letter for this determination in the demo set');
        if (d.letterFile) $('rx-letter-link').href = 'letters/' + d.letterFile; else $('rx-letter-link').hidden = true;
        $('rx-det-appeal-link').hidden = d.decision !== 'Denied';
        $('rx-det-appeal-link').href = 'appeal.html?ref=' + encodeURIComponent(info.id);
      }
      ui.history('rx-req-history', tl.history);
    },

    appeal: function () {
      var found = null;
      if (S.qs('ref')) ui.fill('rx-appeal-reference', S.qs('ref'));
      $('rx-appeal-find-form').addEventListener('submit', function (e) {
        e.preventDefault();
        found = resolveRequest(ui.val('rx-appeal-reference'));
        if (found.error) { ui.err('rx-appeal-error', found.error); S.show('rx-appeal-details', false); return; }
        ui.err('rx-appeal-error', '');
        S.show('rx-appeal-details', true);
        set('rx-appeal-summary', 'Request ' + found.ref + ' · ' + S.fullName(found.member) + ' (' + found.member.id + ') · ' +
          ui.dash(found.drug) + ' · current status ' + found.status);
      });
      $('rx-appeal-submit').addEventListener('click', function () {
        if (!found || found.error) return ui.err('rx-appeal-submit-error', 'Find the request first.');
        if (!ui.val('rx-appeal-letter')) return ui.err('rx-appeal-submit-error', 'Paste the appeal letter.');
        var now = new Date(), id = S.makeId('pharmacy-appeal', found.member.id, now, '');
        S.store.add(SITE, { id: id, member: found.member.id, drug: 'Appeal: ' + (found.drug || found.ref), plan: found.member.plan,
          submittedAt: S.isoUtc(now), original: found.ref, peerToPeer: !!ui.val('rx-appeal-p2p') });
        window.location.href = 'appeal-submitted.html?id=' + encodeURIComponent(id);
      });
    },

    'appeal-submitted': function () {
      var info = S.parseId(S.qs('id'));
      if (!info || info.kind !== 'pharmacy-appeal') { set('rx-appeal-submission-id', 'Unknown appeal'); return; }
      var item = ui.findItem(SITE, info.id);
      set('rx-appeal-submission-id', info.id);
      ui.pill('rx-appeal-status', 'Appeal received');
      set('rx-appeal-submitted-at', S.isoUtc(info.submittedAt));
      set('rx-appeal-ref', item ? item.original : '—');
      set('rx-appeal-member', S.fullName(info.member) + ' (' + info.member.id + ')');
      $('rx-appeal-view').href = 'request.html?id=' + encodeURIComponent(info.id);
    }
  };

  S.boot(pages);
})();
