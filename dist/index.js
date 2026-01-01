var{writeFile:A,mkdir:L}=(()=>({}));var w=(t)=>{let e=process.env[t];if(!e)throw Error(`Environment variable ${t} is not set.`);return e},d=w("ACCESS_TOKEN"),f=w("GITHUB_ACTOR");var y=(t)=>new Promise((e)=>{setTimeout(e,t)}),b=async(t)=>{for(let e=0;e<6;e++){let o=await fetch(`https://api.github.com${t}`,{Authorization:`Bearer ${d}`,Accept:"application/vnd.github+json"});if(o.status===202){await y(2000);continue}if(!o.ok)return console.error(`Request to ${t} failed: ${o.status} ${o.statusText}`),null;return o.json()}return console.error(`GitHub API request failed after multiple attempts: ${t}`),null},p=(t)=>fetch("https://api.github.com/graphql",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${d}`},body:JSON.stringify({query:t})}).then((e)=>e.json());var v=async(t)=>{let e=1,o=[];while(!0){let n=await b(`/users/${t}/repos?per_page=100&page=${e}`);if(!n||n.length===0)break;if(o.push(...n.filter((i)=>!i.fork)),e++,n.length<100)break}return o},x=(t,e)=>b(`/repos/${t}/${e}/stats/contributors`),C=async(t)=>{let e=await v(t),o=0,n=0,i=await Promise.all(e.map(({name:c})=>x(t,c)));for(let c of i){if(!c)continue;let a=c.find((r)=>r.author?.login===t);if(!a)continue;for(let r of a.weeks)o+=r.a,n+=r.d}return{additions:o,deletions:n}};var E=`
{
  user(login: "${f}") {
    login
    name
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes {
        name
        stargazerCount
        languages(first: 10) {
          edges {
            size
            node {
              name
            }
          }
        }
      }
    }
	repositoriesContributedTo {
	  totalCount
	}
  }
}
`;async function T(){let t=await p(E);if(t.errors)throw Error(t.errors);let{repositories:e,login:o,name:n,repositoriesContributedTo:i}=t.data.user,c=e.nodes.reduce((s,g)=>s+g.stargazerCount,0),a=(await p(`
    query { viewer { contributionsCollection { contributionYears } } }
  `))?.data?.viewer?.contributionsCollection?.contributionYears||[],r=await p(`
    query {
      viewer {
        ${a.map((s)=>`
          year${s}: contributionsCollection(
            from: "${s}-01-01T00:00:00Z",
            to: "${s+1}-01-01T00:00:00Z"
          ) { contributionCalendar { totalContributions } }
        `).join(`
`)}
      }
    }
  `),m=Object.values(r?.data?.viewer||{}).reduce((s,g)=>s+(g?.contributionCalendar?.totalContributions||0),0),u={};for(let s of e.nodes)for(let g of s.languages?.edges||[]){let h=g.node.name;u[h]=(u[h]||0)+g.size}return{login:o,name:n,repoCount:e.totalCount+i.totalCount,stars:c,contributionsCount:m,languageStats:u,changedLines:await C(f)}}var S=()=>fetch("https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml").then((t)=>t.text()).then((t)=>{let e={};for(let o of t.split(/\n(?=\S)/g)){let n=/^(\S.*?):/.exec(o),i=/color:\s*"(#\w{6}|\w+)"/.exec(o);if(n&&i)e[n[1].toLowerCase()]=i[1]}return e});var $=(t,e)=>A(`generated/${t}.svg`,e({languages:`<svg id="gh-dark-mode-only" width="360" height="210" xmlns="http://www.w3.org/2000/svg">
<style>
svg {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
  font-size: 14px;
  line-height: 21px;
}

#background {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  fill: white;
  stroke: rgb(225, 228, 232);
  stroke-width: 1px;
  rx: 6px;
  ry: 6px;
}

#gh-dark-mode-only:target #background {
  fill: #0d1117;
  stroke-width: 0.5px;
}

foreignObject {
  width: calc(100% - 10px - 32px);
  height: calc(100% - 10px - 24px);
}

h2 {
  margin-top: 0;
  margin-bottom: 0.75em;
  line-height: 24px;
  font-size: 16px;
  font-weight: 600;
  color: rgb(36, 41, 46);
  fill: rgb(36, 41, 46);
}

#gh-dark-mode-only:target h2 {
  color: #c9d1d9;
  fill: #c9d1d9;
}

ul {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
  margin-bottom: 0;
}

li {
  display: inline-flex;
  font-size: 12px;
  margin-right: 2ch;
  align-items: center;
  flex-wrap: nowrap;
  transform: translateX(-500%);
  animation: slideIn 2s ease-in-out forwards;
}

@keyframes slideIn {
  to {
    transform: translateX(0);
  }
}

div.ellipsis {
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.octicon {
  fill: rgb(88, 96, 105);
  margin-right: 0.5ch;
  vertical-align: top;
}

#gh-dark-mode-only:target .octicon {
  color: #8b949e;
  fill: #8b949e;
}

.progress {
  display: flex;
  height: 8px;
  overflow: hidden;
  background-color: rgb(225, 228, 232);
  border-radius: 6px;
  outline: 1px solid transparent;
  margin-bottom: 1em;
}

#gh-dark-mode-only:target .progress {
  background-color: rgba(110, 118, 129, 0.4);
}

.progress-item {
  outline: 2px solid rgb(225, 228, 232);
  border-collapse: collapse;
}

#gh-dark-mode-only:target .progress-item {
  outline: 2px solid #393f47;
}

.lang {
  font-weight: 600;
  margin-right: 4px;
  color: rgb(36, 41, 46);
}

#gh-dark-mode-only:target .lang {
  color: #c9d1d9;
}

.percent {
  color: rgb(88, 96, 105)
}

#gh-dark-mode-only:target .percent {
  color: #8b949e;
}
</style>
<g>
<rect x="5" y="5" id="background" />
<g>
<foreignObject x="21" y="17" width="318" height="176">
<div xmlns="http://www.w3.org/1999/xhtml" class="ellipsis">

<h2>Languages Used (By File Size)</h2>

<div>
<span class="progress">
{{ progress }}
</span>
</div>

<ul>

{{ lang_list }}

</ul>

</div>
</foreignObject>
</g>
</g>
</svg>
`,overview:`<svg id="gh-dark-mode-only" width="360" height="210" xmlns="http://www.w3.org/2000/svg">
<style>
svg {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
  font-size: 14px;
  line-height: 21px;
}

#background {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  fill: white;
  stroke: rgb(225, 228, 232);
  stroke-width: 1px;
  rx: 6px;
  ry: 6px;
}

#gh-dark-mode-only:target #background {
  fill: #0d1117;
  stroke-width: 0.5px;
}

foreignObject {
  width: calc(100% - 10px - 32px);
  height: calc(100% - 10px - 32px);
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

th {
  padding: 0.5em;
  padding-top: 0;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: rgb(3, 102, 214);
}

#gh-dark-mode-only:target th {
  color: #58a6ff;
}

td {
  margin-bottom: 16px;
  margin-top: 8px;
  padding: 0.25em;
  font-size: 12px;
  line-height: 18px;
  color: rgb(88, 96, 105);
}

#gh-dark-mode-only:target td {
  color: #c9d1d9;
}

tr {
  transform: translateX(-200%);
  animation: slideIn 2s ease-in-out forwards;
}

.octicon {
  fill: rgb(88, 96, 105);
  margin-right: 1ch;
  vertical-align: top;
}

#gh-dark-mode-only:target .octicon {
  fill: #8b949e;
}

@keyframes slideIn {
  to {
    transform: translateX(0);
  }
}
</style>
<g>
<rect x="5" y="5" id="background" />
<g>
<foreignObject x="21" y="21" width="318" height="168">
<div xmlns="http://www.w3.org/1999/xhtml">

<table>
<thead><tr style="transform: translateX(0);">
<th colspan="2">{{ name }}'s GitHub Statistics</th>
</tr></thead>
<tbody>

<tr><td><svg class="octicon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16"><path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z"></path></svg>Stars</td><td>{{ stars }}</td></tr>

<tr style="animation-delay: 300ms"><td><svg class="octicon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M1 2.5A2.5 2.5 0 013.5 0h8.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V1.5h-8a1 1 0 00-1 1v6.708A2.492 2.492 0 013.5 9h3.25a.75.75 0 010 1.5H3.5a1 1 0 100 2h5.75a.75.75 0 010 1.5H3.5A2.5 2.5 0 011 11.5v-9zm13.23 7.79a.75.75 0 001.06-1.06l-2.505-2.505a.75.75 0 00-1.06 0L9.22 9.229a.75.75 0 001.06 1.061l1.225-1.224v6.184a.75.75 0 001.5 0V9.066l1.224 1.224z"></path></svg>All-time contributions</td><td>{{ contributions }}</td></tr>

<tr style="animation-delay: 450ms"><td><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8.75 1.75a.75.75 0 00-1.5 0V5H4a.75.75 0 000 1.5h3.25v3.25a.75.75 0 001.5 0V6.5H12A.75.75 0 0012 5H8.75V1.75zM4 13a.75.75 0 000 1.5h8a.75.75 0 100-1.5H4z"></path></svg>Lines of code changed</td><td>{{ lines_changed }}</td></tr>

<tr style="animation-delay: 750ms"><td><svg class="octicon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"></path></svg>Repositories with contributions</td><td>{{ repos }}</td></tr>

</tbody>
</table>

</div>
</foreignObject>
</g>
</g>
</svg>
`}[t]),"utf8"),l=await T();await L("generated",{recursive:!0});var k=await S();await Promise.all([$("overview",(t)=>t.replace(/{{ name }}/g,l.login).replace(/{{ stars }}/g,l.stars.toString()).replace(/{{ contributions }}/g,l.contributionsCount.toString()).replace(/{{ lines_changed }}/g,`+${l.changedLines.additions} / -${l.changedLines.deletions}`).replace(/{{ repos }}/g,l.repoCount.toString())),$("languages",(t)=>{let e="",o="",n=Object.values(l.languageStats).reduce((a,r)=>a+r,0),i=Object.entries(l.languageStats).sort((a,r)=>r[1]-a[1]),c=150;return i.forEach(([a,r],m)=>{let u=k[a.toLowerCase()]||"#000000",s=r/n*100;e+=`
<span style="background-color: ${u};
width: ${s.toFixed(3)}%;" 
class="progress-item"></span>`,o+=`
<li style="animation-delay: ${m*c}ms;">
<svg xmlns="http://www.w3.org/2000/svg" class="octicon" style="fill:${u};"
viewBox="0 0 16 16" width="16" height="16">
<path fill-rule="evenodd"
d="M8 4a4 4 0 100 8 4 4 0 000-8z"></path>
</svg>
<span class="lang">${a}</span>
<span class="percent">${s.toFixed(2)}%</span>
</li>
`}),t.replace(/{{ progress }}/g,e).replace(/{{ lang_list }}/g,o)})]);
