import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * QRCameraScanner Component
 * Uses html5-qrcode to scan physical or on-screen QR passes via the device camera.
 * Robustly handles browser camera permissions, permission denial, and camera hardware absence.
 * 
 * @param {Object} props
 * @param {(scannedText: string) => void} props.onScan - Callback invoked when a QR code is detected
 * @param {() => void} [props.onClose] - Optional close/cancel callback
 */
export default function QRCameraScanner({ onScan, onClose }) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState('');
  const scannerRef = useRef(null);
  const elementId = 'accesspass-qr-reader';

  const startScanner = async () => {
    setErrorMessage('');
    setScanSuccessMessage('');

    try {
      // Check if camera permission and mediaDevices API exist
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment.');
      }

      // Initialize scanner instance
      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' }, // Back camera preferred on phones, front camera fallback
        config,
        (decodedText) => {
          // Successfully scanned a QR code!
          let extractedCode = decodedText.trim();

          // Try parsing JSON if encoded as structured payload
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.token) extractedCode = parsed.token;
            else if (parsed.passToken) extractedCode = parsed.passToken;
            else if (parsed.ref) extractedCode = parsed.ref;
          } catch (e) {
            // Raw string token or reference code
          }

          setScanSuccessMessage(`Scanned: ${extractedCode}`);

          // Stop scanner and notify parent
          stopScanner().then(() => {
            onScan(extractedCode);
          });
        },
        (error) => {
          // Frame parse error (can be ignored while waiting for QR)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera Scanner Error:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setErrorMessage(
          'Camera permission was denied. Please click the camera/lock icon in your browser address bar to allow camera access, or type the code manually below.'
        );
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        setErrorMessage(
          'No camera detected on this system. Please use manual code entry.'
        );
      } else {
        setErrorMessage(
          `Unable to start camera scanner: ${err.message || 'Unknown device error'}. You can still enter the code manually.`
        );
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Browser Camera Scanner</h3>
        </div>

        <div className="flex items-center space-x-2">
          {isScanning ? (
            <button
              type="button"
              onClick={stopScanner}
              className="inline-flex items-center px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md border border-slate-700"
            >
              <CameraOff className="w-3.5 h-3.5 mr-1" />
              Stop Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={startScanner}
              className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              Start Camera
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={() => { stopScanner(); onClose(); }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Permission or Hardware Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Success Notification */}
      {scanSuccessMessage && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="font-semibold">{scanSuccessMessage}</p>
        </div>
      )}

      {/* Viewfinder Container */}
      <div className="flex flex-col items-center justify-center">
        <div
          id={elementId}
          className="w-full max-w-sm rounded-lg overflow-hidden bg-black aspect-square flex items-center justify-center border border-slate-800"
        >
          {!isScanning && (
            <div className="text-center p-6 text-slate-500">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium text-slate-400">
                Camera is idle. Click "Start Camera" above to activate the live scanner.
              </p>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-2 text-center">
          Point the camera towards the visitor's printed or on-screen digital QR pass.
        </p>
      </div>
    </div>
  );
}
