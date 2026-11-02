/* Lakeshore Health Plan provider portal (synthetic): eligibility, medical PA, letters and appeals. */
(function () {
  'use strict';
  var S = window.SMA, $ = S.$, set = S.setText, ui = S.ui, SITE = 'lakeshore';

  function lakeshoreMember(id) { var m = S.MEMBERS[S.normMember(id)]; return m && m.lakeshore ? m : null; }

  function serviceFor(info, item) {
    if (item && item.service) return item.service;
    if (info.member.role === 'hero') {
      return info.kind === 'medical-pa' ? S.HERO.denial.service : 'Appeal of ' + S.HERO.umCase + ' (vedolizumab 300 mg IV)';
    }
    return '';
  }

  function medicalInfo(raw) {
    var info = S.parseId(raw);
    return info && (info.kind === 'medical-pa' || info.kind === 'medical-appeal') ? info : null;
  }

  // Letters posted so far for one submission.
  function lettersFor(info) {
    var tl = S.timeline(info), out = [];
    tl.history.forEach(function (h) {
      if (h.status === 'Information requested') out.push({ at: h.at, letter: S.HERO.rfi, info: info });
    });
    if (tl.determination && tl.determination.letterFile) {
      var last = tl.history[tl.history.length - 1];
      out.push({ at: last.at, letter: tl.determination, info: info });
    }
    return out;
  }

  // A denied case the appeal form can reference: the payer case number or a denied submission ID.
  function resolveDenied(raw) {
    var r = String(raw || '').trim().toUpperCase();
    if (!r) return { error: 'Enter the payer case number from the denial letter or the submission ID.' };
    if (r === S.HERO.umCase) {
      return { member: S.MEMBERS.LKS884210377, caseNumber: r, det: S.HERO.denial, service: S.HERO.denial.service };
    }
    var info = S.parseId(r);
    if (info && info.kind === 'medical-pa') {
      var tl = S.timeline(info);
      if (tl.status === 'Denied') {
        return { member: info.member, caseNumber: S.umCaseFor(info), det: tl.determination,
          service: serviceFor(info, ui.findItem(SITE, info.id)) };
      }
      return { error: 'Request ' + r + ' is not denied (status: ' + tl.status + '). Only denied requests can be appealed.' };
    }
    return { error: 'No denied case found for "' + raw + '". Enter the payer case number from the denial letter or the submission ID.' };
  }

  var pages = {
    index: S.loginPage(SITE, 'search.html'),
    reset: S.resetPage(SITE),

    search: function () {
      var last = S.session.get(SITE + '.search');
      if (last) { ui.fill('search-member-id', last.member); ui.fill('search-dob', last.dob); }
      $('search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var member = S.normMember(ui.val('search-member-id')), dob = S.normDob(ui.val('search-dob'));
        if (!member || !dob) return ui.err('search-error', 'Enter the member ID and date of birth.');
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return ui.err('search-error', 'Enter the date of birth as MM/DD/YYYY.');
        var m = lakeshoreMember(member);
        if (!m || m.dob !== dob) return ui.err('search-error', 'No member matches member ID ' + member + ' and that date of birth.');
        S.session.set(SITE + '.search', { member: member, dob: dob });
        window.location.href = 'eligibility.html';
      });
    },

    eligibility: function () {
      var q = S.session.get(SITE + '.search') || {}, m = lakeshoreMember(q.member);
      if (!m || m.dob !== q.dob) { S.show('elig-not-found', true); return; }
      var now = new Date(), active = m.status === 'Active';
      S.show('elig-card', true);
      set('elig-member-name', S.fullName(m));
      set('elig-reference', 'ELG-' + S.stamp(now) + '-' + m.id.slice(-4));
      set('elig-checked-at', S.localTime(now));
      ui.pill('elig-status', active ? 'Active' : 'Terminated', true);
      var detail = $('elig-status-detail');
      detail.textContent = active ? 'Coverage active since ' + m.effective : 'Coverage terminated ' + m.terminated;
      detail.className = 'alert ' + (active ? 'ok' : 'error');
      set('elig-member-id', m.id); set('elig-dob', m.dob); set('elig-plan', m.plan);
      set('elig-coverage-type', m.coverageType); set('elig-employer', m.employer); set('elig-group', m.group);
      set('elig-effective', m.effective); set('elig-end', m.terminated || 'None');
      set('elig-medical-benefit', active
        ? 'Active: drugs given in an office or infusion center need prior authorization under Lakeshore clinical policy'
        : 'Inactive: coverage terminated ' + m.terminated);
      set('elig-pharmacy-benefit', active ? 'Active: administered by ' + m.pbm : 'Inactive: coverage terminated ' + m.terminated);
      set('elig-pbm', m.pbm); set('elig-rx-bin', m.bin); set('elig-rx-pcn', m.pcn); set('elig-rx-group', m.rxGroup);
      set('elig-phones', 'Provider services (800) 555-0131; pharmacy help desk (800) 555-0136');
      $('elig-start-pa').hidden = !active;
      $('elig-start-pa').addEventListener('click', function () { S.session.set(SITE + '.prefill', { member: m.id }); });
    },

    'pa-new': function () {
      var d = S.store.draft(SITE), pre = S.session.get(SITE + '.prefill');
      ui.fill('pa-member-id', d.member || (pre && pre.member) || '');
      ui.fill('pa-prescriber-npi', d.npi); ui.fill('pa-hcpcs', d.hcpcs); ui.fill('pa-drug', d.drug);
      ui.fill('pa-dose', d.dose); ui.fill('pa-doses', d.doses); ui.fill('pa-site-of-care', d.site);
      ui.fill('pa-icd10', d.icd10); if (d.urgency) ui.fill('pa-urgency', d.urgency);
      if (d.scenario) ui.fill('pa-demo-scenario', d.scenario);
      $('pa-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = {
          member: S.normMember(ui.val('pa-member-id')), npi: ui.val('pa-prescriber-npi').replace(/\D/g, ''),
          hcpcs: ui.val('pa-hcpcs').toUpperCase(), drug: ui.val('pa-drug'), dose: ui.val('pa-dose'),
          doses: ui.val('pa-doses'), site: ui.val('pa-site-of-care'), icd10: ui.val('pa-icd10').toUpperCase(),
          urgency: ui.val('pa-urgency') || 'Standard', scenario: ui.val('pa-demo-scenario') || 'standard'
        };
        var labels = { member: 'member ID', npi: 'prescriber NPI', hcpcs: 'HCPCS', drug: 'drug', dose: 'dose',
          doses: 'number of doses', site: 'site of care', icd10: 'ICD-10' };
        var missing = Object.keys(labels).filter(function (k) { return !v[k]; }).map(function (k) { return labels[k]; });
        if (missing.length) return ui.err('pa-error', 'Complete every field. Missing: ' + missing.join(', ') + '.');
        var m = lakeshoreMember(v.member);
        if (!m) return ui.err('pa-error', 'Member ' + v.member + ' was not found. Check eligibility first.');
        if (m.status !== 'Active') return ui.err('pa-error', 'Coverage terminated ' + m.terminated + '. A prior authorization cannot be submitted for this member.');
        if (!/^\d{10}$/.test(v.npi)) return ui.err('pa-error', 'Prescriber NPI must be 10 digits.');
        if (!/^[A-Z]\d{4}$/.test(v.hcpcs)) return ui.err('pa-error', 'HCPCS code must look like J3380.');
        if (!/^[A-Z]\d{2}(\.[0-9A-Z]{1,4})?$/.test(v.icd10)) return ui.err('pa-error', 'ICD-10 code must look like K51.011.');
        if (!/^\d+$/.test(v.doses)) return ui.err('pa-error', 'Number of doses must be a whole number.');
        S.store.draft(SITE, v);
        window.location.href = 'pa-attach.html';
      });
    },

    'pa-attach': function () {
      var d = S.store.draft(SITE);
      if (!d.member) { window.location.replace('pa-new.html'); return; }
      set('pa-summary', 'Member ' + d.member + ' · ' + d.drug + ' ' + d.dose + ' × ' + d.doses + ' doses · HCPCS ' +
        d.hcpcs + ' · ICD-10 ' + d.icd10 + ' · ' + d.site + ' · ' + d.urgency);
      var files = [];
      $('pa-file').addEventListener('change', function (e) {
        files = Array.prototype.map.call(e.target.files, function (f) { return f.name; });
        set('pa-file-list', files.length ? 'Attached: ' + files.join(', ') : '');
      });
      $('pa-submit').addEventListener('click', function () {
        var letter = ui.val('pa-letter');
        if (!letter && !files.length) return ui.err('pa-attach-error', 'Paste the letter of medical necessity or upload it.');
        var now = new Date();
        var flags = (d.urgency === 'Expedited' ? 'E' : '') + (d.scenario === 'rfi' ? 'R' : '');
        var id = S.makeId('medical-pa', d.member, now, flags);
        var docs = ui.val('pa-attachment-list').split(/\n+/).filter(Boolean).concat(files);
        S.store.add(SITE, { id: id, member: d.member, service: d.drug + ' ' + d.dose + ', ' + d.hcpcs + ', ' + d.doses + ' doses',
          site: d.site, submittedAt: S.isoUtc(now), urgency: d.urgency, documents: docs, letterChars: letter.length });
        S.store.draft(SITE, null);
        window.location.href = 'pa-submitted.html?id=' + encodeURIComponent(id);
      });
    },

    'pa-submitted': function () {
      var info = S.parseId(S.qs('id'));
      if (!info || info.kind !== 'medical-pa') { set('submission-id', 'Unknown submission'); return; }
      var item = ui.findItem(SITE, info.id), clock = S.timeline(info).clock;
      set('submission-id', info.id);
      ui.pill('submission-status', 'Received');
      set('submitted-at', S.isoUtc(info.submittedAt));
      set('submitted-at-local', S.localTime(info.submittedAt));
      set('submission-case-number', S.umCaseFor(info));
      set('submission-member', S.fullName(info.member) + ' (' + info.member.id + ')');
      set('submission-service', serviceFor(info, item));
      set('submission-urgency', clock.urgency + ' (' + clock.hours + '-hour clock)');
      set('submission-due', S.localTime(clock.dueAt));
      $('submission-view-case').href = 'case.html?id=' + encodeURIComponent(info.id);
    },

    cases: function () {
      var tb = $('case-rows'), items = S.store.list(SITE);
      items.forEach(function (it, i) {
        var info = medicalInfo(it.id);
        if (!info) return;
        var st = document.createElement('span'), status = S.timeline(info).status;
        st.className = 'pill ' + status.replace(/\s+/g, '-'); st.textContent = status;
        ui.row(tb, 'case-row-' + (i + 1), [ui.link('case.html?id=' + encodeURIComponent(it.id), it.id, 'case-link-' + (i + 1)),
          S.fullName(info.member), it.service || '', S.localTime(info.submittedAt), st]);
      });
      S.show('case-empty', !tb.children.length);
      $('case-search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var raw = ui.val('case-search-id');
        if (!medicalInfo(raw)) return ui.err('case-search-error', 'No case found for "' + raw + '".');
        window.location.href = 'case.html?id=' + encodeURIComponent(raw.toUpperCase());
      });
    },

    case: function () {
      var raw = S.qs('id'), info = medicalInfo(raw);
      if (!info) { S.show('case-not-found', true); set('case-not-found-id', raw || '(none)'); return; }
      var tl = S.timeline(info), m = info.member, item = ui.findItem(SITE, info.id), d = tl.determination;
      S.show('case-card', true); S.show('case-history-card', true);
      set('case-submission-id', info.id);
      set('case-type', info.kind === 'medical-pa' ? 'Medical prior authorization' : 'Provider appeal');
      set('case-number', S.umCaseFor(info));
      ui.pill('case-status', tl.status, true);
      set('case-member', S.fullName(m)); set('case-member-id', m.id);
      set('case-service', ui.dash(serviceFor(info, item)));
      set('case-submitted-at', S.localTime(info.submittedAt) + ' (' + S.isoUtc(info.submittedAt) + ')');
      set('case-clock', tl.clock.urgency + ', ' + tl.clock.hours + ' h · ' + tl.clock.percent + '% elapsed · due ' + S.localTime(tl.clock.dueAt));
      set('case-checked-at', S.localTime(new Date()));
      if (tl.rfi) {
        S.show('case-rfi', true);
        set('case-payer-question', tl.rfi.question); set('case-info-due', tl.rfi.dueDate); set('case-info-date', tl.rfi.requestDate);
        $('case-rfi-letter-link').href = 'letters/' + tl.rfi.letterFile;
      }
      if (d) {
        S.show('case-determination', true);
        set('det-decision', d.detail || d.decision); set('det-date', d.decisionDate);
        set('det-auth-number', ui.dash(d.authNumber)); set('det-reference', ui.dash(d.referenceNumber));
        set('det-service', ui.dash(d.service || serviceFor(info, item))); set('det-site-of-care', ui.dash(d.siteOfCare));
        set('det-valid-from', ui.dash(d.validFrom)); set('det-valid-to', ui.dash(d.validTo));
        set('det-reason-category', ui.dash(d.reasonCategory)); set('det-reason', ui.dash(d.reason));
        set('det-policy', ui.dash(d.policyClause)); set('det-appeal-deadline', ui.dash(d.appealDeadline && d.appealDeadline + ' (' + d.appealWindow + ')'));
        set('det-peer-to-peer', ui.dash(d.peerToPeer)); set('det-reviewer', ui.dash(d.reviewer));
        set('det-letter-name', d.letterFile || 'No letter for this determination in the demo set');
        if (d.letterFile) $('det-letter-link').href = 'letters/' + d.letterFile; else $('det-letter-link').hidden = true;
        $('det-appeal-link').hidden = d.decision !== 'Denied';
        $('det-appeal-link').href = 'appeal.html?ref=' + encodeURIComponent(info.id);
      }
      ui.history('case-history', tl.history);
    },

    letters: function () {
      var tb = $('letters-rows'), seen = {}, rows = [];
      var ids = S.store.list(SITE).map(function (it) { return it.id; });
      var searched = S.qs('id');
      if (searched) { ids.unshift(searched.toUpperCase()); ui.fill('letters-search-id', searched); }
      ids.forEach(function (id) {
        var info = medicalInfo(id);
        if (!info || seen[info.id]) return;
        seen[info.id] = true;
        rows = rows.concat(lettersFor(info));
      });
      if (searched && !medicalInfo(searched)) ui.err('letters-search-error', 'No case found for "' + searched + '".');
      rows.forEach(function (r, i) {
        ui.row(tb, 'letter-row-' + (i + 1), [S.localTime(r.at), r.letter.letterTitle, r.letter.referenceNumber + ' (' + r.info.id + ')',
          S.fullName(r.info.member), ui.link('letters/' + r.letter.letterFile, 'Download PDF', 'letter-link-' + (i + 1), true)]);
      });
      S.show('letters-empty', !rows.length);
      $('letters-search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        window.location.href = 'letters.html?id=' + encodeURIComponent(ui.val('letters-search-id'));
      });
    },

    appeal: function () {
      var found = null;
      if (S.qs('ref')) ui.fill('appeal-reference', S.qs('ref'));
      $('appeal-find-form').addEventListener('submit', function (e) {
        e.preventDefault();
        found = resolveDenied(ui.val('appeal-reference'));
        if (found.error) { ui.err('appeal-error', found.error); S.show('appeal-details', false); return; }
        ui.err('appeal-error', '');
        S.show('appeal-details', true);
        set('appeal-case-summary', 'Denied case ' + found.caseNumber + ' · ' + S.fullName(found.member) + ' (' + found.member.id +
          ') · ' + found.service + ' · denied ' + found.det.decisionDate + ' · appeal by ' + ui.dash(found.det.appealDeadline));
      });
      $('appeal-submit').addEventListener('click', function () {
        if (!found || found.error) return ui.err('appeal-submit-error', 'Find the denied case first.');
        if (!ui.val('appeal-letter')) return ui.err('appeal-submit-error', 'Paste the appeal letter.');
        var now = new Date(), id = S.makeId('medical-appeal', found.member.id, now, '');
        S.store.add(SITE, { id: id, member: found.member.id, service: 'Appeal of ' + found.caseNumber + ' (' + found.service + ')',
          submittedAt: S.isoUtc(now), original: found.caseNumber, peerToPeer: !!ui.val('appeal-p2p') });
        window.location.href = 'appeal-submitted.html?id=' + encodeURIComponent(id);
      });
    },

    'appeal-submitted': function () {
      var info = S.parseId(S.qs('id'));
      if (!info || info.kind !== 'medical-appeal') { set('appeal-submission-id', 'Unknown appeal'); return; }
      var item = ui.findItem(SITE, info.id);
      set('appeal-submission-id', info.id);
      ui.pill('appeal-status', 'Appeal received');
      set('appeal-submitted-at', S.isoUtc(info.submittedAt));
      set('appeal-case-number', item ? item.original : S.umCaseFor(info));
      set('appeal-member', S.fullName(info.member) + ' (' + info.member.id + ')');
      $('appeal-view-case').href = 'case.html?id=' + encodeURIComponent(info.id);
    }
  };

  S.boot(pages);
})();
