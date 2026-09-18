export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-gray-300 font-sans">
      <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy for FlowTour</h1>
      <p className="mb-4">Last updated: September 11, 2026</p>
      
      <h2 className="text-xl font-semibold text-white mt-6 mb-2">1. Local Data Storage</h2>
      <p className="mb-4">
        FlowTour operates on a zero-backend architecture. All recorded walkthrough metadata, 
        DOM selectors, click coordinates, and screenshots are stored 100% locally on your device 
        using browser storage (chrome.storage.local and IndexedDB).
      </p>

      <h2 className="text-xl font-semibold text-white mt-6 mb-2">2. Data Collection & Usage</h2>
      <p className="mb-4">
        FlowTour captures screen coordinates, DOM element text, and viewport screenshots ONLY 
        when you explicitly start a recording session. We do not transmit, sell, or share 
        your captured data to external servers or third parties.
      </p>

      <h2 className="text-xl font-semibold text-white mt-6 mb-2">3. Contact</h2>
      <p>If you have any questions, reach out on X/Twitter or GitHub.</p>
    </div>
  );
}
