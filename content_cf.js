function trackActivity(type, data) {
    chrome.runtime.sendMessage({
        type: type,
        payload: data
    });
}

const url = window.location.href;

if (url.includes('/problemset/problem/') || url.includes('/contest/')) {
    const problemTitleDiv = document.querySelector('.problem-statement .title');
    if (problemTitleDiv) {
        const title = problemTitleDiv.innerText.substring(3);
        trackActivity("PROBLEM_VIEWED", {
            url: url.split('?')[0],
            title: title,
            source: "Codeforces"
        });
    }
}

if (url.includes('/blog/entry/')) {
    document.body.addEventListener('click', (e) => {
        const spoiler = e.target.closest('.spoiler');
        if (spoiler) {
            let element = spoiler;
            while ((element = element.previousElementSibling) != null) {
                const problemLink = element.querySelector('h4 > a[href*="/problem/"]');
                if (problemLink) {
                    trackActivity("PROBLEM_VIEWED", {
                        url: problemLink.href,
                        title: problemLink.innerText,
                        source: "Codeforces"
                    });
                    return;
                }
            }
        }
    });
}