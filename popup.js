async function isValidLeetCodeUser(username) {
    if (!username) return true;
    try {
        const response = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query userPublicProfile($username: String!) { userProfilePublicProfile(username: $username) { username } }`,
                variables: { username: username }
            })
        });
        const data = await response.json();
        return !!data.data?.userProfilePublicProfile;
    } catch (error) {
        return false;
    }
}

async function isValidCodeforcesUser(handle) {
    if (!handle) return true;
    try {
        const response = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
        const data = await response.json();
        return data.status === 'OK';
    } catch (error) {
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const { usernames } = await chrome.storage.local.get('usernames');
    // Show setup if usernames object doesn't exist or both names are empty
    if (!usernames || (!usernames.leetcode && !usernames.codeforces)) {
        document.getElementById('setupView').classList.remove('hidden');
    } else {
        document.getElementById('reviewView').classList.remove('hidden');
        renderReviewList();
    }
});

document.getElementById('saveUsernames')?.addEventListener('click', async () => {
    const leetcodeEl = document.getElementById('leetcodeUser');
    const codeforcesEl = document.getElementById('codeforcesUser');
    const errorEl = document.getElementById('errorMessage');
    const saveButton = document.getElementById('saveUsernames');

    const leetcode = leetcodeEl.value.trim();
    const codeforces = codeforcesEl.value.trim();

    errorEl.classList.add('hidden');
    leetcodeEl.classList.remove('input-error');
    codeforcesEl.classList.remove('input-error');
    saveButton.textContent = "Validating...";
    saveButton.disabled = true;

    if (!leetcode && !codeforces) {
        errorEl.textContent = "At least one username is required.";
        errorEl.classList.remove('hidden');
        leetcodeEl.classList.add('input-error');
        codeforcesEl.classList.add('input-error');
        saveButton.textContent = "Save & Start";
        saveButton.disabled = false;
        return;
    }

    const [isLeetCodeValid, isCodeforcesValid] = await Promise.all([
        isValidLeetCodeUser(leetcode),
        isValidCodeforcesUser(codeforces)
    ]);
    
    saveButton.textContent = "Save & Start";
    saveButton.disabled = false;

    if (isLeetCodeValid && isCodeforcesValid) {
        await chrome.storage.local.set({ usernames: { leetcode, codeforces } });
        document.getElementById('setupView').classList.add('hidden');
        document.getElementById('reviewView').classList.remove('hidden');
        renderReviewList();
    } else {
        errorEl.textContent = "One or more usernames could not be found.";
        errorEl.classList.remove('hidden');
        if (!isLeetCodeValid) {
            leetcodeEl.classList.add('input-error');
        }
        if (!isCodeforcesValid) {
            codeforcesEl.classList.add('input-error');
        }
    }
});

async function renderReviewList() {
    const { problems } = await chrome.storage.local.get({ problems: {} });
    const listEl = document.getElementById('problem-list');
    const noReviewsEl = document.getElementById('noReviewsMessage');
    listEl.innerHTML = '';
    const now = new Date();
    const dueProblems = Object.values(problems).filter(p => p.nextReview && new Date(p.nextReview) <= now);

    if (dueProblems.length === 0) {
        noReviewsEl.classList.remove('hidden');
        return;
    }
    
    noReviewsEl.classList.add('hidden');
    dueProblems.sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
    dueProblems.forEach(problem => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${problem.url}" target="_blank" title="Click to solve">${problem.title}</a>`;
        listEl.appendChild(li);
    });
}