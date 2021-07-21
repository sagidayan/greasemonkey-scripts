// ==UserScript==
// @name        Jira epic enhancements
// @version     0.0.1
// @namespace   http://arantius.com/misc/greasemonkey/
// @author      Ronnie Lazar
// @description Adds link to Jira filter displaying tickets in the epic
// @match       https://issues.redhat.com/*
// ==/UserScript==

// Constants
const LOG_TAG = '[JIRA-EPIC]';
const summaryRegExp = new RegExp(/\[([0-9]+)\]/);
const urlRE = new RegExp(
	'https://issues.redhat.com/browse/'
	+ '('
	+ '[A-Z]+-[0-9]+'
	+ ')'
	+ '.*', 'gi')

// Entry point - observe DOM changes - and search for unlinked jira tickets
var observer = new MutationObserver(update);
observer.observe(document.body, {childList: true, characterData: true, subtree: true});

// adds a tag prefix to logs for easy filters
function log(...args) {
	const msg = args.reduce((msg, data) => {
		return `${msg} ${data}`;
	}, LOG_TAG);
	console.log(msg);
}

// When DOM changes - check for new unlinked issues
function update() {
	if ((mm = urlRE.exec(document.URL)) != null) {
		issueKey = mm[1];
	}
	if (!issueKey) {
		return;
	}




	createElement = document.getElementById("gh-create-issue-in-epic-lnk")
	if (!createElement || createElement.has_issues_link) {
		return
	}
	a1 = document.createElement("a")
	a1.setAttribute("href", "https://issues.redhat.com/issues/?jql=%22Epic%20Link%22%20in%20(" + issueKey + ")")
	a1.setAttribute("id", "my-epic-issues-link")
	a1.setAttribute("class", "aui-icon aui-icon-small aui-iconfont-focus")
	createElement.parentElement.appendChild(a1)
	createElement.has_issues_link = true
}
