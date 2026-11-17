/* Curated research evidence is independent of conference publication scores. */
namespace CSRankings {
    export const researchTopicLabels: { [key: string]: string } = {
        ts: "General time series",
        medts: "Medical time series",
        bci: "Brain-computer interfaces"
    };

    export interface TopicEvidence {
        topic: string;
        url: string;
        summary: string;
        kind: string;
        year?: number;
    }

    export interface TopicFaculty {
        id: string;
        name: string;
        affiliation: string;
        homepage: string;
        csrankings_names: string[];
        evidence: TopicEvidence[];
    }

    let topicFaculty: TopicFaculty[] = [];
    let topicsCheckedOn = "";
    let topicsLoadFailed = false;
    const topicsByName: { [name: string]: TopicFaculty } = Object.create(null);

    function validTopicURL(value: string): boolean {
        try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:";
        } catch (_) {
            return false;
        }
    }

    export function validateResearchTopics(data: any): TopicFaculty[] {
        if (data.schema_version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.checked_on)
            || !Array.isArray(data.faculty)) {
            throw new Error("Invalid research topic dataset");
        }
        const ids = new Set<string>();
        const names = new Set<string>();
        for (const person of data.faculty) {
            if (![person.id, person.name, person.affiliation, person.homepage].every(
                value => typeof value === "string" && value.trim().length > 0)
                || ids.has(person.id) || !validTopicURL(person.homepage)
                || !Array.isArray(person.csrankings_names)
                || !person.csrankings_names.every((name: any) => typeof name === "string" && name.trim())
                || !Array.isArray(person.evidence) || !person.evidence.length) {
                throw new Error("Invalid faculty record");
            }
            ids.add(person.id);
            for (const name of person.csrankings_names) {
                if (names.has(name)) throw new Error("Duplicate faculty identity");
                names.add(name);
            }
            for (const source of person.evidence) {
                if (!Object.prototype.hasOwnProperty.call(researchTopicLabels, source.topic)
                    || typeof source.url !== "string" || !validTopicURL(source.url)
                    || typeof source.summary !== "string" || !source.summary.trim()
                    || ["profile", "project", "paper"].indexOf(source.kind) < 0
                    || (source.kind === "paper" && (!Number.isInteger(source.year) || source.year < 1900))) {
                    throw new Error("Invalid topic evidence");
                }
            }
        }
        return data.faculty;
    }

    export async function loadResearchTopics(): Promise<void> {
        try {
            const response = await fetch("research-topics.json");
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            topicFaculty = validateResearchTopics(data);
            topicsCheckedOn = data.checked_on;
            for (const person of topicFaculty) {
                for (const name of person.csrankings_names) topicsByName[name] = person;
            }
            topicsLoadFailed = false;
        } catch (error) {
            topicsLoadFailed = true;
            console.warn("Research topic directory unavailable", error);
        }
    }

    function topicHTML(value: string): string {
        return value.replace(/[&<>"']/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[ch]!));
    }

    /* Badges are added only when a curated identity matches the original roster. */
    export function facultyTopicBadges(name: string): string {
        const person = topicsByName[name];
        if (!person) return "";
        return Array.from(new Set(person.evidence.map(source => source.topic))).map(topic => {
            const source = person.evidence.find(item => item.topic === topic)!;
            return `<a class="research-topic-badge topic-${topic}" href="${topicHTML(source.url)}" `
                + `target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" `
                + `title="${topicHTML(source.summary)}">${researchTopicLabels[topic]}</a>`;
        }).join(" ");
    }

    export function filterResearchFaculty(people: TopicFaculty[], topic: string, query: string): TopicFaculty[] {
        const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
        return people.filter(person => {
            if (topic !== "all" && !person.evidence.some(source => source.topic === topic)) return false;
            const haystack = [person.name, person.affiliation, ...person.csrankings_names,
                ...person.evidence.map(source => `${researchTopicLabels[source.topic]} ${source.summary}`)
            ].join(" ").toLocaleLowerCase();
            return words.every(word => haystack.includes(word));
        });
    }

    function topicLink(url: string, label: string): HTMLAnchorElement {
        const link = document.createElement("a");
        link.href = url;
        link.textContent = label;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        return link;
    }

    export function renderResearchTopicDirectory(
        countryInfo: { [key: string]: string }, countryAbbrv: { [key: string]: string }
    ): void {
        const results = document.getElementById("research-topic-results");
        const status = document.getElementById("research-topic-status");
        if (!results || !status) return;
        const expanded = new Set(Array.from(results.querySelectorAll("details[open]"),
            element => element.getAttribute("data-school")));
        results.replaceChildren();
        if (topicsLoadFailed) {
            status.textContent = "Faculty topic data could not be loaded. Reload the page to retry.";
            return;
        }
        const region = (document.getElementById("regions") as HTMLSelectElement).value;
        const topic = (document.getElementById("research-topic-filter") as HTMLSelectElement).value;
        const query = (document.getElementById("research-topic-query") as HTMLInputElement).value;
        const matches = filterResearchFaculty(topicFaculty, topic, query).filter(
            person => inRegion(person.affiliation, region, countryInfo, countryAbbrv)
        ).sort((a, b) => a.affiliation.localeCompare(b.affiliation) || a.name.localeCompare(b.name));
        const schools = new Map<string, TopicFaculty[]>();
        for (const person of matches) {
            if (!schools.has(person.affiliation)) schools.set(person.affiliation, []);
            schools.get(person.affiliation)!.push(person);
        }
        status.textContent = `${matches.length} faculty at ${schools.size} schools. Initial curated list; unlisted faculty are unreviewed. `
            + `evidence checked ${topicsCheckedOn}.`;
        if (!matches.length) {
            const empty = document.createElement("p");
            empty.textContent = "No curated matches for these filters. This does not mean there are no researchers in this area.";
            results.append(empty);
        }
        for (const [school, people] of schools) {
            const details = document.createElement("details");
            details.setAttribute("data-school", school);
            details.open = expanded.has(school);
            const summary = document.createElement("summary");
            summary.textContent = `${school} (${people.length})`;
            details.append(summary);
            const list = document.createElement("ul");
            for (const person of people) {
                const item = document.createElement("li");
                item.append(topicLink(person.homepage, person.name));
                if (!person.csrankings_names.length) {
                    const extra = document.createElement("span");
                    extra.className = "research-topic-extra";
                    extra.textContent = " · supplemental faculty";
                    item.append(extra);
                }
                const evidenceList = document.createElement("ul");
                for (const source of person.evidence) {
                    if (topic !== "all" && source.topic !== topic) continue;
                    const evidence = document.createElement("li");
                    const badge = document.createElement("span");
                    badge.className = `research-topic-badge topic-${source.topic}`;
                    badge.textContent = researchTopicLabels[source.topic];
                    const kind = source.kind === "paper" ? `Paper (${source.year})` : "Research page";
                    evidence.append(badge, " ", source.summary, " ", topicLink(source.url, kind));
                    evidenceList.append(evidence);
                }
                item.append(evidenceList);
                list.append(item);
            }
            details.append(list);
            results.append(details);
        }
    }

    export function initResearchTopicDirectory(
        countryInfo: { [key: string]: string }, countryAbbrv: { [key: string]: string }
    ): void {
        const render = () => renderResearchTopicDirectory(countryInfo, countryAbbrv);
        document.getElementById("research-topic-filter")?.addEventListener("change", render);
        document.getElementById("research-topic-query")?.addEventListener("input", render);
        render();
    }
}
