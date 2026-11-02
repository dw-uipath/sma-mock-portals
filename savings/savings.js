/* Vedolizumab Patient Savings Program enrollment site (synthetic). */
(function () {
  'use strict';
  var S = window.SMA, $ = S.$, set = S.setText, ui = S.ui, SITE = 'savings';

  var GOVERNMENT_BINS = { '999911': 'Silverline Medicare', '999921': 'Prairie State Medicaid' };
  var HERO_ENROLLMENT = 'VSP-26-40418';
  var REASONS = {
    government: { status: 'Not eligible: federal or state program coverage',
      detail: 'The program terms exclude anyone with Medicare, Medicaid, TRICARE, VA or any other federal or state health program coverage, even if they also have commercial insurance. The Harbor Patient Aid Foundation accepts any insurance type, including Medicare.' },
    'no-commercial': { status: 'Not eligible: no commercial insurance',
      detail: 'The program is for commercially insured patients. Check the Harbor Patient Aid Foundation.' },
    criteria: { status: 'Not eligible: program criteria not met',
      detail: 'The program is for US residents prescribed vedolizumab.' }
  };

  function enrollmentId(memberId) {
    if (memberId === 'LKS884210377') return HERO_ENROLLMENT;
    var n = S.hashNum('VSP' + memberId, 90000) + 10000;
    return 'VSP-26-' + (n === 40418 ? 40419 : n);
  }

  function notEligible(reason) {
    S.session.set(SITE + '.ne', reason);
    window.location.href = 'not-eligible.html';
  }

  var FIELDS = ['enroll-first', 'enroll-last', 'enroll-dob', 'enroll-address', 'enroll-city', 'enroll-state', 'enroll-zip',
    'enroll-phone', 'enroll-member-id', 'enroll-bin', 'enroll-pcn', 'enroll-group', 'enroll-npi', 'enroll-consent-date'];

  var pages = {
    index: S.loginPage(SITE, 'program.html'),
    reset: S.resetPage(SITE),

    program: function () {
      $('program-continue').addEventListener('click', function () {
        var c = document.querySelector('input[name="program"]:checked');
        if (!c) return ui.err('program-error', 'Choose a program.');
        S.store.draft(SITE, { program: c.value });
        window.location.href = c.value === 'vsp' ? 'eligibility.html' : 'foundation.html';
      });
    },

    eligibility: function () {
      var d = S.store.draft(SITE);
      if (d.program !== 'vsp') { window.location.replace('program.html'); return; }
      $('elig-continue').addEventListener('click', function () {
        var a = { resident: ui.val('elig-resident'), prescribed: ui.val('elig-prescribed'),
          commercial: ui.val('elig-commercial'), government: ui.val('elig-government') };
        if (!a.resident || !a.prescribed || !a.commercial || !a.government) return ui.err('elig-error', 'Answer every question.');
        d.eligibility = a;
        S.store.draft(SITE, d);
        if (a.government === 'Yes') return notEligible('government');
        if (a.commercial === 'No') return notEligible('no-commercial');
        if (a.resident === 'No' || a.prescribed === 'No') return notEligible('criteria');
        window.location.href = 'enroll.html';
      });
    },

    enroll: function () {
      var d = S.store.draft(SITE);
      if (!d.eligibility) { window.location.replace('program.html'); return; }
      $('enroll-submit').addEventListener('click', function () {
        ui.err('enroll-error', '');
        var v = {};
        FIELDS.forEach(function (id) { v[id] = ui.val(id); });
        if (FIELDS.some(function (id) { return !v[id]; })) return ui.err('enroll-error', 'Complete every field.');
        if (!$('enroll-consent').checked) return ui.err('enroll-error', 'Patient consent is required to enroll.');
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(S.normDob(v['enroll-consent-date']))) return ui.err('enroll-error', 'Enter the consent date as MM/DD/YYYY.');
        if (!/^\d{10}$/.test(v['enroll-npi'].replace(/\D/g, ''))) return ui.err('enroll-error', 'Prescriber NPI must be 10 digits.');
        var memberId = S.normMember(v['enroll-member-id']), m = S.MEMBERS[memberId];
        if (GOVERNMENT_BINS[v['enroll-bin']] || (m && m.government)) return notEligible('government');
        if (m && (m.dob !== S.normDob(v['enroll-dob']) || m.last.toLowerCase() !== v['enroll-last'].toLowerCase())) {
          return ui.err('enroll-error', 'The insurance details do not match the patient. Check the member ID, last name and date of birth.');
        }
        var id = enrollmentId(memberId);
        S.session.set(SITE + '.confirmation', { id: id, patient: v['enroll-first'] + ' ' + v['enroll-last'], member: memberId,
          consentDate: S.normDob(v['enroll-consent-date']), at: S.isoUtc(new Date()) });
        S.store.add(SITE, { id: id, member: memberId, at: S.isoUtc(new Date()) });
        S.store.draft(SITE, null);
        window.location.href = 'confirmation.html?id=' + encodeURIComponent(id);
      });
    },

    confirmation: function () {
      var id = S.qs('id'), c = S.session.get(SITE + '.confirmation') || {};
      set('conf-enrollment-id', id);
      ui.pill('conf-status', 'Enrolled');
      set('conf-patient', c.id === id ? c.patient : '—');
      set('conf-member-id', c.id === id ? c.member : '—');
      set('conf-effective', S.mdy(new Date()));
      set('conf-benefit', '$5 per pen fill or infusion; the program pays the rest up to $20,000 a year (synthetic)');
      set('conf-program-ids', '999902 / VSPCOPAY / VSP2026');
      set('conf-administrator', 'Bayline Patient Services, (888) 555-0148');
    },

    'not-eligible': function () {
      var r = REASONS[S.session.get(SITE + '.ne')] || REASONS.government;
      set('ne-status', r.status);
      set('ne-detail', r.detail);
    },

    foundation: function () { }
  };

  S.boot(pages);
})();
