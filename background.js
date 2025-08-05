function sm2(problem, quality) {
    let { repetitions, easeFactor, interval } = problem;
    if (quality < 3) {
        repetitions = 0;
        interval = 1;
    } else {
        easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    }
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const nextReview = new Date(Date.now() + interval * oneDayInMs);
    return { ...problem, repetitions, easeFactor, interval, nextReview: nextReview.toISOString(), lastReviewed: new Date().toISOString() };
}

async function handleUpdateReview(payload) {
    const { problems } = await chrome.storage.local.get({ problems: {} });
    const problemUrl = payload.url.split('?')[0];
    let problem = problems[problemUrl];

    if (problem) {
        console.log(`Background: Updating existing problem: ${problem.title}`);
        if (payload.quality === 5) {
            problem.consecutiveCorrect = (problem.consecutiveCorrect || 0) + 1;
        } else {
            problem.consecutiveCorrect = 0;
        }

        if (problem.consecutiveCorrect >= 2) {
            console.log(`Problem "${problem.title}" rated 5 twice in a row. Removing.`);
            delete problems[problemUrl];
        } else {
            problems[problemUrl] = sm2(problem, payload.quality);
        }

    } else {
        console.log(`Background: Creating new problem: "${payload.title}"`);
        const newProblem = {
            title: payload.title,
            url: problemUrl,
            source: payload.source,
            history: [{ type: 'PEEKED', date: new Date().toISOString() }],
            repetitions: 0,
            easeFactor: 2.5,
            interval: 0,
            nextReview: null,
            status: 'Reviewing',
            lastReviewed: new Date().toISOString(),
            consecutiveCorrect: 0
        };
        
        problems[problemUrl] = sm2(newProblem, payload.quality);
        if (payload.quality === 5) {
            problems[problemUrl].consecutiveCorrect = 1;
        }
    }

    if (problems[problemUrl] && payload.quality < 3) {
        problems[problemUrl].status = 'Reviewing';
    }
    await chrome.storage.local.set({ problems });
}

async function handleDeleteProblem(problemUrl) {
    if (!problemUrl) return;
    console.log(`Background: Received request to delete problem: ${problemUrl}`);
    const { problems } = await chrome.storage.local.get({ problems: {} });
    if (problems[problemUrl]) {
        const title = problems[problemUrl].title;
        delete problems[problemUrl];
        await chrome.storage.local.set({ problems });
        console.log(`Background: Problem "${title}" deleted successfully.`);
    } else {
        console.warn(`Background: Problem "${problemUrl}" not found for deletion.`);
    }
}

async function checkSubmissions() {
    const { usernames, problems } = await chrome.storage.local.get(['usernames', 'problems']);
    if (!usernames || !problems) return;
    let problemsUpdated = false;
    const submissionsByUrl = {};
    try {
        const response = await fetch(`https://codeforces.com/api/user.status?handle=${usernames.codeforces}&from=1&count=100`);
        const data = await response.json();
        if (data.status === 'OK') {
            data.result.forEach(sub => {
                const url = `https://codeforces.com/contest/${sub.problem.contestId}/problem/${sub.problem.index}`;
                if (!submissionsByUrl[url]) submissionsByUrl[url] = [];
                submissionsByUrl[url].push({ timestamp: sub.creationTimeSeconds, verdict: sub.verdict });
            });
        }
    } catch (error) { console.error("Failed to fetch Codeforces data:", error); }
    try {
        const response = await fetch('https://leetcode.com/graphql', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query recentAcSubmissions($username: String!, $limit: Int!) { recentSubmissionList(username: $username, limit: $limit) { titleSlug statusDisplay timestamp } }`,
                variables: { username: usernames.leetcode, limit: 100 }
            })
        });
        const data = await response.json();
        if (data.data && data.data.recentSubmissionList) {
            data.data.recentSubmissionList.forEach(sub => {
                const url = `https://leetcode.com/problems/${sub.titleSlug}/`;
                if (!submissionsByUrl[url]) submissionsByUrl[url] = [];
                submissionsByUrl[url].push({ timestamp: parseInt(sub.timestamp, 10), verdict: sub.statusDisplay === 'Accepted' ? 'OK' : 'WRONG_ANSWER' });
            });
        }
    } catch (error) { console.error("Failed to fetch LeetCode data:", error); }
    for (const url in problems) {
        const problem = problems[url];
        if (problem.status === 'Solved' || !submissionsByUrl[url]) continue;
        const allSubmissions = submissionsByUrl[url].sort((a, b) => a.timestamp - b.timestamp);
        const newSubmissions = allSubmissions.filter(s => (s.timestamp * 1000) > new Date(problem.lastReviewed).getTime());
        if (newSubmissions.length === 0) continue;
        const firstCorrectIndex = newSubmissions.findIndex(s => s.verdict === 'OK');
        if (firstCorrectIndex !== -1) {
            const wrongAttempts = firstCorrectIndex;
            let quality;
            if (wrongAttempts === 0) { quality = 5; } else if (wrongAttempts <= 2) { quality = 4; } else { quality = 3; }

            if (quality === 5) {
                problem.consecutiveCorrect = (problem.consecutiveCorrect || 0) + 1;
            } else {
                problem.consecutiveCorrect = 0;
            }

            if (problem.consecutiveCorrect >= 2) {
                console.log(`Problem "${problem.title}" solved correctly twice in a row. Removing.`);
                delete problems[url];
            } else {
                console.log(`Auto-rating problem "${problem.title}" with quality ${quality}`);
                problems[url] = sm2(problem, quality);
                problems[url].status = 'Solved';
            }
            problemsUpdated = true;
        }
    }
    if (problemsUpdated) {
        await chrome.storage.local.set({ problems });
        console.log("Problem review statuses automatically updated and saved.");
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`Background: Message listener fired for type: ${message.type}`);
    if (message.type === "UPDATE_REVIEW") {
        handleUpdateReview(message.payload);
        return true; 
    }
    if (message.type === "DELETE_PROBLEM") {
        handleDeleteProblem(message.payload.url);
        return true;
    }
});

chrome.alarms.create('submissionCheck', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'submissionCheck') {
        checkSubmissions();
    }
});