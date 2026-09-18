import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from './Toast';
import { verifyLicenseKeyRemotely } from '../../shared/licenseService';

const DODO_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_DODO_PAYMENT_URL ||
  'https://test.checkout.dodopayments.com/buy/pdt_0NnO9Yu0LqYXonkP2yh8E?quantity=1&redirect_url=http%3A%2F%2Flocalhost%3A3000%2Fsuccess';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProLicense: boolean;
  licenseKey: string;
  customLogoUrl: string;
  onLicenseUpdated: (isPro: boolean, key: string, logoUrl: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isProLicense,
  licenseKey,
  customLogoUrl,
  onLicenseUpdated,
}) => {
  const { showToast } = useToast();
  const [inputKey, setInputKey] = useState<string>('');
  const [logoInput, setLogoInput] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputKey(licenseKey || '');
      setLogoInput(customLogoUrl || '');
      setErrorMsg(null);
    }
  }, [isOpen, licenseKey, customLogoUrl]);

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim().toUpperCase();
    if (!cleanKey || cleanKey.length < 8) {
      setErrorMsg('Please enter a valid FlowTour license key (minimum 8 characters).');
      return;
    }

    setIsActivating(true);
    setErrorMsg(null);

    try {
      const verifyResult = await verifyLicenseKeyRemotely(cleanKey);

      if (!verifyResult.valid) {
        setErrorMsg(
          verifyResult.message || 'Invalid license key. Please check your purchase receipt.'
        );
        setIsActivating(false);
        return;
      }

      const proPayload = {
        isProLicense: true,
        isPro: true,
        licenseKey: cleanKey,
        proActivatedAt: Date.now(),
      };

      if (typeof chrome !== 'undefined') {
        await Promise.all([
          chrome.storage?.sync?.set(proPayload).catch((e) =>
            console.warn('[FlowTour] storage.sync.set error:', e)
          ),
          chrome.storage?.local?.set(proPayload).catch((e) =>
            console.warn('[FlowTour] storage.local.set error:', e)
          ),
        ]);
      }

      onLicenseUpdated(true, cleanKey, logoInput);
      showToast('⚡ Pro Lifetime Activated! Synced to your Chrome Account.', 'success');
      setIsActivating(false);
    } catch (err: any) {
      console.error('[FlowTour] Failed to activate license:', err);
      setErrorMsg('Failed to save license. Please try again.');
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const clearPayload = {
        isProLicense: false,
        isPro: false,
        licenseKey: '',
      };

      if (typeof chrome !== 'undefined') {
        await Promise.all([
          chrome.storage?.sync?.set(clearPayload).catch((e) =>
            console.warn('[FlowTour] storage.sync.set clear error:', e)
          ),
          chrome.storage?.local?.set(clearPayload).catch((e) =>
            console.warn('[FlowTour] storage.local.set clear error:', e)
          ),
        ]);
      }

      setInputKey('');
      onLicenseUpdated(false, '', logoInput);
      showToast('License deactivated. Account reverted to Community Free.', 'info');
    } catch (err) {
      console.error('[FlowTour] Failed to deactivate license:', err);
    }
  };

  const handleSaveLogo = async () => {
    const cleanLogo = logoInput.trim();
    try {
      if (typeof chrome !== 'undefined') {
        // sync storage has 8KB quota per item, only sync if small URL string
        if (cleanLogo.length < 4000 && chrome.storage?.sync) {
          chrome.storage.sync.set({ customLogoUrl: cleanLogo }).catch(() => {});
        }
        if (chrome.storage?.local) {
          await chrome.storage.local.set({ customLogoUrl: cleanLogo });
        }
      }
      onLicenseUpdated(isProLicense, licenseKey, cleanLogo);
      showToast('Custom logo saved successfully!', 'success');
    } catch (err) {
      console.error('[FlowTour] Failed to save custom logo:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, SVG, JPG).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogoInput(dataUrl);
        if (typeof chrome !== 'undefined') {
          // Large data URLs are stored locally only due to sync quota limit
          if (chrome.storage?.local) {
            await chrome.storage.local.set({ customLogoUrl: dataUrl });
          }
        }
        onLicenseUpdated(isProLicense, licenseKey, dataUrl);
        showToast('Brand logo uploaded & saved!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '-••••-••••-' + key.substring(key.length - 4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden max-w-md">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-100">
              License & Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto">
          {/* Account Status Card */}
          <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Current Plan
              </span>
              {isProLicense ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium font-mono shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>⚡ Pro Lifetime Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[11px] font-mono">
                  <span>Community Free</span>
                </div>
              )}
            </div>

            {isProLicense ? (
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-500">License Key</span>
                  <span className="text-zinc-300 font-semibold">{maskKey(licenseKey)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400/90 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/20">
                  <span>Chrome Account Cloud Sync</span>
                  <span>Active ✓</span>
                </div>
                <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/60 text-[11px] text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Clean exports (No FlowTour watermark)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>60 FPS & 4K Ultra-HD WebCodecs rendering</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Custom brand logo video overlay</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="pt-1 text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Deactivate license key</span>
                </button>
              </div>
            ) : (
              <div className="pt-1 space-y-2">
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Free tier includes unlimited recordings, React exports, and 1080p (30fps) exports with a subtle FlowTour watermark.
                </p>
                <a
                  href={DODO_CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Get Lifetime Access for $19 (Slashed from $99) →</span>
                </a>
              </div>
            )}
          </div>

          {/* License Activation Form (When Free) */}
          {!isProLicense && (
            <form onSubmit={handleActivate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Restore or Enter License Key
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="e.g. FLOW-PRO-XXXX-XXXX-XXXX"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                {errorMsg && (
                  <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errorMsg}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isActivating || !inputKey.trim()}
                className="w-full h-8 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-100 text-zinc-950 font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Key className="w-3 h-3" />
                <span>{isActivating ? 'Verifying...' : 'Activate Pro License'}</span>
              </button>
            </form>
          )}

          {/* Custom Brand Logo Section (For Pro Users) */}
          {isProLicense && (
            <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Custom Brand Logo</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  Pro Feature
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Replaces the FlowTour watermark with your own company logo in exported MP4 videos.
              </p>

              {logoInput && (
                <div className="p-2 rounded bg-black/60 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={logoInput}
                      alt="Brand Logo"
                      className="h-6 max-w-[100px] object-contain"
                    />
                    <span className="text-[10px] font-mono text-zinc-400">Preview</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoInput('');
                      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                        chrome.storage.local.set({ customLogoUrl: '' });
                      }
                      onLicenseUpdated(isProLicense, licenseKey, '');
                    }}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  placeholder="https://your-domain.com/logo.png"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveLogo}
                  className="h-7 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-[11px] transition-colors"
                >
                  Save
                </button>
              </div>

              <div>
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-[11px] text-zinc-300 cursor-pointer transition-colors">
                  <span>Upload Image File...</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
