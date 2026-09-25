/**
 * Centralized Brand & Application Constants
 *
 * NOTE: The project name, tagline, and brand tokens are defined here.
 * Once the final brand name and domain are chosen, updating this single file
 * immediately updates the entire UI, exported players, headers, and metadata.
 */
export const APP_CONFIG = {
  // Brand identity (placeholder - easily swapped later)
  name: "FlowTour",
  tagline: "Interactive Demo & Workflow Recorder",
  description: "Capture web app workflows, generate interactive 'How It Works' widgets, and export self-hosted demo players.",
  
  // Storage keys
  STORAGE_KEYS: {
    DEMOS: "flowtour_demos_meta",
    ACTIVE_RECORDING: "flowtour_active_recording",
    SETTINGS: "flowtour_user_settings",
  },
  
  // IndexedDB Configuration for binary screenshot Blobs
  IDB: {
    DB_NAME: "flowtour_media_store",
    STORE_NAME: "screenshots",
    VERSION: 1,
  },
  
  // UI & Recording parameters
  RECORDING: {
    CAPTURE_DELAY_MS: 320, // Delay after click before screenshot to let SPA UI & animations settle
    MAX_SCREENSHOT_WIDTH: 1440,
    JPEG_QUALITY: 0.96,
    THUMBNAIL_WIDTH: 480,
  },

  // Color tokens
  THEME: {
    primary: "#6366f1",
    primaryHover: "#4f46e5",
    accent: "#ec4899",
  }
};
