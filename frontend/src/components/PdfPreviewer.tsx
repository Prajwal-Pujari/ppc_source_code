import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Loader2, AlertCircle } from 'lucide-react';

// Use the local legacy ES5 worker downloaded to the public folder!
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.js';

interface PdfPreviewerProps {
  url: string;
}

export function PdfPreviewer({ url }: PdfPreviewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Failed to load PDF', error);
    setError(true);
    setLoading(false);
  }

  // Clear any unhandled error hooks
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.js';

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, gap: 16 }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />
        </div>
      )}
      
      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#dc2626', gap: 16 }}>
          <AlertCircle size={48} />
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Failed to render PDF inline.</p>
          <a href={url} download style={{ marginTop: 12, display: 'inline-block', background: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Download PDF</a>
        </div>
      )}

      <div style={{ padding: '20px 0', display: error ? 'none' : 'block' }}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<Loader2 size={36} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} style={{ marginBottom: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: 8, overflow: 'hidden' }}>
              <Page 
                pageNumber={index + 1} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={Math.min(window.innerWidth - 64, 800)}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
