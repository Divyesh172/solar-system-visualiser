import { useState, type FC } from 'react';
import { X, Share2, Download, Copy, Check, Sparkles } from 'lucide-react';
import { useSnapshotStore } from '../../state/useSnapshotStore';

export const ShareModal: FC = () => {
  const isOpen = useSnapshotStore((state) => state.isOpen);
  const imageUrl = useSnapshotStore((state) => state.imageUrl);
  const imageBlob = useSnapshotStore((state) => state.imageBlob);
  const targetTitle = useSnapshotStore((state) => state.targetTitle);
  const isFlashing = useSnapshotStore((state) => state.isFlashing);
  const closeSnapshot = useSnapshotStore((state) => state.closeSnapshot);

  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const safeFilename = `solar-system-${targetTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'snapshot'}.png`;

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareStatus('Saved to Downloads!');
    setTimeout(() => setShareStatus(null), 3000);
  };

  const handleCopy = async () => {
    if (!imageBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob }),
        ]);
        setCopied(true);
        setShareStatus('Copied to clipboard! Paste anywhere (Ctrl+V)');
        setTimeout(() => {
          setCopied(false);
          setShareStatus(null);
        }, 3500);
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const handleShare = async () => {
    if (!imageBlob) return;
    const file = new File([imageBlob], safeFilename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Space Explorer: ${targetTitle}`,
          text: `Check out my astronomical snapshot of ${targetTitle} from the Solar System Visualiser!`,
        });
        setShareStatus('Shared successfully!');
        setTimeout(() => setShareStatus(null), 3000);
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleDownload();
        }
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: `Space Explorer: ${targetTitle}`,
          text: `Check out my astronomical snapshot of ${targetTitle}!`,
          url: window.location.href,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  return (
    <>
      {/* 1. Camera Shutter Flash Overlay */}
      {isFlashing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(200, 230, 255, 0.8) 100%)',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'fadeIn 0.08s ease-out',
            transition: 'opacity 0.3s ease-out',
          }}
        />
      )}

      {/* 2. Modal Backdrop & Dialog */}
      {isOpen && imageUrl && (
        <div
          onClick={closeSnapshot}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(2, 6, 18, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(8, 14, 28, 0.96))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(56, 189, 248, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.5)',
                  }}
                >
                  <Sparkles size={18} color="#ffffff" />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                    Space Explorer Snapshot
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Observation of {targetTitle}
                  </div>
                </div>
              </div>

              <button
                onClick={closeSnapshot}
                title="Close preview"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Photo Preview */}
            <div
              style={{
                padding: '20px 24px 12px 24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                  background: '#000000',
                }}
              >
                <img
                  src={imageUrl}
                  alt={`Space Snapshot of ${targetTitle}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    maxHeight: '52vh',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Status Banner */}
              {shareStatus && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#86efac',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'fadeIn 0.2s ease-out',
                  }}
                >
                  <Check size={16} /> {shareStatus}
                </div>
              )}
            </div>

            {/* Action Buttons Toolbar */}
            <div
              style={{
                padding: '16px 24px 24px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              {/* 1. Share Button */}
              <button
                onClick={handleShare}
                style={{
                  flex: '1 1 140px',
                  minWidth: '130px',
                  background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(14, 165, 233, 0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(14, 165, 233, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.35)';
                }}
              >
                <Share2 size={17} /> Share Snapshot
              </button>

              {/* 2. Download Button */}
              <button
                onClick={handleDownload}
                style={{
                  flex: '1 1 140px',
                  minWidth: '130px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Download size={17} /> Save Picture
              </button>

              {/* 3. Copy Image Button */}
              <button
                onClick={handleCopy}
                style={{
                  flex: '1 1 140px',
                  minWidth: '130px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {copied ? <Check size={17} color="#86efac" /> : <Copy size={17} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
