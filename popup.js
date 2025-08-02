const markContainer = document.getElementById("mark-container");
const markBtn = document.getElementById("mark-btn");
const titleSpan = document.getElementById("problem-title");

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

chrome.storage.local.get({ problems: [] }, ({ problems }) => {
  const today = new Date();
  const list = document.getElementById("problem-list");

  const due = problems.filter(p => new Date(p.nextReview) <= today);

  due.forEach((p, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="${p.url}" target="_blank">${p.title}</a><br/>
      Next Review: ${formatDate(p.nextReview)}<br/>
      <button data-index="${index}" data-action="solved">Solved</button>
      <button data-index="${index}" data-action="failed">Failed</button>
    `;
    list.appendChild(li);
  });

  list.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;

    const idx = parseInt(e.target.dataset.index);
    const action = e.target.dataset.action;

    chrome.storage.local.get({ problems: [] }, ({ problems }) => {
      const prob = problems[idx];

      if (action === "solved") {
        problems.splice(idx, 1); // Remove from list
      } else if (action === "failed") {
        const nextInterval = prob.interval === 3 ? 7 : prob.interval * 2;
        prob.interval = nextInterval;
        prob.nextReview = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();
      }

      chrome.storage.local.set({ problems }, () => location.reload());
    });
  });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const isSupported = tab.url.includes("leetcode.com/problems") ||
                      tab.url.includes("codeforces.com/problemset/problem");

  if (!isSupported) {
    markContainer.style.display = "none";
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "getProblemInfo" }, (res) => {
    if (!res) return;

    titleSpan.textContent = res.title;

    chrome.storage.local.get({ problems: [] }, ({ problems }) => {
      const already = problems.find(p => p.url === res.url);

      if (already) {
        markBtn.textContent = "Already Marked";
        markBtn.disabled = true;
      } else {
        markBtn.addEventListener("click", () => {
          const interval = 3;
          const nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();

          problems.push({
            title: res.title,
            url: res.url,
            interval,
            nextReview
          });

          chrome.storage.local.set({ problems }, () => {
            markBtn.textContent = "Marked!";
            markBtn.disabled = true;
          });
        });
      }
    });
  });
});