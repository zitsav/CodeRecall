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

    const today = new Date();
    const dueProblems = Object.values(problems).filter(p => p.nextReview && new Date(p.nextReview) <= today);

    if (dueProblems.length === 0) {
        noReviewsEl.classList.remove('hidden');
        return;
    }
    
    noReviewsEl.classList.add('hidden');
    dueProblems.sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));

    dueProblems.forEach(problem => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="${problem.url}" target="_blank">${problem.title}</a>
            <div class="actions">
                <button data-url="${problem.url}" data-quality="5" title="Knew it well">Easy</button>
                <button data-url="${problem.url}" data-quality="3" title="Recalled with some effort">Hard</button>
                <button data-url="${problem.url}" data-quality="0" title="Couldn't remember the solution">Forgot</button>
            </div>
        `;
        listEl.appendChild(li);
    });
}

document.getElementById('problem-list').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;

    const url = e.target.dataset.url;
    const quality = parseInt(e.target.dataset.quality, 10);

    chrome.runtime.sendMessage({
        type: "UPDATE_REVIEW",
        payload: { url, quality }
    }, () => {
        renderReviewList();
    });
});