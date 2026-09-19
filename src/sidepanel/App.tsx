import React, { useState, useEffect } from 'react';
import { useDemos } from './hooks/useDemos';
import { useRecording } from './hooks/useRecording';
import { Header } from './components/Header';
import { DemoList } from './components/DemoList';
import { DemoEditor } from './components/DemoEditor';
import { RecordingView } from './components/RecordingView';
import { SettingsModal } from './components/SettingsModal';
import { Step } from '../shared/types';
import { ToastProvider, useToast } from './components/Toast';
import { isProUser } from '../shared/licenseValidator';

const SidePanelContent: React.FC = () => {
  const { showToast } = useToast();
  const {
    demos,
    loading,
    removeDemo,
    updateDemoDetails,
    removeStep,
    reorderDemoSteps,
    refreshDemos,
  } = useDemos();

  const {
    isRecording,
    activeDemoId,
    stepCount,
    startRecording,
    stopRecording,
  } = useRecording((msg) => showToast(msg, 'error'));

  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const [recordedDemoTitle, setRecordedDemoTitle] = useState<string>('');

  // Pro Licensing & Settings state
  const [isProLicense, setIsProLicense] = useState<boolean>(false);
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Load license from chrome.storage.sync (with local fallback) and listen for changes
  useEffect(() => {
    if (typeof chrome === 'undefined') return;

    const loadLicenseState = async () => {
      let syncData: any = {};
      let localData: any = {};

      if (chrome.storage?.sync) {
        try {
          syncData = await chrome.storage.sync.get(['licenseKey', 'customLogoUrl']);
        } catch (e) {
          console.warn('[FlowTour] Failed reading storage.sync:', e);
        }
      }

      if (chrome.storage?.local) {
        try {
          localData = await chrome.storage.local.get(['licenseKey', 'customLogoUrl']);
        } catch (e) {
          console.warn('[FlowTour] Failed reading storage.local:', e);
        }
      }

      // Cryptographically validate Pro status
      const proActive = await isProUser();
      const activeKey = syncData?.licenseKey || localData?.licenseKey || '';
      const activeLogo = syncData?.customLogoUrl || localData?.customLogoUrl || '';

      setIsProLicense(proActive);
      setLicenseKey(activeKey);
      setCustomLogoUrl(activeLogo);
    };

    loadLicenseState();

    // Reactive listener: live updates when 1-Click Sync or cross-device cloud sync arrives
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'sync' || areaName === 'local') {
        if (
          'proToken' in changes ||
          'boundAccountId' in changes ||
          'isProLicense' in changes ||
          'isPro' in changes ||
          'licenseKey' in changes ||
          'customLogoUrl' in changes
        ) {
          loadLicenseState();
        }
      }
    };

    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const handleLicenseUpdated = (isPro: boolean, key: string, logoUrl: string) => {
    setIsProLicense(isPro);
    setLicenseKey(key);
    setCustomLogoUrl(logoUrl);
  };

  // When recording finishes, automatically open the recorded demo in DemoEditor
  useEffect(() => {
    if (!isRecording && activeDemoId) {
      setSelectedDemoId(activeDemoId);
      refreshDemos();
    }
  }, [isRecording, activeDemoId, refreshDemos]);

  const handleStartNew = async (title: string) => {
    const demoId = `demo_${Date.now()}`;
    setRecordedDemoTitle(title);
    const success = await startRecording(demoId, title);
    if (success) {
      setSelectedDemoId(demoId);
    }
  };

  const handleResumeRecording = async (demoId: string, title: string) => {
    setRecordedDemoTitle(title);
    await startRecording(demoId, title);
  };

  const handleUpdateStep = async (stepId: string, patch: Partial<Step>) => {
    if (!selectedDemoId) return;
    const demo = demos.find((d) => d.demoId === selectedDemoId);
    if (!demo) return;
    const updatedSteps = demo.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
    await updateDemoDetails(selectedDemoId, { steps: updatedSteps });
  };

  const activeDemo = demos.find((d) => d.demoId === selectedDemoId) || null;

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white">
      <Header
        isRecording={isRecording}
        stepCount={stepCount}
        isProLicense={isProLicense}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
            Loading walkthroughs...
          </div>
        ) : isRecording ? (
          <RecordingView
            demoTitle={recordedDemoTitle || activeDemo?.demoTitle || 'Recording Walkthrough'}
            stepCount={stepCount}
            onStop={stopRecording}
          />
        ) : selectedDemoId && activeDemo ? (
          <DemoEditor
            demo={activeDemo}
            onBack={() => setSelectedDemoId(null)}
            onUpdateTitle={(id, title) => updateDemoDetails(id, { demoTitle: title })}
            onUpdateStep={handleUpdateStep}
            onDeleteStep={(stepId) => removeStep(selectedDemoId, stepId)}
            onReorderSteps={(orderedIds) => reorderDemoSteps(selectedDemoId, orderedIds)}
            onResumeRecording={handleResumeRecording}
            isProLicense={isProLicense}
            onOpenUpgrade={() => setIsSettingsOpen(true)}
          />
        ) : (
          <DemoList
            demos={demos}
            onSelectDemo={(demoId) => setSelectedDemoId(demoId)}
            onStartNewRecording={handleStartNew}
            onDeleteDemo={removeDemo}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isProLicense={isProLicense}
        licenseKey={licenseKey}
        customLogoUrl={customLogoUrl}
        onLicenseUpdated={handleLicenseUpdated}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <SidePanelContent />
    </ToastProvider>
  );
};
export default App;
