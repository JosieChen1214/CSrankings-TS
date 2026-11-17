const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'research-topics.json'), 'utf8'));
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function setup() {
    const dom = new JSDOM(page, { url: 'https://example.test/', runScripts: 'outside-only' });
    const win = dom.window;
    win.fetch = async () => ({ ok: true, json: async () => structuredClone(dataset) });
    for (const module of ['region', 'research-topics']) {
        new vm.Script(fs.readFileSync(path.join(root, 'build/js', `${module}.js`), 'utf8'))
            .runInContext(dom.getInternalVMContext());
    }
    const countries = {}, abbreviations = {};
    for (const person of dataset.faculty) {
        countries[person.affiliation] = 'northamerica';
        abbreviations[person.affiliation] = 'us';
    }
    win.document.getElementById('regions').value = 'us';
    return { dom, win, api: win.CSRankings, countries, abbreviations };
}

test('curated identities match the upstream roster and aliases do not duplicate people', () => {
    const { dom, api } = setup();
    assert.equal(api.validateResearchTopics(dataset).length, 84);
    const Papa = require(path.join(root, 'js/papaparse.min.js'));
    const roster = new Map(Papa.parse(fs.readFileSync(path.join(root, 'csrankings.csv'), 'utf8'),
        { header: true, skipEmptyLines: true }).data.map(row => [row.name, row]));
    for (const person of dataset.faculty) {
        for (const name of person.csrankings_names) {
            assert.ok(roster.has(name), `Unknown original faculty identity: ${name}`);
            assert.equal(roster.get(name).affiliation, person.affiliation);
        }
    }
    assert.equal(api.filterResearchFaculty(dataset.faculty, 'all', 'Rose Yu').length, 1);
    for (const topic of ['ts', 'medts', 'bci']) {
        assert.ok(api.filterResearchFaculty(dataset.faculty, topic, '').length > 0);
    }
    dom.window.close();
});

test('topic and multiword search compose and an empty result is explicit', async () => {
    const { dom, win, api, countries, abbreviations } = setup();
    await api.loadResearchTopics();
    api.initResearchTopicDirectory(countries, abbreviations);
    const doc = win.document;
    const filter = doc.getElementById('research-topic-filter');
    filter.value = 'bci';
    filter.dispatchEvent(new win.Event('change'));
    assert.match(doc.getElementById('research-topic-status').textContent, /6 faculty at 3 schools/);
    const query = doc.getElementById('research-topic-query');
    query.value = 'carnegie EEG';
    query.dispatchEvent(new win.Event('input'));
    assert.match(doc.getElementById('research-topic-status').textContent, /1 faculty at 1 schools/);
    const results = doc.getElementById('research-topic-results');
    assert.match(results.textContent, /Bin He/);
    assert.doesNotMatch(results.textContent, /Byron Yu/);
    assert.match(results.textContent, /supplemental faculty/);
    const school = results.querySelector('details');
    school.open = true;
    api.renderResearchTopicDirectory(countries, abbreviations);
    assert.equal(results.querySelector('details').open, true);
    for (const link of results.querySelectorAll('a')) {
        assert.match(link.href, /^https:\/\//);
        assert.equal(link.target, '_blank');
        assert.match(link.rel, /noopener/);
    }
    query.value = 'nonexistent';
    query.dispatchEvent(new win.Event('input'));
    assert.match(results.textContent, /does not mean there are no researchers/);
    dom.window.close();
});

test('medical tags remain independent of general time series and BCI', async () => {
    const { dom, win, api, countries, abbreviations } = setup();
    await api.loadResearchTopics();
    api.initResearchTopicDirectory(countries, abbreviations);
    const filter = win.document.getElementById('research-topic-filter');
    filter.value = 'medts';
    filter.dispatchEvent(new win.Event('change'));
    assert.match(win.document.getElementById('research-topic-status').textContent, /61 faculty at 4 schools/);
    assert.doesNotMatch(win.document.getElementById('research-topic-results').textContent, /Bin He|Carmena/);
    assert.equal(api.facultyTopicBadges('unknown faculty'), '');
    assert.match(api.facultyTopicBadges('Yan Liu 0002'), /Medical time series/);
    assert.match(api.facultyTopicBadges('Qi Rose Yu'), /General time series/);
    assert.doesNotMatch(api.facultyTopicBadges('Jose M. Carmena'), /Medical time series/);
    assert.match(api.facultyTopicBadges('Catie Chang'), /Medical time series/);
    assert.doesNotMatch(api.facultyTopicBadges('Catie Chang'), /Brain-computer interfaces/);
    assert.ok(api.filterResearchFaculty(dataset.faculty, 'medts', 'EEG Vanderbilt').some(p => p.name === 'Catie Chang'));
    dom.window.close();
});

test('region filtering also applies to supplemental faculty', async () => {
    const { dom, win, api, countries, abbreviations } = setup();
    await api.loadResearchTopics();
    api.initResearchTopicDirectory(countries, abbreviations);
    assert.match(win.document.getElementById('research-topic-status').textContent, /84 faculty at 8 schools/);
    assert.match(win.document.getElementById('research-topic-status').textContent, /Coverage varies by institution/);
    win.document.getElementById('regions').value = 'ca';
    api.renderResearchTopicDirectory(countries, abbreviations);
    assert.match(win.document.getElementById('research-topic-status').textContent, /0 faculty/);
    win.document.getElementById('regions').value = 'world';
    api.renderResearchTopicDirectory(countries, abbreviations);
    assert.match(win.document.getElementById('research-topic-status').textContent, /84 faculty/);
    dom.window.close();
});

test('invalid evidence and duplicate identities are rejected', () => {
    const { dom, api } = setup();
    for (const corrupt of [
        data => { data.faculty[0].evidence[0].url = 'javascript:alert(1)'; },
        data => { data.faculty[0].evidence[0].topic = 'invented-topic'; },
        data => { data.faculty[0].evidence = []; },
        data => { const people = data.faculty.filter(p => p.csrankings_names.length); people[1].csrankings_names = people[0].csrankings_names; },
        data => { data.faculty[1].id = data.faculty[0].id; },
        data => { data.faculty[0].departments = [null]; },
        data => { data.faculty[0].appointment_note = 'Moved'; data.faculty[0].appointment_note_source = 'javascript:alert(1)'; }
    ]) {
        const data = structuredClone(dataset);
        corrupt(data);
        assert.throws(() => api.validateResearchTopics(data));
    }
    dom.window.close();
});

test('Vanderbilt audit and published directory agree; appointment changes stay visible', async () => {
    const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/institution-reviews/vanderbilt.json')));
    const faculty = dataset.faculty.filter(p => p.affiliation === 'Vanderbilt University');
    const confirmed = audit.faculty.filter(p => p.decision === 'verified_relevant');
    assert.equal(audit.faculty.length, audit.counts.people);
    assert.equal(new Set(audit.faculty.map(p => p.id)).size, audit.faculty.length);
    assert.equal(faculty.length, audit.counts.included);
    assert.deepEqual(confirmed.map(p => p.id).sort(), faculty.map(p => p.id).sort());
    for (const person of faculty) {
        const reviewed = confirmed.find(p => p.id === person.id);
        assert.deepEqual(person.evidence, reviewed.evidence);
        assert.ok(reviewed.memberships.length && reviewed.profile_urls.length);
    }
    assert.ok(!faculty.some(p => p.name === 'Thomas Beckers'));
    assert.equal(audit.faculty.find(p => p.name === 'Thomas Beckers').decision, 'historical_affiliation');
    assert.deepEqual(faculty.filter(p => p.evidence.some(e => e.topic === 'bci')).map(p => p.name).sort(),
        ['Daniel Gonzales', 'Richard Alan Peters, II', 'Thilo Womelsdorf']);
    const { dom, win, api, countries, abbreviations } = setup();
    await api.loadResearchTopics();
    api.initResearchTopicDirectory(countries, abbreviations);
    assert.ok(api.filterResearchFaculty(faculty, 'medts', 'Biostatistics').length >= 11);
    const result = win.document.getElementById('research-topic-results');
    assert.match(result.textContent, /December 31, 2026/);
    assert.ok(result.querySelector('.research-topic-appointment a').href.startsWith('https://www.vanderbilt.edu/'));
    dom.window.close();
});

test('portable review searches all decisions and keeps unresolved people discoverable', () => {
    const html = fs.readFileSync(path.join(root, 'vanderbilt-review.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'dangerously' });
    const { document: doc } = dom.window;
    assert.equal(doc.querySelectorAll('#results > details').length, 75);
    doc.getElementById('decision').value = 'all';
    doc.getElementById('decision').dispatchEvent(new dom.window.Event('change'));
    assert.equal(doc.querySelectorAll('#results > details').length, 627);
    doc.getElementById('query').value = 'Beckers';
    doc.getElementById('query').dispatchEvent(new dom.window.Event('input'));
    assert.match(doc.getElementById('results').textContent, /Moved institution/);
    assert.doesNotMatch(doc.getElementById('results').textContent, /Confirmed relevant/);
    dom.window.close();
});

test('network and malformed-data failures leave the ranking app usable', async () => {
    for (const failure of ['network', 'invalid-json-data']) {
        const { dom, win, api, countries, abbreviations } = setup();
        win.console.warn = () => {};
        win.fetch = async () => {
            if (failure === 'network') throw new Error('Offline');
            return { ok: true, json: async () => ({ faculty: [] }) };
        };
        await api.loadResearchTopics();
        api.initResearchTopicDirectory(countries, abbreviations);
        assert.match(win.document.getElementById('research-topic-status').textContent, /could not be loaded/);
        assert.ok(win.document.getElementById('success'));
        assert.equal(api.facultyTopicBadges('Eamonn J. Keogh'), '');
        dom.window.close();
    }
});
