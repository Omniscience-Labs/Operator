'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, FileText } from 'lucide-react';

// Import docx-preview
import { renderAsync, DocxPreviewOptions } from 'docx-preview';

interface DocxPreviewRendererProps {
  binaryUrl: string;
  fileName: string;
  className?: string;
}

export function DocxPreviewRenderer({ 
  binaryUrl, 
  fileName, 
  className 
}: DocxPreviewRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const styleContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const renderDocument = async () => {
      if (!containerRef.current || !styleContainerRef.current) {
        setError('Container references not available');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setDebugInfo('Starting document render...');

        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setError('Document rendering timed out after 30 seconds');
          setIsLoading(false);
        }, 30000);

        setDebugInfo('Fetching document from URL...');
        console.log('DocxPreviewRenderer: Fetching', binaryUrl);
        
        const response = await fetch(binaryUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        console.log('DocxPreviewRenderer: Content-Type:', contentType);
        setDebugInfo(`Document fetched. Content-Type: ${contentType || 'unknown'}`);

        const arrayBuffer = await response.arrayBuffer();
        console.log('DocxPreviewRenderer: ArrayBuffer size:', arrayBuffer.byteLength);
        setDebugInfo(`Document loaded. Size: ${arrayBuffer.byteLength} bytes`);

        if (arrayBuffer.byteLength === 0) {
          throw new Error('Document is empty');
        }

        // Clear timeout since we got the data
        clearTimeout(timeoutId);

        // Clear previous content
        containerRef.current.innerHTML = '';
        styleContainerRef.current.innerHTML = '';

        setDebugInfo('Rendering document with docx-preview...');
        console.log('DocxPreviewRenderer: Starting renderAsync');

        // Create a new timeout for the rendering process
        const renderTimeoutId = setTimeout(() => {
          setError('Document rendering process timed out');
          setIsLoading(false);
        }, 15000);

        const options: DocxPreviewOptions = {
          // Basic options to ensure compatibility
          className: 'docx-preview',
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          useBase64URL: false,
          debug: true // Enable debug mode
        };

        await renderAsync(arrayBuffer, containerRef.current, styleContainerRef.current, options);

        clearTimeout(renderTimeoutId);
        console.log('DocxPreviewRenderer: Render completed successfully');
        setDebugInfo('Document rendered successfully');
        setIsLoading(false);

      } catch (err) {
        console.error('DocxPreviewRenderer error:', err);
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to render document: ${errorMessage}`);
        setIsLoading(false);
        setDebugInfo(`Error: ${errorMessage}`);
      }
    };

    renderDocument();
  }, [binaryUrl]);

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">
          Failed to Preview Document
        </h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <details className="text-xs text-gray-500 max-w-md">
          <summary className="cursor-pointer mb-2">Debug Information</summary>
          <div className="text-left bg-gray-50 p-3 rounded border">
            <p><strong>File:</strong> {fileName}</p>
            <p><strong>URL:</strong> {binaryUrl}</p>
            <p><strong>Status:</strong> {debugInfo}</p>
          </div>
        </details>
        <div className="mt-4 text-xs text-gray-500">
          <p>Supported formats: .docx files only</p>
          <p>Try re-uploading the file if the issue persists</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-sm text-gray-600 mb-2">Loading document...</p>
          <p className="text-xs text-gray-400">{debugInfo}</p>
          <div className="mt-4 text-xs text-gray-500">
            <p>File: {fileName}</p>
            <p>This may take a few moments for larger documents</p>
          </div>
        </div>
      )}
      
      {/* Style container for docx-preview CSS */}
      <div ref={styleContainerRef} />
      
      {/* Main content container */}
      <div 
        ref={containerRef}
        className="docx-preview-container"
        style={{ 
          display: isLoading ? 'none' : 'block',
          fontFamily: 'inherit',
          lineHeight: 1.6
        }}
      />
    </div>
  );
} 