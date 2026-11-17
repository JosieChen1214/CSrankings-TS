/* Render a portable, searchable review from the public decision ledger. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/institution-reviews/vanderbilt.json'),'utf8'));
const embedded=JSON.stringify(data).replace(/</g,'\\u003c');
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vanderbilt faculty topic review</title>
<style>
:root{font:16px/1.6 system-ui,sans-serif;color:#173044;background:#f3f6fa}body{max-width:1120px;margin:36px auto;padding:0 20px}a{color:#1465a6}h1{line-height:1.2;margin-bottom:8px}h2{font-size:21px}.intro{color:#42596d}.cards{display:flex;flex-wrap:wrap;gap:12px}.card{flex:1 1 160px;background:white;border:1px solid #d1dfeb;border-radius:10px;padding:14px}.card strong{font-size:26px;display:block}.controls{position:sticky;top:0;background:#f3f6fa;padding:12px 0;display:flex;gap:12px;flex-wrap:wrap;z-index:1}.controls label{flex:1 1 180px}input,select{display:block;box-sizing:border-box;width:100%;font:inherit;padding:9px;border:1px solid #a6bbcb;border-radius:5px;background:white}details{background:white;border:1px solid #d1dfeb;border-radius:8px;margin:10px 0;padding:12px 16px}summary{cursor:pointer}summary span{font-size:13px;color:#496173;display:block}.tag{display:inline-block;font-size:12px;padding:2px 7px;margin-right:5px;border-radius:5px;background:#e0edf8}.medts{background:#dff2e9}.bci{background:#efe4fa}.muted{font-size:14px;color:#4c6375}.note{background:#fff1d5;padding:9px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;border-bottom:1px solid #d1dfeb;padding:8px}ul{padding-left:22px}#results>details[open]{border-color:#6e9ec1}:focus-visible{outline:3px solid #2879b4;outline-offset:3px}@media(max-width:600px){body{margin-top:20px}.controls{position:static}h1{font-size:28px}}
</style></head><body>
<a href="index.html#/index?all&us">← Faculty topic directory</a>
<h1>Vanderbilt faculty topic review</h1><p class="intro">逐人筛查记录 · Reviewed <span id="date"></span> · <a href="data/institution-reviews/vanderbilt.json">Decision ledger (JSON)</a></p>
<div class="cards" id="counts"></div>
<p><strong>Scope / 范围：</strong>CS / Connected Computing、ECE、BME、Biomedical Informatics、Biostatistics、Psychological Sciences、Brain Institute、Imaging Science 八份官方教师目录，并与 CSRankings 名单交叉检查。院系有交叉任职，人数不相加。</p>
<p>已完成这些名单的筛查；这不代表已穷尽 Vanderbilt / VUMC 所有院系或每位老师的全部论文。<strong>“未确认符合”与“证据不足”都不等于没有相关研究。</strong>收录证据可能来自合著论文，不代表当前主攻方向或招生情况。医学时序采用较宽范围，包含临床纵向方法、生理信号和基础神经信号研究。</p>
<details><summary>Criteria &amp; directory coverage / 判断标准与来源覆盖</summary><ul id="criteria"></ul><table><thead><tr><th>Official directory</th><th>Unique people in source</th></tr></thead><tbody id="sources"></tbody></table><p class="muted" id="method"></p></details>
<div class="controls"><label>Search name, department or evidence / 搜索<input id="query" type="search" placeholder="e.g. Catie Chang, EEG, Biostatistics"></label><label>Review decision / 状态<select id="decision"><option value="verified_relevant">Confirmed relevant / 已确认符合</option><option value="all">All reviewed people / 全部人员</option></select></label><label>Topic / 方向<select id="topic"><option value="all">All topics</option><option value="ts">General time series</option><option value="medts">Medical time series</option><option value="bci">Brain-computer interfaces</option></select></label></div>
<p id="status" role="status" aria-live="polite"></p><div id="results"></div><noscript>Enable JavaScript to search the review. The JSON ledger is also available above.</noscript>
<script type="application/json" id="review-data">${embedded}</script>
<script>
'use strict';
const data=JSON.parse(document.getElementById('review-data').textContent),$=id=>document.getElementById(id);
const labels={ts:'General time series',medts:'Medical time series',bci:'Brain-computer interfaces'};
function el(tag,text,cls){const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x;}
function link(url,text){const x=el('a',text);x.href=url;x.target='_blank';x.rel='noopener noreferrer';return x;}
$('date').textContent=data.checked_on;
for(const [n,label] of [[data.counts.people,'People screened'],[data.counts.included,'Confirmed relevant'],[data.counts.by_topic.ts,'General time series'],[data.counts.by_topic.medts,'Medical time series'],[data.counts.by_topic.bci,'BCI']]){const x=el('div',null,'card');x.append(el('strong',String(n)),label);$('counts').append(x);}
for(const [key,text]of Object.entries(data.criteria))$('criteria').append(el('li',labels[key]+': '+text));
for(const s of data.sources){const tr=el('tr'),td=el('td');td.append(link(s.url,s.name));tr.append(td,el('td',String(s.unique_people)));$('sources').append(tr);}
$('method').textContent=data.method;
for(const [key,label]of Object.entries(data.status_labels)){if(key==='verified_relevant')continue;const o=el('option',label+' ('+data.counts.by_decision[key]+')');o.value=key;$('decision').append(o);}
function render(){const words=$('query').value.toLowerCase().trim().split(/\\s+/).filter(Boolean),decision=$('decision').value,topic=$('topic').value;
const rows=data.faculty.filter(p=>(decision==='all'||p.decision===decision)&&(topic==='all'||p.topics.includes(topic))&&words.every(w=>[p.name,...p.departments,p.appointment,p.reason,...p.evidence.map(e=>e.summary)].join(' ').toLowerCase().includes(w)));
$('status').textContent=rows.length+' people shown. Topic counts overlap. '+data.counts.by_decision.insufficient_public_evidence+' people have insufficient public evidence; '+data.counts.by_decision.screened_no_verified_match+' were screened without a verified match.';
$('results').replaceChildren();for(const p of rows){const d=el('details'),s=el('summary');s.append(el('strong',p.name),el('span',p.departments.join(' · ')||'CSRankings cross-check; department not resolved'));d.append(s);
const state=el('p',data.status_labels[p.decision],'muted');for(const topic of p.topics)state.append(' ',el('span',labels[topic],'tag '+topic));d.append(state,el('p',p.appointment,'muted'),el('p',p.reason));
if(p.appointment_note){const note=el('p',p.appointment_note,'note');note.append(' ',link(p.appointment_note_source,'Appointment source'));d.append(note);}if(p.appointment_source)d.append(link(p.appointment_source,'Current appointment source'));
if(p.evidence.length){const ul=el('ul');for(const e of p.evidence){const li=el('li');li.append(el('span',labels[e.topic],'tag '+e.topic),' '+e.summary+' ',link(e.url,e.kind==='paper'?'Paper ('+e.year+')':'Research / project source'));ul.append(li);}d.append(ul);}
const sources=el('p','Profile sources: ','muted');p.profile_urls.forEach((url,i)=>sources.append(link(url,String(i+1)),' '));d.append(sources);
const dirs=el('p','Roster sources: ','muted');const seen=new Set();for(const m of p.memberships){if(seen.has(m.directory_url))continue;seen.add(m.directory_url);dirs.append(link(m.directory_url,m.department),' ');}d.append(dirs);$('results').append(d);}}
for(const id of ['query','decision','topic'])$(id).addEventListener(id==='query'?'input':'change',render);render();
</script></body></html>`;
fs.writeFileSync(path.join(root,'vanderbilt-review.html'),html);
console.log('Rendered Vanderbilt review:',Buffer.byteLength(html),'bytes');
