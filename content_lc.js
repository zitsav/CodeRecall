function trackProblemView() {
    setTimeout(() => {
        const titleElement = document.querySelector('a.mr-2.text-label-1');
        const title = titleElement ? titleElement.innerText : document.title.replace(" - LeetCode", "").trim();
        
        if (title && !title.includes("Problems - LeetCode")) {
            chrome.runtime.sendMessage({
                type: "PROBLEM_VIEWED",
                payload: {
                    title: title,
                    url: window.location.href.split('?')[0],
                    source: "LeetCode"
                }
            });
        }
    }, 500);
}

trackProblemView();