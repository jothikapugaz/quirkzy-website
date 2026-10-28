// Leave empty when the frontend is served by the Express app at the same origin.
// For GitHub Pages, set this to the deployed API origin, e.g. "https://quirkzy-api.onrender.com".
window.QUIRKZY_API_BASE = window.QUIRKZY_API_BASE || "";
window.QUIRKZY_API_DISABLED = !window.QUIRKZY_API_BASE && window.location.hostname.endsWith("github.io");
