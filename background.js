chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "MARK_PROBLEM") {
    chrome.storage.local.get({ problems: [] }, (data) => {
      const problems = data.problems;
      const existing = problems.find(p => p.url === msg.problem.url);
      if (!existing) {
        problems.push(msg.problem);
        chrome.storage.local.set({ problems });
      }
    });
  }
});