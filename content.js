chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getProblemInfo") {
    const url = window.location.href;

    let title = document.title;
    if (url.includes("leetcode.com")) {
      title = title.replace(" - LeetCode", "").trim();
    } else if (url.includes("codeforces.com")) {
      const problemHeader = document.querySelector(".title") || document.querySelector(".problem-statement h2");
      if (problemHeader) title = problemHeader.textContent.trim();
    }

    sendResponse({ title, url });
  }
});