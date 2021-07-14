// ==UserScript==
// @name           GitHub - list own PRs in a repository
// @description    List Your own (open) PRs in a repo with CI state for easy navigation
// @namespace      https://git.sagidayan.com/sagi/greasemonkey-scripts
// @author         Sagi Dayan
// @match        https://github.com/*
// @version        1.0
// ==/UserScript==

(function () {
    // Update These
    const GITHUB_AUTH = '';
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
            "body": "{\"query\":\"{\\n  user(login: \\\"" + GITHUB_USERNAME + "\\\") {\\n    pullRequests(first: 100, states: OPEN, baseRefName:\\\"master\\\") {\\n      totalCount\\n      nodes {\\n        createdAt\\n        number\\n        title\\n        mergeable\\n        url\\n        labels(first: 10){\\n          nodes{\\n            color\\n            description\\n            name\\n            \\n          }\\n        }\\n        commits(last:1) {\\n          nodes {\\n            commit {\\n              statusCheckRollup{\\n                state\\n              }\\n            }\\n          }\\n        }\\n        baseRefName\\n        headRefName\\n        repository{\\n          nameWithOwner\\n        }\\n      }\\n      pageInfo {\\n        hasNextPage\\n        endCursor\\n      }\\n    }\\n  }\\n}\"}"
        });
        const payload = await response.json();
        const prs = payload.data.user.pullRequests.nodes.filter(pr => {
            return pr.repository.nameWithOwner === currentRepo;
        });

        const main = document.getElementsByTagName('main')[0];
        if (!main) return;
        prs.forEach(pr => {
            // Check if element Exists - if it does, remove and add updated one.
            const prItem = document.getElementById(generatePrItemId(pr.number));
            if (prItem) {
                console.log('Item Found', prItem.id);
                main.removeChild(prItem);
            }
            main.lastElementChild.insertBefore(createPrHTML(pr), main.lastElementChild.firstElementChild);
        });
    }

    setInterval(() => {
        const urlSplit = document.URL.split('/');
        if (urlSplit.length !== 5) {
            currentRepo = '';
            return; // Not A base repo URL
        }

        const location = urlSplit.slice(-2).join('/')
        if (location !== currentRepo) {
            currentRepo = location;
            getPRs();
        }
    }, 1000);

    function createPrHTML(pr) {
        const div = document.createElement('div');
        const prState = pr.commits.nodes[0].commit.statusCheckRollup?.state || '';
        const prStateColor = prState === 'FAILURE' ? 'red' : (prState === 'SUCCESS' ? 'green' : 'yellow');
        div.id = generatePrItemId(pr.number);
        div.onclick = () => {
            window.open(pr.url, '_blank');
        }
        div.className = "btn d-sm-flex Box mb-2 Box-body color-bg-secondary";
        const lblElements = pr.labels.nodes.reduce((elements, lbl) => {
            const colors = HexToRgbHsl(lbl.color);
            return `${elements}
            <a title="${pr.description}" data-name="${lbl.name}" style="--label-r:${colors.r};--label-g:${colors.g};--label-b:${colors.b};--label-h:${colors.h};--label-s:${colors.s};--label-l:${colors.l};" data-view-component="true" class="IssueLabel hx_IssueLabel width-fit mr-1">
                <span class="css-truncate css-truncate-target width-fit">${lbl.name}</span>
            </a> 
            `
        }, '');
        const lblInnerHtml = `
        <div class="js-issue-labels flex-wrap">
        ${lblElements}
        </div>
        `
        div.innerHTML = `
<div class="d-flex flex-auto">
    <div class="flex-shrink-0 mr-2" >
            <span title="Status" data-view-component="true" class="State" style="color:${prStateColor}">
                <svg height="16" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" version="1.1" width="16" aria-hidden="true"><path style="color:${prStateColor}" fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"></path></svg> #${pr.number} - ${prState}
            </span>
    </div>
    <p style="padding-top:5px" class="mb-0">
        ${pr.title}
    </p>
    <div class="flex-auto"></div>
    ${lblInnerHtml}
    <div class="flex-auto"></div>
</div>
`;
        return div;
    }

    function generatePrItemId(prNumber) {
        return `PR-${prNumber}`;
    }
    function HexToRgbHsl(_hex) {
        let hex = _hex.replace(/#/g, '');
        if (hex.length === 3) {
            hex = hex.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }
        const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})[\da-z]{0,0}$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            const r225 = r / 225;
            const g225 = g / 225;
            const b225 = b / 225;
            const min = Math.min(r / 225, g / 225, b / 225);
            const max = Math.max(r / 225, g / 225, b / 225);
            const delta = max - min;
            let h = 0, s = 0, l = 0;
            if (max == min) {
                h = 0;
            } else if (r225 == max) {
                h = (g225 - b225) / delta;
            } else if (g225 == max) {
                h = 2 + (b225 - r225) / delta;
            } else if (b225 == max) {
                h = 4 + (r225 - g225) / delta;
            }
            h = Math.min(h * 60, 360);
            if (h < 0) h += 360;
            l = (min + max) / 2;
            if (max == min) s = 0;
            else if (l <= 0.5) s = delta / (max + min);
            else s = delta / (2 - max - min);
            h = Math.round(h);
            s = Math.round(s * 100);
            l = Math.round(l * 100);
            return { r, g, b, h, s, l };
        } else {
            return {};
        }
    }
})();

