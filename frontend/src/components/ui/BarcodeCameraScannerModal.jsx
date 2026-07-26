import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Modal from './Modal';
import Button from './Button';
import { Camera, RefreshCw, Volume2, VolumeX, CheckCircle, AlertCircle, Flashlight } from 'lucide-react';

export default function BarcodeCameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [isContinuous, setIsContinuous] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedText, setLastScannedText] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);

  const html5QrcodeRef = useRef(null);
  const isStartingRef = useRef(false);

  // Play audio beep via Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  const startScanner = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraError(null);

    try {
      // Stop existing instance if running
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop().catch(() => {});
        }
        html5QrcodeRef.current.clear();
        html5QrcodeRef.current = null;
      }

      const html5Qrcode = new Html5Qrcode('camera-reader-viewport');
      html5QrcodeRef.current = html5Qrcode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minDim * 0.75),
            height: Math.floor(minDim * 0.75)
          };
        },
        aspectRatio: 1.0
      };

      const onScan = async (decodedText) => {
        // Debounce exact same scan within 1.5s
        if (decodedText === lastScannedText && isContinuous) {
          return;
        }

        setLastScannedText(decodedText);
        playBeep();

        setScanFeedback(`Scanned: ${decodedText}`);
        setTimeout(() => setScanFeedback(null), 2500);

        if (onScanSuccess) {
          onScanSuccess(decodedText);
        }

        if (!isContinuous) {
          stopScanner();
          onClose();
        }
      };

      await html5Qrcode.start(
        { facingMode: facingMode },
        config,
        onScan,
        () => {} // ignore frame scan errors
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera Scanner start error:', err);
      setCameraError(
        'Could not access rear camera. Please ensure camera permission is granted in browser settings.'
      );
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping camera:', e);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Delay slightly for modal DOM node to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
      setLastScannedText('');
      setScanFeedback(null);
    }
  }, [isOpen, facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopScanner();
        onClose();
      }}
      title="Live Camera Barcode & Smart QR Scanner"
      subtitle="Point mobile/tablet camera at 1D Barcodes or Smart QR Codes to auto-add to bill"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-center">
        {/* Viewfinder Container */}
        <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#2D3138] bg-black min-h-[280px] flex items-center justify-center shadow-lg">
          <div id="camera-reader-viewport" className="w-full h-full min-h-[280px]"></div>

          {/* Scanner Overlay Line when scanning */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-64 border-2 border-[#C0392B] dark:border-[#E74C3C] rounded-xl relative flex items-center justify-center shadow-2xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#C0392B] dark:border-[#E74C3C]"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#C0392B] dark:border-[#E74C3C]"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#C0392B] dark:border-[#E74C3C]"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#C0392B] dark:border-[#E74C3C]"></div>
                <div className="w-full h-0.5 bg-[#C0392B] dark:bg-[#E74C3C] shadow-[0_0_8px_#C0392B] animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Scan Success Overlay */}
          {scanFeedback && (
            <div className="absolute bottom-3 inset-x-3 bg-emerald-600/90 text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 backdrop-blur-xs animate-bounce shadow-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="truncate">{scanFeedback}</span>
            </div>
          )}

          {/* Error Message */}
          {cameraError && (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
              <p className="text-xs text-rose-400 font-semibold">{cameraError}</p>
              <Button onClick={startScanner} variant="secondary" icon={RefreshCw}>
                Retry Camera Access
              </Button>
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsContinuous(!isContinuous)}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                isContinuous
                  ? 'bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 text-[#C0392B] dark:text-[#E74C3C] border-[#C0392B]/30'
                  : 'bg-white dark:bg-[#1E2126] text-slate-600 dark:text-[#9CA3AF] border-slate-200 dark:border-[#2D3138]'
              }`}
            >
              {isContinuous ? '⚡ Multi-Item Mode' : 'Single Item Mode'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-white dark:bg-[#1E2126] border border-slate-200 dark:border-[#2D3138] text-slate-700 dark:text-[#F1F1F1]"
              title={soundEnabled ? 'Beep Enabled' : 'Beep Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            <button
              type="button"
              onClick={toggleCameraFacing}
              className="p-2 rounded-lg bg-white dark:bg-[#1E2126] border border-slate-200 dark:border-[#2D3138] text-slate-700 dark:text-[#F1F1F1] flex items-center gap-1 font-semibold"
              title="Switch Camera (Front / Back)"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-[10px] hidden sm:inline">{facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF]">
          Align 1D Barcode or Smart QR Code inside the frame. Items automatically enter the billing list!
        </p>
      </div>
    </Modal>
  );
}
