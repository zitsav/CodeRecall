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
    
    return { ...problem, repetitions, easeFactor, interval, nextReview: nextReview.toISOString() };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        const { type, payload } = message;
        const { problems } = await chrome.storage.local.get({ problems: {} });
        const problemUrl = payload.url;

        if (type === "PROBLEM_VIEWED") {
            if (!problems[problemUrl]) {
                console.log(`New problem tracked: ${payload.title}`);
                const newProblem = {
                    title: payload.title,
                    url: problemUrl,
                    source: payload.source,
                    history: [{ type: 'VIEWED', date: new Date().toISOString() }],
                    repetitions: 0,
                    easeFactor: 2.5,
                    interval: 0,
                    nextReview: null
                };
                problems[problemUrl] = sm2(newProblem, 4); 
                await chrome.storage.local.set({ problems });
            }
        } 
        else if (type === "UPDATE_REVIEW") {
            const problem = problems[problemUrl];
            if (problem) {
                problems[problemUrl] = sm2(problem, payload.quality);
                await chrome.storage.local.set({ problems });
            }
        }
        
        sendResponse({ status: "success" });
    })();
    return true;
});

async function checkSubmissions() {
    const { usernames, problems } = await chrome.storage.local.get(['usernames', 'problems']);
    if (!usernames || !problems) return;

    console.log(`Checking submissions for LeetCode: ${usernames.leetcode}, Codeforces: ${usernames.codeforces}...`);

    let problemsUpdated = false;

    try {
        const response = await fetch(`https://codeforces.com/api/user.status?handle=${usernames.codeforces}&from=1&count=50`);
        const data = await response.json();
        if (data.status === 'OK') {
            for (const submission of data.result) {
                if (submission.verdict === 'OK') {
                    const problemUrl = `https://codeforces.com/contest/${submission.problem.contestId}/problem/${submission.problem.index}`;
                    
                    if (problems[problemUrl] && problems[problemUrl].status !== 'Solved') {
                        console.log(`Updating Codeforces problem: ${problems[problemUrl].title}`);
                        problems[problemUrl].status = 'Solved';
                        problems[problemUrl] = sm2(problems[problemUrl], 5); // Quality 5 = Easy
                        problemsUpdated = true;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Failed to fetch Codeforces data:", error);
    }

    try {
        const leetcodeQuery = {
            query: `
                query recentSubmissionList($username: String!, $limit: Int!) {
                    recentSubmissionList(username: $username, limit: $limit) {
                        title
                        titleSlug
                        timestamp
                        statusDisplay
                        lang
                    }
                }
            `,
            variables: {
                username: usernames.leetcode,
                limit: 20
            }
        };

        const response = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(leetcodeQuery)
        });
        const data = await response.json();

        if (data.data && data.data.recentSubmissionList) {
            for (const submission of data.data.recentSubmissionList) {
                if (submission.statusDisplay === 'Accepted') {
                    const problemUrl = `https://leetcode.com/problems/${submission.titleSlug}/`;
                
                    if (problems[problemUrl] && problems[problemUrl].status !== 'Solved') {
                        console.log(`Updating LeetCode problem: ${problems[problemUrl].title}`);
                        problems[problemUrl].status = 'Solved'
                        problems[problemUrl] = sm2(problems[problemUrl], 5);
                        problemsUpdated = true;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Failed to fetch LeetCode data:", error);
    }

    if (problemsUpdated) {
        await chrome.storage.local.set({ problems });
        console.log("Problem statuses updated and saved.");
    }
}

chrome.alarms.create('submissionCheck', {
    periodInMinutes: 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'submissionCheck') {
        checkSubmissions();
    }
});