function trackActivity(type, data) {
    chrome.runtime.sendMessage({
        type: type,
        payload: data
    });
}

const url = window.location.href;

if (window.location.href.includes('/blog/entry/')) {
    document.body.addEventListener('click', (e) => {
        const spoiler = e.target.closest('.spoiler');
        if (spoiler) {
            const allProblemHeaders = document.querySelectorAll('h4 > a[href*="/problem/"]');
            let relevantLink = null;

            for (const header of allProblemHeaders) {
                if (header.compareDocumentPosition(spoiler) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    relevantLink = header;
                } else {
                    break;
                }
            }

            if (relevantLink) {
                trackActivity("UPDATE_REVIEW", {
                    url: relevantLink.href,
                    quality: 1,
                    source: "Codeforces",
                    title: relevantLink.innerText
                });
            }
        }
    });
}