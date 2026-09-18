import React, { useState, useEffect } from 'react';
import { Demo } from '../../shared/types';
import { downloadDemoZip } from '../../export/zip-exporter';
import { generateSingleFileHtml } from '../../export/inline-exporter';
import { generateReactComponentCode } from '../../export/react-exporter';
import { X, Download, Copy, Check, FileCode, Archive, Code2 } from 'lucide-react';
import { useToast } from './Toast';

interface ExportModalProps {
  demo: Demo;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ demo, isOpen, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'zip' | 'inline' | 'react'>('zip');
  const [codeContent, setCodeContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'inline') {
      setIsLoading(true);
      generateSingleFileHtml(demo)
        .then((code) => {
          setCodeContent(code);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    } else if (activeTab === 'react') {
      setIsLoading(true);
      generateReactComponentCode(demo)
        .then((code) => {
          setCodeContent(code);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    }
  }, [activeTab, isOpen, demo]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsLoading(true);
    try {
      await downloadDemoZip(demo);
      showToast('ZIP exported successfully!', 'success');
    } catch (err: any) {
      showToast('Error exporting ZIP: ' + (err.message || err), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadInlineHtml = () => {
    const blob = new Blob([codeContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${demo.demoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-3.5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Export Walkthrough</span>
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">Zero-backend, self-hosted demo formats</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-3 pt-2 gap-3 text-xs font-mono">
          <button
            onClick={() => setActiveTab('zip')}
            className={`pb-2 transition flex items-center gap-1.5 border-b-2 text-[11px] ${
              activeTab === 'zip'
                ? 'border-zinc-100 text-zinc-100 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Archive className="w-3 h-3" />
            <span>Standalone ZIP</span>
          </button>
          <button
            onClick={() => setActiveTab('inline')}
            className={`pb-2 transition flex items-center gap-1.5 border-b-2 text-[11px] ${
              activeTab === 'inline'
                ? 'border-zinc-100 text-zinc-100 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileCode className="w-3 h-3" />
            <span>Single HTML</span>
          </button>
          <button
            onClick={() => setActiveTab('react')}
            className={`pb-2 transition flex items-center gap-1.5 border-b-2 text-[11px] ${
              activeTab === 'react'
                ? 'border-zinc-100 text-zinc-100 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>React JSX</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-3.5 flex-1 overflow-y-auto">
          {activeTab === 'zip' && (
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-1 text-zinc-300">
                <p className="text-[11px] font-medium text-zinc-200">Production Drop-in Package</p>
                <p className="text-[10px] leading-relaxed text-zinc-500">
                  Packages HTML, lightweight CSS, 2.5KB Vanilla JS player, and captured screenshots.
                  Drop into Vercel, Netlify, or any static hosting.
                </p>
              </div>

              <div className="border border-zinc-800/80 rounded-lg p-2.5 bg-black font-mono text-[10px] text-zinc-400 space-y-0.5">
                <p className="text-zinc-200 font-semibold mb-1">Package Structure:</p>
                <p>├── index.html</p>
                <p>├── player.js  <span className="text-zinc-600">(2.5KB)</span></p>
                <p>├── style.css</p>
                <p>└── images/    <span className="text-zinc-600">({demo.steps.length} screenshots)</span></p>
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={isLoading}
                className="w-full h-8 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Generating ZIP...' : 'Download ZIP Package'}</span>
              </button>
            </div>
          )}

          {(activeTab === 'inline' || activeTab === 'react') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-500 font-mono">
                  {activeTab === 'inline'
                    ? 'Self-contained HTML with base64 screenshots'
                    : 'React component code'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="h-6 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded flex items-center gap-1 transition text-[10px] font-mono"
                  >
                    {copied ? <Check className="w-3 h-3 text-zinc-200" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  {activeTab === 'inline' && (
                    <button
                      onClick={handleDownloadInlineHtml}
                      className="h-6 px-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded flex items-center gap-1 transition text-[10px] font-medium"
                    >
                      <Download className="w-3 h-3" />
                      <span>.html</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative border border-zinc-800 rounded-lg bg-black overflow-hidden">
                <pre className="p-3 text-[10px] font-mono text-zinc-300 max-h-60 overflow-y-auto leading-relaxed">
                  {isLoading ? 'Preparing preview code...' : codeContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
