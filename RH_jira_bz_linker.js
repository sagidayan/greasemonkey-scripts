// ==UserScript==
// @name        RedHat jira BZ Linker
// @version     0.0.1
// @namespace   http://arantius.com/misc/greasemonkey/
// @author      Sagi Dayan
// @description Adds BZ links in (RedHat) Jira when needed
// @match       https://issues.redhat.com/*
// ==/UserScript==

// Constants
const LOG_TAG = '[BZ-LINKER]';
const summaryRegExp = new RegExp(/\[([0-9]+)\]/);

// Entry point - observe DOM changes - and search for unlinked jira tickets
var observer = new MutationObserver(update);
observer.observe(document.body, { childList: true, characterData: true, subtree: true });

// adds a tag prefix to logs for easy filters
function log(...args) {
    const msg = args.reduce((msg, data) => {
        return `${msg} ${data}`;
    }, LOG_TAG);
    console.log(msg);
}

// When DOM changes - check for new unlinked issues
function update() {
    const issues = filterAndInflate([...document.getElementsByClassName("issuerow")]);
    if (issues.length) log(`Found #${issues.length} new unlinked issues. Linking...`);
    issues.forEach(issue => {
        const issueId = issue.bzId;
        if (issueId) {
            const link = document.createElement('a');
            const p = document.createElement('p');
            link.href = `https://bugzilla.redhat.com/show_bug.cgi?id=${issueId}`;
            link.classList = ['issue-link'];
            link.target = '_blank';
            link.innerHTML = `🐞 Bugzilla Bug: ${issueId} 🐞`;
            p.style = 'margin-top:10px;';
            p.append(link);
            issue.summaryElm.append(p);
        }
        issue.touched = true;
    });
}
// Returns only rows (TR tags) that are not linked and are BZ bugs
function filterAndInflate(rows) {
    return rows.filter(r => {
        if (r.tagName === 'TR' && !r.touched) {
            const summary = [...r.children].reduce((prev, child) => {
                if (prev) return prev;
                if (child.getAttribute('data-field-id') === 'summary'
                    || child.className.indexOf('summary') != -1) {
                    r.summaryElm = child;
                    return child.innerHTML;
                }
            }, null)
            if (!summary) return false;
            const bzId = summary.match(summaryRegExp);
            if (bzId) {
                r.bzId = bzId[1];
                return true;
            }
        }
        return false;
    })
}