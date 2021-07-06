// ==UserScript==
// @name           GitHub - list own PRs in a repository
// @description    A brief description of your script
// @namespace      http://arantius.com/misc/greasemonkey/
// @author         Sagi Dayan
// @match        https://github.com/*
// @version        1.0
// ==/UserScript==

// Update These
const GITHUB_AUTH = ''; // https://github.com/settings/tokens
const GITHUB_USERNAME = '';
//


let currentRepo = '';

// fetch my prs
async function getPRs() {
    const response = await fetch("https://api.github.com/graphql", {
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": `token ${GITHUB_AUTH}`
        },
        "body": "{\"query\":\"{\\n  user(login: \\\"" + GITHUB_USERNAME + "\\\") {\\n    pullRequests(first: 100, states: OPEN, baseRefName:\\\"master\\\") {\\n      totalCount\\n      nodes {\\n        createdAt\\n        number\\n        title\\n        mergeable\\n        url\\n        commits(last:1) {\\n          nodes {\\n            commit {\\n              statusCheckRollup{\\n                state\\n              }\\n            }\\n          }\\n        }\\n        baseRefName\\n        headRefName\\n        repository{\\n          nameWithOwner\\n        }\\n      }\\n      pageInfo {\\n        hasNextPage\\n        endCursor\\n      }\\n    }\\n  }\\n}\"}"
    });
    const payload = await response.json();
    const prs = payload.data.user.pullRequests.nodes.filter(pr => {
        return pr.repository.nameWithOwner === currentRepo;
    });

    const main = document.getElementsByTagName('main')[0];
    if (!main) return;
    prs.forEach(pr => {
        main.lastElementChild.insertBefore(createPrHTML(pr), main.lastElementChild.firstElementChild);
    });
}

setInterval(() => {
    const urlSplit = document.URL.split('/');
    if (urlSplit.length !== 5) return; // Not A base repo URL

    const location = urlSplit.slice(-2).join('/')
    if (location !== currentRepo) {
        currentRepo = location;
        getPRs();
    }
}, 1000);

function createPrHTML(pr) {
    const div = document.createElement('div');
    const prState = pr.commits.nodes[0].commit.statusCheckRollup.state;
    const prStateColor = prState === 'FAILURE' ? 'red' : (prState === 'SUCCESS' ? 'green' : 'yellow');

    div.className = "d-sm-flex Box mb-2 Box-body color-bg-secondary";
    div.innerHTML = `
<div class="d-flex flex-auto">
    <div class="flex-shrink-0 mb-2 mr-2" >
            <span title="Status" data-view-component="true" class="State" style="color:${prStateColor}">
    <svg height="16" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" version="1.1" width="16" aria-hidden="true"><path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg> ${prState}
    </span>
        </div>
        <p style="padding-top:5px">
        ${pr.title}
    </p>
    <div class="flex-auto"></div>
    <a class="btn ml-2 d-none d-md-block" href="${pr.url}">Open</a>
</div>
`;
    return div;
}