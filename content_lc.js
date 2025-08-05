function trackActivity(type, data) {
    chrome.runtime.sendMessage({
        type: type,
        payload: data
    });
}

if (window.location.href.includes('/solutions/')) {
    setTimeout(() => {
        const problemTitle = document.title.replace(" - LeetCode", "").trim();

        const problemUrl = window.location.href.split('/solutions/')[0];

        trackActivity("UPDATE_REVIEW", {
            url: problemUrl,
            quality: 1,
            source: "LeetCode",
            title: problemTitle
        });
    }, 1000); 
}