# Time series, medical time series and BCI faculty

The fork adds a curated faculty directory and evidence links alongside the original publication rankings. It includes three independent, potentially overlapping topics:

| Key | Meaning |
| --- | --- |
| `ts` | General time-series methods, mining, forecasting and spatiotemporal learning |
| `medts` | Clinical time series, longitudinal clinical data and physiological signals |
| `bci` | Brain-computer / brain-machine interfaces and neural decoding for interfaces |

The initial dataset covers **10 people at 8 US institutions**. It is a seed list, not a complete survey or a topic-specific publication ranking. Do not infer specialization from a conference category, or infer BCI work from an EEG paper without interface evidence. Historical publications establish research involvement; they do not establish current recruiting, recent focus or continuing availability.

## Coverage gaps and the next collection pass

Catie Chang is a concrete example of a topic-label omission: she is already in `csrankings.csv`, and this snapshot has publication records for NeurIPS 2024, ICLR 2025 and ICSE 2025, but she was absent from the initial nine-person topic list. Her [research page](https://www.cchanglab.net/research) and [NeuroBOLT paper](https://proceedings.neurips.cc/paper_files/paper/2024/hash/29c294ddc628c94cd2c636383ef106c1-Abstract-Conference.html) support medical time-series / physiological signal research. They do not, by themselves, establish brain-computer interface work. She is now tagged `medts`.

The following is a collection roadmap, not an implemented automated crawler:

1. Build a candidate roster institution by institution using official CS, ECE, BME, biomedical informatics, neuroscience and medical-school directories. Keep CSRankings as one discovery input and an identity/publication join; it must not be the gate for inclusion.
2. Discover topic papers across journals and conferences using [OpenAlex](https://help.openalex.org/data/works/) and [PubMed](https://www.nlm.nih.gov/dataguide/eutilities/what_is_eutilities.html). Include physiological signals and brain dynamics in query variants, rather than requiring the literal phrase "time series". Retrieve recent papers separately from historical evidence. Keep DOI/PMID/ORCID where available and verify current appointments against official pages.
3. Store review state explicitly in a future candidate table: unreviewed, needs evidence, verified relevant, or reviewed outside the defined scope. Unlisted and untagged faculty must never imply a negative finding. Automated topic matches are candidates until checked against the paper and faculty identity.
4. Record collection coverage per school and department: which official directories were reviewed, when, how many roster identities were resolved, and how many remain unreviewed. A raw CSRankings row count is not a unique-person denominator because aliases exist.
5. Use known relevant cases such as Catie Chang as recall checks before each release. Distinguish people missing from the upstream roster, people hidden by year/conference filters, and people missing only from the curated topic labels. Track tag precision separately from candidate recall.

No source is presumed exhaustive. The directory currently contains verified seed entries only, so the interface explicitly labels unlisted faculty as unreviewed.

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
