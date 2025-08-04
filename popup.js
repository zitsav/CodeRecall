document.addEventListener('DOMContentLoaded', async () => {
    const { usernames } = await chrome.storage.local.get('usernames');

    if (!usernames || !usernames.leetcode || !usernames.codeforces) {
        document.getElementById('setupView').classList.remove('hidden');
    } else {
        document.getElementById('reviewView').classList.remove('hidden');
        renderReviewList();
    }
});

document.getElementById('saveUsernames')?.addEventListener('click', async () => {
    const leetcode = document.getElementById('leetcodeUser').value.trim();
    const codeforces = document.getElementById('codeforcesUser').value.trim();
    if (leetcode && codeforces) {
        await chrome.storage.local.set({ usernames: { leetcode, codeforces } });
        document.getElementById('setupView').classList.add('hidden');
        document.getElementById('reviewView').classList.remove('hidden');
        renderReviewList();
    }
});

async function renderReviewList() {
    const { problems } = await chrome.storage.local.get({ problems: {} });
    const listEl = document.getElementById('problem-list');
    const noReviewsEl = document.getElementById('noReviewsMessage');
    listEl.innerHTML = '';

    const now = new Date();
    const dueProblems = Object.values(problems).filter(p => {
        if (!p.nextReview) return false;
        return new Date(p.nextReview) <= now;
    });
    if (dueProblems.length === 0) {
        noReviewsEl.classList.remove('hidden');
        return;
    }
    
    noReviewsEl.classList.add('hidden');
    dueProblems.sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));

    dueProblems.forEach(problem => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="${problem.url}" target="_blank" title="Click to solve">${problem.title}</a>
        `;
        listEl.appendChild(li);
    });
}