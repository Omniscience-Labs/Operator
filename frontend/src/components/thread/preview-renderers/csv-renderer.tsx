'use client';

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';

interface CsvRendererProps {
    content: string;
    className?: string;
}

/**
 * Parse CSV content into a data structure with headers and rows
 */
function parseCSV(content: string) {
    if (!content) return { data: [], headers: [] };

    try {
        const results = Papa.parse(content, {
            header: true,
            skipEmptyLines: true
        });

        let headers: string[] = [];
        if (results.meta && results.meta.fields) {
            headers = results.meta.fields || [];
        }

        return { headers, data: results.data };
    } catch (error) {
        console.error("Error parsing CSV:", error);
        return { headers: [], data: [] };
    }
}

/**
 * CSV/TSV renderer that presents data in a table format
 */
export function CsvRenderer({
    content,
    className
}: CsvRendererProps) {
    // Generate unique instance ID to prevent key conflicts across multiple CSV renderers
    const instanceId = useMemo(() => crypto.randomUUID(), []);
    
    const parsedData = parseCSV(content);
    const isEmpty = parsedData.data.length === 0;

    return (
        <div className={cn('w-full h-full overflow-hidden', className)}>
            <ScrollArea className="w-full h-full">
                <div className="p-0">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-muted sticky top-0">
                            <tr>
                                {parsedData.headers.map((header, index) => (
                                    <th key={`${instanceId}-header-${index}`} className="px-3 py-2 text-left font-medium border border-border">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!isEmpty ? parsedData.data.map((row: any, rowIndex) => (
                                <tr key={`${instanceId}-row-${rowIndex}`} className="border-b border-border hover:bg-muted/50">
                                    {parsedData.headers.map((header, cellIndex) => (
                                        <td key={`${instanceId}-cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 border border-border">
                                            {row[header] || ''}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={parsedData.headers.length || 1} className="py-4 text-center text-muted-foreground">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </ScrollArea>
        </div>
    );
} 