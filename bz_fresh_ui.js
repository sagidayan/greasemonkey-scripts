// ==UserScript==
// @name        BZ fresh UI
// @version     0.0.1
// @namespace   https://git.sagidayan.com/sagi/greasemonkey-scripts
// @author      Sagi Dayan
// @description Adds bling (?) to BZ
// @match       https://bugzilla.redhat.com/show_bug.cgi*
// ==/UserScript==



(async function () {
    // Constants
    const LOG_TAG = '[BZ-FRESHENER]';
    const GITHUB_AUTH = '';

    const userAvatars = {};

    log('Loaded');
    await formatComments();

    // Add styling
    document.head.insertAdjacentHTML("beforeend", `<style>
    body {
        background-color: whitesmoke;
    }
    .bz_comment, .bz_first_comment{
        margin-bottom: 2em;
        border: solid 2px #c5c5c5;
        background-color: white;
        border-radius: 5px;
    }

    .bz_first_comment{
        margin-bottom: 2em;
        border: solid 2px gray;
        border-radius: 5px;
    }

    .ih_history_change {
        background-color: #dadada;
    }
    .bz_comment.ih_history{
        background-color: white !important;
    }

    .bz_comment_head,
    .bz_first_comment_head {
        height: 4rem;
        line-height: 57px;
        background-color: whitesmoke;
     }
     .ih_history .bz_comment_head {
        height: 4rem;
        line-height: 50px;
        background-color: whitesmoke;
     }
     .bz_first_comment_head {
        font-weight: bold;
     }
    .sd_bz_user_avatar_img{
        object-fit: contain;
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 50%;
        border: solid 1px gray;
    }
    .sd_bz_user_avatar{
        max-height: 100%;
        margin: 2px;
        float: left;
    }
    </style>`)

    // adds a tag prefix to logs for easy filters
    function log(...args) {
        const msg = args.reduce((msg, data) => {
            return `${msg} ${data}`;
        }, LOG_TAG);
        console.log(msg);
    }


    async function formatComments() {
        log('Started');
        const headers = [...document.getElementsByClassName('bz_comment_head'),
        ...document.getElementsByClassName('bz_first_comment_head')];
        log(`Found ${headers.length} headers to add avatars to`);
        headers.forEach(async header => {
            if ([...header.getElementsByClassName('sd_bz_user_avatar')].length) return;
            const children = [...header.children];
            const userDataElm = children
                .filter(c => c.className === 'bz_comment_user')[0]
            const userEmail = userDataElm?.getElementsByTagName('a')[0]?.href.split(':')[1];
            const userFullName = userDataElm?.getElementsByClassName('fn')[0]?.innerHTML;
            // Create an avatar thing :)
            const wrapper = document.createElement('div');
            wrapper.className = 'sd_bz_user_avatar';
            const img = document.createElement('img');
            img.className = 'sd_bz_user_avatar_img';
            const userAvatar = await getAvatarByEmail(userEmail, userFullName);
            userAvatars[userEmail] = userAvatar;
            img.src = userAvatar;
            wrapper.appendChild(img);
            header.insertBefore(wrapper, header.firstChild);
        });
        const historyChanges = [...document.getElementsByClassName('ih_history_change')];
        log(`Found ${historyChanges.length} changes sections to format.`);
        historyChanges.forEach(h => {
            const lines = h.innerText.split('\n');
            const newLines = [];
            lines.forEach(l => {
                const tab = newLines.length ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : '';
                if (l.indexOf('→') != -1) {
                    newLines.push(`${tab}🔀 ${l.replace('→', '🢧')}`);
                }
                else if (l.indexOf('CC') != -1) {
                    newLines.push(`${tab}🙋 ${l}`);
                }
                else {
                    newLines.push(`${tab}🔼 ${l}`);
                }
            });
            h.innerHTML = newLines.join('<hr>')
        });
    }



    async function getAvatarByEmail(email, fullName) {
        if (userAvatars[email]) return userAvatars[email];
        if (!email) return getGravatar('just-a-fake-email-for-default@avatar.image.thing');
        try {
            const resp = await fetch("https://api.github.com/graphql", {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json",
                    "Authorization": `token ${GITHUB_AUTH}`
                },
                "body": `{\"query\":\"{\\n  search(type: USER, query: \\\"in:email ${email}\\\", first: 1) {\\n    userCount\\n    edges {\\n      node {\\n        ... on User {\\n          avatarUrl\\n        }\\n      }\\n    }\\n  }\\n}\"}`
            })
            const body = await resp.json();
            return body.data?.search.edges[0]?.node.avatarUrl || getAvatarByFullName(fullName, email);
        } catch (err) {
            log(err);
            return getAvatarByFullName(fullName, email);
        }
    }

    async function getAvatarByFullName(fullName, email) {
        if (!fullName || fullName.split(' ').length < 2) return getGravatar(email);
        try {
            const resp = await fetch("https://api.github.com/graphql", {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json",
                    "Authorization": `token ${GITHUB_AUTH}`
                },
                "body": `{\"query\":\"{\\n  search(type: USER, query: \\\"in:fullname ${fullName}\\\", first: 1) {\\n    userCount\\n    edges {\\n      node {\\n        ... on User {\\n          avatarUrl\\n        }\\n      }\\n    }\\n  }\\n}\"}`
            })
            const body = await resp.json();
            return body.data?.search.edges[0]?.node.avatarUrl || getGravatar(email);
        } catch (err) {
            log(err);
            return getGravatar(email);
        }
    }

    function getGravatar(email) {
        return `https://www.gravatar.com/avatar/${md5(email)}`;
    }

    // This function is from https://stackoverflow.com/questions/1655769/fastest-md5-implementation-in-javascript
    function md5(inputString) {
        var hc = "0123456789abcdef";
        function rh(n) { var j, s = ""; for (j = 0; j <= 3; j++) s += hc.charAt((n >> (j * 8 + 4)) & 0x0F) + hc.charAt((n >> (j * 8)) & 0x0F); return s; }
        function ad(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF); var m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xFFFF); }
        function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
        function cm(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
        function ff(a, b, c, d, x, s, t) { return cm((b & c) | ((~b) & d), a, b, x, s, t); }
        function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & (~d)), a, b, x, s, t); }
        function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
        function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | (~d)), a, b, x, s, t); }
        function sb(x) {
            var i; var nblk = ((x.length + 8) >> 6) + 1; var blks = new Array(nblk * 16); for (i = 0; i < nblk * 16; i++) blks[i] = 0;
            for (i = 0; i < x.length; i++) blks[i >> 2] |= x.charCodeAt(i) << ((i % 4) * 8);
            blks[i >> 2] |= 0x80 << ((i % 4) * 8); blks[nblk * 16 - 2] = x.length * 8; return blks;
        }
        var i, x = sb(inputString), a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, olda, oldb, oldc, oldd;
        for (i = 0; i < x.length; i += 16) {
            olda = a; oldb = b; oldc = c; oldd = d;
            a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = ff(b, c, d, a, x[i + 3], 22, -1044525330); a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983); a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = ff(b, c, d, a, x[i + 15], 22, 1236535329); a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302); a = gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = gg(b, c, d, a, x[i + 8], 20, 1163531501); a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734); a = hh(a, b, c, d, x[i + 5], 4, -378558);
            d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = hh(b, c, d, a, x[i + 10], 23, -1094730640); a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i + 0], 11, -358537222);
            c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189); a = hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = hh(d, a, b, c, x[i + 12], 11, -421815835); c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
            a = ii(a, b, c, d, x[i + 0], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415); c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = ii(b, c, d, a, x[i + 5], 21, -57434055); a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799); a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = ii(d, a, b, c, x[i + 15], 10, -30611744); c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379); c = ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = ii(b, c, d, a, x[i + 9], 21, -343485551); a = ad(a, olda); b = ad(b, oldb); c = ad(c, oldc); d = ad(d, oldd);
        }
        return rh(a) + rh(b) + rh(c) + rh(d);
    }
})()

