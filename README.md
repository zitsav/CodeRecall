# CodeRecall
A chrome extension to mark LeetCode and Codeforces problems for spaced repetition and review them when due.

The extension works on a **peek-to-add** model. It doesn't add every problem you visit - a problem is only added to your queue when the extension detects that you're viewing a solution. On LeetCode, this happens when you visit the solutions page, and on Codeforces, it happens when you reveal a hint or solution within an editorial blog post. This keeps your review list focused on problems you’ve actively engaged with.

---

## How Scheduling Works

CodeRecall uses Anki's spaced repetition algorithm (SM-2) to decide when you should see a problem again. When a problem is first added after peeking at a solution, it’s scheduled for review soon. For problems that are due, the extension automatically checks your submission history. If you solve a problem correctly on the first try, its next review is scheduled far into the future. If it takes you a few wrong attempts to get an accepted solution, the problem will be scheduled for an earlier review, giving you more practice.

---

## Installation

1.  **Download:** Place all the extension files (`manifest.json`, `.js` files, etc.) into a single folder.
2.  **Navigate:** Open Google Chrome and go to `chrome://extensions`.
3.  **Enable Developer Mode:** In the top-right corner, turn on the "Developer mode" toggle.
4.  **Load Extension:** Click the **Load unpacked** button and select the folder where you saved the files.