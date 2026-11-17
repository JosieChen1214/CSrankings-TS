# Time series, medical time series and BCI faculty

The fork adds a curated faculty directory and evidence links alongside the original publication rankings. It includes three independent, potentially overlapping topics:

| Key | Meaning |
| --- | --- |
| `ts` | General time-series methods, mining, forecasting and spatiotemporal learning |
| `medts` | Clinical time series, longitudinal clinical data and physiological signals |
| `bci` | Brain-computer / brain-machine interfaces and neural decoding for interfaces |

The dataset contains **84 people at 8 US institutions**. Vanderbilt has a documented roster screening pass; other schools remain seed coverage. Historical publications establish research involvement, not current recruiting or primary specialization. EEG alone does not imply BCI. Medical time series includes clinical longitudinal methods and basic physiological/neural signals, not only patient forecasting.

## Vanderbilt review (2026-11-17)

The [searchable per-person review](../vanderbilt-review.html) and [public decision ledger](../data/institution-reviews/vanderbilt.json) cover **627 deduplicated people** from eight official directories: CS / Connected Computing, ECE, BME, biomedical informatics, biostatistics, psychological sciences, Brain Institute and Imaging Science. An existing CSRankings roster cross-check adds missing candidates and resolves aliases. Clinical/neuroscience faculty are covered through these directories, not through a census of every Vanderbilt/VUMC department. Source-specific counts overlap because of cross-appointments.

**75 people are confirmed relevant**: 18 general time series, 57 medical time series, and 3 BCI (topics overlap). Of these, 46 are supplemental to the existing CSRankings roster. The audit also retains 378 screened people with no verified match, 147 with insufficient public evidence, 26 emeritus-only listings and 1 moved faculty member. A screened non-match is not a claim that a person has no relevant publications. The unresolved entries require further evidence; this release does not claim exhaustive recall.

Positive decisions use explicit profile/project descriptions or authored papers. Some support a research direction and others a specific coauthored work; evidence summaries state which. All included people have a current official roster/profile source, with exceptions and appointment changes recorded. Thomas Beckers is excluded from the current Vanderbilt topic directory because his official Ulm profile dates the Vanderbilt assistant professorship through August 2026. Keivan Stassun is included as of the review date with the university's announced December 31, 2026 departure shown beside his entry.

Catie Chang was already in the upstream roster but missing from the initial topic list. She is tagged medical time series using her lab research and NeuroBOLT. The BCI entries require specific interface evidence: Daniel Gonzales, Richard Alan Peters II and Thilo Womelsdorf. EMG prosthetic control and neural recording alone do not receive BCI tags.

The ledger stores a decision, explanation, directory memberships, profile URLs and positive topic evidence for each person. It republishes professional research information only. Rebuild the portable review after editing the ledger:

```sh
node util/render-institution-review.cjs
```

For subsequent institution passes, start from official cross-disciplinary rosters, resolve aliases and appointments, inspect explicit research/paper sources, retain unresolved candidates and publish per-source coverage. CSRankings provides identity and publication joins; it is not an eligibility gate for the topic directory.

## Browsing

Use the **Time series & BCI faculty** panel above the ranking table. Choose a topic, enter a school/name/keyword, then expand a school to inspect faculty and evidence. The directory follows the existing country/region control. Year and conference controls affect the original publication ranking; they do not filter the curated directory. A missing result means no curated entry matches, rather than that no relevant faculty exist.

Expanding an institution in the original ranking table also shows topic badges for matched roster identities. Each badge links directly to its supporting evidence. Publication counts and geometric-mean scores continue to measure the original selected conference areas and must not be relabeled as time-series output.

Byron Yu and Bin He are included as supplemental faculty because they were absent from this upstream roster snapshot. They appear in the curated directory only; this does not add publication records to the original ranking.

## Updating the data

Edit `research-topics.json`. Each person has:

- A stable `id`, display `name`, exact institution `affiliation` and official `homepage`.
- `csrankings_names`: exact roster identities, including DBLP suffixes. Multiple aliases map to one person. An empty array denotes supplemental faculty.
- Optional `departments` and `appointment` show source-listed affiliations and roles. Appointment changes use `appointment_note` plus `appointment_note_source`; these metadata are searchable and source linked.
- At least one `evidence` record per assigned topic. Each contains `topic`, a primary-source `url`, a short paraphrased `summary`, and `kind` (`profile`, `project`, `paper`). Papers also require the source publication/preprint `year`; label preprints in the summary.

Use official faculty/lab pages, university project pages or papers. Verify both identity and affiliation. Preserve DBLP suffixes, e.g. `Yan Liu 0002` and `Jimeng Sun 0001`. Keep the directory deduplicated even if the original roster has aliases such as `Rose Yu` / `Qi Rose Yu`. Set `checked_on` to the actual evidence review date after reviewing the complete dataset; it is not a publication date. When adding countries, make sure institution names match `institutions.csv` so existing region filtering works.

## Build and validation

```sh
tsc --project tsconfig.json
python3 util/concat-js.py
```

The default page uses `csrankings.js`. If switching it to the minified bundle, regenerate `csrankings.min.js` with the existing Make target.

DOM tests use Node.js and jsdom. Install test tools outside tracked source files, then run:

```sh
npm install --prefix ../topic-tooling typescript@6.0.3 jsdom@26
node ../topic-tooling/node_modules/typescript/bin/tsc --project tsconfig.json
python3 util/concat-js.py
NODE_PATH=../topic-tooling/node_modules node --test test/research-topics.test.cjs
python3 -m http.server 8000
```

The tests check exact roster joins, deduplication, topic and keyword filtering, school expansion preservation, region filtering, evidence links, rejection of invalid data and graceful load failure.
