# Time series, medical time series and BCI faculty

The fork adds a curated faculty directory and evidence links alongside the original publication rankings. It includes three independent, potentially overlapping topics:

| Key | Meaning |
| --- | --- |
| `ts` | General time-series methods, mining, forecasting and spatiotemporal learning |
| `medts` | Clinical time series, longitudinal clinical data and physiological signals |
| `bci` | Brain-computer / brain-machine interfaces and neural decoding for interfaces |

The initial dataset covers **9 people at 7 US institutions**. It is a seed list, not a complete survey or a topic-specific publication ranking. Do not infer specialization from a conference category, or infer BCI work from an EEG paper without interface evidence. Historical publications establish research involvement; they do not establish current recruiting, recent focus or continuing availability.

## Browsing

Use the **Time series & BCI faculty** panel above the ranking table. Choose a topic, enter a school/name/keyword, then expand a school to inspect faculty and evidence. The directory follows the existing country/region control. Year and conference controls affect the original publication ranking; they do not filter the curated directory. A missing result means no curated entry matches, rather than that no relevant faculty exist.

Expanding an institution in the original ranking table also shows topic badges for matched roster identities. Each badge links directly to its supporting evidence. Publication counts and geometric-mean scores continue to measure the original selected conference areas and must not be relabeled as time-series output.

Byron Yu and Bin He are included as supplemental faculty because they were absent from this upstream roster snapshot. They appear in the curated directory only; this does not add publication records to the original ranking.

## Updating the data

Edit `research-topics.json`. Each person has:

- A stable `id`, display `name`, exact institution `affiliation` and official `homepage`.
- `csrankings_names`: exact roster identities, including DBLP suffixes. Multiple aliases map to one person. An empty array denotes supplemental faculty.
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
