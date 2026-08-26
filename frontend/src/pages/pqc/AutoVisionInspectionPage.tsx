import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, ScanBarcode, CheckCircle2, Circle, Target, ChevronRight } from 'lucide-react';

type InspectionStage = 'SCANNING' | 'INSPECTING' | 'COMPLETED';

interface Checkpoint {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'CHECKING' | 'PASSED' | 'FAILED';
}

const INITIAL_CHECKPOINTS: Checkpoint[] = [
  { id: 'group_a', name: 'Balloons 62-66', description: 'Check main bore presence and profile', status: 'PENDING' },
  { id: 'group_b', name: 'Balloons 70-73', description: 'Verify 3x M6 Threaded Holes', status: 'PENDING' },
  { id: 'group_c', name: 'Balloons 10-13', description: 'Validate flange holes', status: 'PENDING' }
];

export default function AutoVisionInspectionPage() {
  const [stage, setStage] = useState<InspectionStage>('SCANNING');
  const [partId, setPartId] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(INITIAL_CHECKPOINTS);
  const [activeCheckIndex, setActiveCheckIndex] = useState<number>(0);
  const webcamRef = useRef<Webcam>(null);
  useEffect(() => {
    if (stage === 'SCANNING') {
      const qrElement = document.getElementById('qr-reader');
      // Prevent double initialization if it already has children
      if (qrElement && qrElement.innerHTML !== '') {
        qrElement.innerHTML = '';
      }

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [ Html5QrcodeSupportedFormats.DATA_MATRIX, Html5QrcodeSupportedFormats.QR_CODE ],
          videoConstraints: { facingMode: "environment" }
        },
        false
      );
      
      scanner.render((decodedText) => {
        if (!decodedText || decodedText.trim() === '') return;
        console.log("Scanned QR:", decodedText);
        
        scanner.clear().then(() => {
          setPartId(decodedText);
          setStage('INSPECTING');
          setCheckpoints([...INITIAL_CHECKPOINTS]);
          setActiveCheckIndex(0);
        }).catch(e => console.error("Error clearing scanner", e));
      }, (err) => {
        // Ignore scan errors as it scans constantly
      });

      return () => {
        scanner.clear().catch(e => console.error('Failed to clear scanner', e));
      };
    }
  }, [stage]);

  // Fallback for testing without a printed QR code
  const handleSimulateScan = () => {
    setPartId('TURBINE-HSG-6443124');
    setStage('INSPECTING');
    setCheckpoints([...INITIAL_CHECKPOINTS]);
    setActiveCheckIndex(0);
  };

  const handleVerifyCurrentPoint = () => {
    if (activeCheckIndex >= checkpoints.length) return;

    // Set checking state
    const newCheckpoints = [...checkpoints];
    newCheckpoints[activeCheckIndex].status = 'CHECKING';
    setCheckpoints(newCheckpoints);

    // Simulate OpenCV vision processing delay
    setTimeout(() => {
      const updated = [...newCheckpoints];
      updated[activeCheckIndex].status = 'PASSED';
      setCheckpoints(updated);

      if (activeCheckIndex < checkpoints.length - 1) {
        setActiveCheckIndex(activeCheckIndex + 1);
      } else {
        setTimeout(() => setStage('COMPLETED'), 1000);
      }
    }, 1500);
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, background: 'var(--copper-bronze)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScanBarcode size={24} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>Auto-Vision Inspection</h1>
          <p style={{ fontSize: 14, color: 'var(--slate)', margin: '4px 0 0 0' }}>AI-assisted geometry validation</p>
        </div>
      </div>

      {stage === 'SCANNING' && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: 'var(--bone-white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', border: '2px dashed var(--ash)' }}>
            <ScanBarcode size={40} color="var(--copper-bronze)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 12 }}>Scan Part QR Code</h2>
          <p style={{ fontSize: 14, color: 'var(--ash)', maxWidth: 400, margin: '0 auto 32px auto' }}>
            Please present the physical part's traveler 2D Data Matrix or QR code to load the 3D inspection profile.
          </p>
          
          <div id="qr-reader" style={{ width: '100%', maxWidth: '100%', minHeight: 300, margin: '0 auto 24px auto', overflow: 'hidden' }}></div>
          
          <button className="btn btn-secondary" onClick={handleSimulateScan} style={{ padding: '8px 16px', fontSize: 14 }}>
            Skip Scan (Testing)
          </button>
        </div>
      )}

      {stage === 'INSPECTING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Camera Feed */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={18} color="var(--charcoal)" />
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Live Camera Feed</h3>
              </div>
              <span className="badge badge-in-progress">Analyzing...</span>
            </div>
            
            <div style={{ flex: 1, background: '#000', borderRadius: 8, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 600 }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* Target Reticle Overlay */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 200, border: '2px solid rgba(0, 255, 0, 0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={60} color="rgba(0, 255, 0, 0.5)" />
              </div>
              
              {/* Instructions Overlay */}
              <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '12px 24px', borderRadius: 30, fontSize: 14, fontWeight: 500 }}>
                  Align the {checkpoints[activeCheckIndex]?.name} within the reticle
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleVerifyCurrentPoint}
                disabled={checkpoints[activeCheckIndex]?.status === 'CHECKING'}
                style={{ padding: '12px 32px', fontSize: 16, borderRadius: 30 }}
              >
                {checkpoints[activeCheckIndex]?.status === 'CHECKING' ? 'Processing Image...' : 'Verify Feature'}
              </button>
            </div>
          </div>

          {/* Checklist */}
          <div className="card" style={{ padding: 24, width: '100%' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 24, borderBottom: '1px solid var(--silk)', paddingBottom: 16 }}>Inspection Sequence</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {checkpoints.map((cp, idx) => {
                const isActive = idx === activeCheckIndex;
                const isPassed = cp.status === 'PASSED';
                const isChecking = cp.status === 'CHECKING';
                
                return (
                  <div key={cp.id} style={{ 
                    display: 'flex', 
                    gap: 16, 
                    padding: 16, 
                    borderRadius: 8,
                    background: isActive ? 'var(--bone-white)' : 'transparent',
                    border: isActive ? '1px solid var(--copper-bronze)' : '1px solid var(--silk)',
                    opacity: (!isActive && !isPassed) ? 0.6 : 1
                  }}>
                    <div style={{ marginTop: 2 }}>
                      {isPassed ? (
                        <CheckCircle2 size={20} color="var(--status-approved)" />
                      ) : isActive ? (
                        isChecking ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Target size={20} color="var(--copper-bronze)" />
                      ) : (
                        <Circle size={20} color="var(--ash)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--copper-bronze)' : 'var(--charcoal)', marginBottom: 4 }}>
                        {cp.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', lineHeight: 1.4 }}>
                        {cp.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {stage === 'COMPLETED' && (
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: '#E6F4EA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <CheckCircle2 size={40} color="var(--status-approved)" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 12 }}>Inspection Passed</h2>
          <p style={{ fontSize: 15, color: 'var(--ash)', maxWidth: 400, margin: '0 auto 32px auto' }}>
            All critical geometry checks (Balloons 62-66, 70-73, 10-13) have been successfully verified via camera.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setStage('SCANNING')}>Scan Next Part</button>
            <button className="btn btn-primary">Save to PQC Report</button>
          </div>
        </div>
      )}
    </div>
  );
}
