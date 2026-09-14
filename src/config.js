// -----------------------------------------------------------------------------
// PROJECT CONFIGURATION
// This is the only file you need to edit before going live.
// The project is fully static: it runs on GitHub Pages with no server.
// -----------------------------------------------------------------------------

export const CONFIG = {
  // --- Your X links -------------------------------------------------------
  x: {
    handle: 'YOUR_PROJECT',
    profileUrl: 'https://x.com/YOUR_PROJECT',
    postUrl: 'https://x.com/YOUR_PROJECT/status/YOUR_POST_ID',
  },

  // --- Google Sheet endpoint ---------------------------------------------
  // Paste the Web App URL from google/apps-script.gs after you deploy it.
  // Example: https://script.google.com/macros/s/AKfy..../exec
  sheetsEndpoint: 'https://script.google.com/macros/s/AKfycbwNPBcdJW-UOzziL68Qo7nv2RYWQldlLb0cXarJXDh68CeIV7J0cYGyvG7cbalNaFPk/exec',

  // --- Copy you may want to change ---------------------------------------
  copy: {
    commentQuestion:
      'If another Earth existed beyond this one, what would you hope to find there?',
  },

  // --- Experience tuning --------------------------------------------------
  experience: {
    // Seconds a visitor must spend on X before VERIFY unlocks, so nobody can
    // click straight through without leaving the page.
    minTaskSeconds: 6,
    // Set to a stage id while building worlds, e.g. 'living' or 'final'.
    debugStage: null,
    allowAudio: true,
  },
};
