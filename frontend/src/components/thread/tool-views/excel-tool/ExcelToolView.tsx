import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  CircleDashed,
  Clock,
  ChevronRight,
  Table2,
  Eye,
  Grid3x3,
  Sheet,
  Plus,
  FileText,
  Download,
  Upload,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp, getToolTitle } from '../utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { 
  extractExcelData, 
  getOperationConfig, 
  formatCellRange,
  formatDataPreview,
  getCellValue,
  getColumnLetter,
  formatSheetName,
  formatCellDisplay,
  type ParsedExcelData 
} from './_utils';

export function ExcelToolView({
  name = 'excel-tool',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {
  const [expandedView, setExpandedView] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  const data = extractExcelData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const config = getOperationConfig(data.operation);
  const Icon = config.icon;
  const toolTitle = config.title;

  const renderDataTable = (tableData: any[][], showHeaders: boolean = true) => {
    if (!tableData || tableData.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-zinc-400">
          <Grid3x3 className="h-8 w-8 mr-2" />
          <span>No data available</span>
        </div>
      );
    }

    const { preview, hasMore } = formatDataPreview(tableData);
    const hasHeaders = showHeaders && preview.length > 0;
    const headers = hasHeaders ? preview[0] : [];
    const rows = hasHeaders ? preview.slice(1) : preview;

    return (
      <div className="w-full">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 w-10">
                  #
                </th>
                {headers.map((_, colIndex) => (
                  <th 
                    key={colIndex} 
                    className="border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 min-w-[100px]"
                  >
                    {getColumnLetter(colIndex)}
                  </th>
                ))}
              </tr>
              {hasHeaders && (
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    1
                  </td>
                  {headers.map((header, colIndex) => {
                    const { display, isNumber, isFormula } = formatCellDisplay(header);
                    return (
                      <td 
                        key={colIndex} 
                        className={cn(
                          "border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm",
                          "bg-zinc-50 dark:bg-zinc-800/50 font-semibold",
                          isNumber && "text-right",
                          isFormula && "font-mono text-xs"
                        )}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const actualRowNumber = hasHeaders ? rowIndex + 2 : rowIndex + 1;
                return (
                  <tr key={rowIndex} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {actualRowNumber}
                    </td>
                    {Array.isArray(row) ? row.map((cell, colIndex) => {
                      const { display, isNumber, isFormula } = formatCellDisplay(cell);
                      return (
                        <td 
                          key={colIndex} 
                          className={cn(
                            "border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm",
                            "bg-white dark:bg-zinc-900",
                            isNumber && "text-right tabular-nums",
                            isFormula && "font-mono text-xs text-purple-600 dark:text-purple-400"
                          )}
                        >
                          {display}
                        </td>
                      );
                    }) : (
                      <td 
                        colSpan={headers.length || 1} 
                        className="border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-900"
                      >
                        {getCellValue(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="mt-3 text-center">
            <Badge variant="secondary" className="text-xs">
              Showing preview of {preview.length} × {preview[0]?.length || 0} cells
            </Badge>
          </div>
        )}
      </div>
    );
  };

  const renderSheetTabs = (sheets: string[]) => {
    if (!sheets || sheets.length === 0) return null;

    return (
      <div className="flex items-center gap-1 p-2 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 overflow-x-auto">
        {sheets.map((sheet, index) => (
          <button
            key={index}
            onClick={() => setSelectedSheet(sheet)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
              selectedSheet === sheet
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-900/50"
            )}
          >
            <Sheet className="h-3 w-3" />
            {formatSheetName(sheet)}
          </button>
        ))}
      </div>
    );
  };

  const renderOperationContent = () => {
    switch (data.operation) {
      case 'create-workbook':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={cn("p-3 rounded-lg", config.iconBgColor, config.borderColor, "border")}>
                <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {data.filePath || 'New Workbook'}
                </h4>
                {data.message && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{data.message}</p>
                )}
                {data.sheets && data.sheets.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Created sheets:</p>
                    <div className="flex flex-wrap gap-2">
                      {data.sheets.map((sheet, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <Sheet className="h-3 w-3 mr-1" />
                          {sheet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'write-data':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">File:</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {data.filePath || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Sheet:</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {data.sheetName || 'Sheet1'}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Range:</span>
                <Badge variant="outline" className="mt-1">
                  {formatCellRange(data.cellRange)}
                </Badge>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Data Size:</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {data.data ? `${data.data.length} rows` : 'No data'}
                </p>
              </div>
            </div>
            {data.data && data.data.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Data Written</h5>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setExpandedView(!expandedView)}
                  >
                    {expandedView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
                <div className={cn(
                  "border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden",
                  expandedView ? "max-h-none" : "max-h-64"
                )}>
                  <ScrollArea className={expandedView ? "h-[400px]" : "h-full"}>
                    {renderDataTable(data.data, false)}
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        );

      case 'read-data':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">File:</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {data.filePath || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Sheet:</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {data.sheetName || 'Sheet1'}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Range:</span>
                <Badge variant="outline" className="mt-1">
                  {formatCellRange(data.cellRange)}
                </Badge>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Data Size:</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">
                  {data.rows && data.columns 
                    ? `${data.rows} × ${data.columns}` 
                    : data.data 
                    ? `${data.data.length} rows`
                    : 'No data'}
                </p>
              </div>
            </div>
            {data.data && data.data.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Data Retrieved</h5>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setExpandedView(!expandedView)}
                  >
                    {expandedView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
                <div className={cn(
                  "border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900",
                  expandedView ? "max-h-none" : "max-h-96"
                )}>
                  <ScrollArea className={expandedView ? "h-[500px]" : "h-full"}>
                    {renderDataTable(data.data, true)}
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        );

      case 'list-sheets':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={cn("p-3 rounded-lg", config.iconBgColor, config.borderColor, "border")}>
                <FileSpreadsheet className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {data.filePath || 'Workbook'}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {data.count || data.sheets?.length || 0} sheets found
                </p>
              </div>
            </div>
            {data.sheets && data.sheets.length > 0 && (
              <div className="space-y-2">
                {data.sheets.map((sheet, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <Sheet className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {sheet}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Sheet {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center py-8 text-zinc-500 dark:text-zinc-400">
            <FileSpreadsheet className="h-8 w-8 mr-2" />
            <span>Excel operation completed</span>
          </div>
        );
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-none">
      <CardHeader className="pb-3 px-4 pt-4 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.iconBgColor, config.borderColor, "border")}>
              <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {toolTitle}
              </CardTitle>
              {data.filePath && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {data.filePath}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isStreaming && (
              <Badge
                variant={data.actualIsSuccess ? "secondary" : "destructive"}
                className="text-xs"
              >
                {data.actualIsSuccess ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {data.actualIsSuccess ? "Success" : "Failed"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isStreaming ? (
          <LoadingState
            icon={Icon}
            iconColor="text-zinc-600 dark:text-zinc-400"
            bgColor={cn("bg-gradient-to-b", config.bgColor)}
            title={config.description}
            filePath={data.filePath}
            showProgress={true}
          />
        ) : data.error ? (
          <div className="p-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-100">Error</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{data.error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {renderOperationContent()}
          </div>
        )}

        {data.sheets && data.sheets.length > 1 && data.operation !== 'list-sheets' && (
          renderSheetTabs(data.sheets)
        )}
      </CardContent>

      {!isStreaming && (
        <div className="px-4 py-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="h-3 w-3" />
            {data.actualToolTimestamp
              ? formatTimestamp(data.actualToolTimestamp)
              : data.actualAssistantTimestamp
              ? formatTimestamp(data.actualAssistantTimestamp)
              : ''}
          </div>
          {data.operation && (
            <Badge variant="outline" className="text-xs">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Excel {data.operation.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
} 