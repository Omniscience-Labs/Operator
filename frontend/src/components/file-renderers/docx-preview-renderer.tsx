'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle } from 'lucide-react';

// Import docx-preview
import { renderAsync } from 'docx-preview';

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

  useEffect(() => {
    const renderDocument = async () => {
      if (!containerRef.current || !styleContainerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch the document
        const response = await fetch(binaryUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Clear previous content
        containerRef.current.innerHTML = '';
        styleContainerRef.current.innerHTML = '';
        
        // Render with docx-preview using default configuration
        await renderAsync(arrayBuffer, containerRef.current, styleContainerRef.current, {
          className: 'docx-preview',
          inWrapper: true,
          hideWrapperOnPrint: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          renderChanges: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderComments: false,
          renderAltChunks: true,
          debug: false
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error rendering DOCX:', err);
        setError(err instanceof Error ? err.message : 'Failed to render document');
        setIsLoading(false);
      }
    };

    renderDocument();
  }, [binaryUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{fileName}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md p-6">
          <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Document</h3>
          <p className="text-sm text-muted-foreground mb-2">{error}</p>
          <p className="text-xs text-muted-foreground">
            The document may be corrupted or in an unsupported format.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('docx-preview-container w-full h-full', className)}>
      {/* Style container for document styles, fonts, numberings */}
      <div ref={styleContainerRef} className="docx-styles" />
      
      {/* Main content container */}
      <div 
        ref={containerRef} 
        className="docx-content overflow-auto max-h-full w-full"
      />
    </div>
  );
} 