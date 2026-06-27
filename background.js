// nudgeTimer holds the reference to the pending countdown.
// clearTimeout(nudgeTimer) cancels it — like cancelling a scheduled Airflow run.
let nudgeTimer = null;
let activeTabId = null;

// This listener runs every time content.js sends us a message.
// "sender" tells us which tab the message came from — like knowing the source IP of a request.
browser.runtime.onMessage.addListener((message, sender) => {

  if (message.type === "WASTEFUL_SITE_DETECTED") {
    activeTabId = sender.tab.id;  // remember WHICH tab sent this

    clearTimeout(nudgeTimer);     // cancel any existing countdown first (handles tab reloads)

    // Start the countdown. setTimeout takes (function, milliseconds).
    // Change 10 * 1000 to 5 * 60 * 1000 when you're done testing.
    nudgeTimer = setTimeout(() => {
      browser.tabs.sendMessage(activeTabId, { type: "SHOW_NUDGE" });
    }, 10 * 1000); // 10 seconds for testing — change to: 5 * 60 * 1000 for production

    console.log("Nudge: timer started for tab", activeTabId);
  }

  if (message.type === "LEFT_WASTEFUL_SITE") {
    clearTimeout(nudgeTimer);
    nudgeTimer = null;
    activeTabId = null;
    console.log("Nudge: timer cancelled — left site");
  }
});
