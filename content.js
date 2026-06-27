// Tell background.js we just landed on a wasteful site. Messages are dictionaries
// Message is sent to all runtime listeners
browser.runtime.sendMessage({ type: "WASTEFUL_SITE_DETECTED" });

// When we navigate away, cancel the timer so a quick visit doesn't trigger the nudge.
// "beforeunload" fires just before the page is torn down
window.addEventListener("beforeunload", () => {
  browser.runtime.sendMessage({ type: "LEFT_WASTEFUL_SITE" });
});

// Listen for background.js to say "time is up, show the overlay".
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_NUDGE") {
    showOverlay();
  }
});

const COMMITMENT_PHRASE = "I agree to ignore the nudge and continue wasting my time on this site";

// Injects a full-screen blocking overlay. The page is still in the DOM beneath it,
// but the overlay intercepts all clicks and keyboard events — site is unusable until dismissed.
// Dismissed only by typing COMMITMENT_PHRASE exactly into the input box.
function showOverlay() {
  // --- outer overlay: covers the full screen ---
  // position: fixed means it stays put even if the page scrolls.
  // inset: 0 is shorthand for top/right/bottom/left all = 0 (fills the whole viewport).
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position: fixed",
    "inset: 0",
    "background: rgba(0, 0, 0, 0.85)",
    "z-index: 2147483647",
    "display: flex",
    "align-items: center",     // vertically center the card
    "justify-content: center", // horizontally center the card
    "font-family: sans-serif",
  ].join(";");

  // --- inner card: the white box the user interacts with ---
  const card = document.createElement("div");
  card.style.cssText = [
    "background: white",
    "border-radius: 12px",
    "padding: 40px",
    "max-width: 500px",
    "width: 90%",
    "text-align: center",
  ].join(";");

  // --- heading ---
  const heading = document.createElement("h2");
  heading.innerText = "You've been here for 5 minutes.";
  heading.style.cssText = "margin: 0 0 16px; font-size: 22px; color: #1a1a1a";

  // --- instruction ---
  const instruction = document.createElement("p");
  instruction.innerText = "To continue, type the following:";
  instruction.style.cssText = "color: #555; margin: 0 0 12px; font-size: 15px";

  // --- phrase display: shows the user exactly what to type ---
  const phraseDisplay = document.createElement("p");
  phraseDisplay.innerText = `"${COMMITMENT_PHRASE}"`;
  phraseDisplay.style.cssText = [
    "font-style: italic",
    "color: #333",
    "background: #f5f5f5",
    "border-radius: 6px",
    "padding: 10px 14px",
    "margin: 0 0 20px",
    "font-size: 14px",
    "line-height: 1.5",
  ].join(";");

  // --- text input ---
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type the phrase above...";
  input.style.cssText = [
    "width: 100%",
    "box-sizing: border-box", // padding doesn't add to the declared width
    "padding: 10px 14px",
    "font-size: 14px",
    "border: 2px solid #ddd",
    "border-radius: 6px",
    "outline: none",
  ].join(";");

  // --- phrase check: fires on every keystroke ---
  // event.target is the input element; .value is the full current string inside it.
  // Python equivalent: if text == COMMITMENT_PHRASE: break
  input.addEventListener("input", (event) => {
    if (event.target.value === COMMITMENT_PHRASE) {
      overlay.remove(); // tear the whole overlay out of the DOM — site is usable again
    }
  });

  // --- assemble the tree, then attach to the page ---
  // Like nesting dicts: overlay > card > [heading, instruction, phraseDisplay, input]
  card.appendChild(heading);
  card.appendChild(instruction);
  card.appendChild(phraseDisplay);
  card.appendChild(input);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  input.focus(); // put the cursor in the input box automatically
}
