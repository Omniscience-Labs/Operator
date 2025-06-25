import { 
  FileSpreadsheet,
  Table2,
  Plus,
  FileText,
  Sheet,
  TableProperties,
  Grid3x3,
  type LucideIcon
} from 'lucide-react';
import { extractToolData } from '../utils';

export interface ExcelData {
  operation?: 'create-workbook' | 'write-data' | 'read-data' | 'list-sheets';
  filePath?: string;
  sheetName?: string;
  sheets?: string[];
  data?: any[][];
  cellRange?: string;
  success?: boolean;
  message?: string;
  error?: string;
  rows?: number;
  columns?: number;
  count?: number;
}

export interface ParsedExcelData extends ExcelData {
  actualIsSuccess: boolean;
  actualToolTimestamp?: string;
  actualAssistantTimestamp?: string;
}

const parseContent = (content: any): any => {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }
  return content;
};

export const extractExcelData = (
  assistantContent?: string,
  toolContent?: string,
  isSuccess?: boolean,
  toolTimestamp?: string,
  assistantTimestamp?: string
): ParsedExcelData => {
  let operation: ExcelData['operation'];
  let data: ExcelData = {};
  let actualIsSuccess = isSuccess ?? true;
  const actualToolTimestamp = toolTimestamp;
  const actualAssistantTimestamp = assistantTimestamp;

  // Use the standard tool data extraction
  const assistantToolData = extractToolData(assistantContent);
  const toolToolData = extractToolData(toolContent);

  // Determine operation from assistant content
  if (assistantToolData.toolResult) {
    const toolName = assistantToolData.toolResult.toolName;
    if (toolName === 'create-workbook' || toolName === 'create_workbook') {
      operation = 'create-workbook';
    } else if (toolName === 'write-data' || toolName === 'write_data') {
      operation = 'write-data';
    } else if (toolName === 'read-data' || toolName === 'read_data') {
      operation = 'read-data';
    } else if (toolName === 'list-sheets' || toolName === 'list_sheets') {
      operation = 'list-sheets';
    }
    
    // Extract parameters from arguments
    if (assistantToolData.arguments) {
      data = { 
        filePath: assistantToolData.arguments.file_path,
        sheetName: assistantToolData.arguments.sheet_name,
        sheets: assistantToolData.arguments.sheet_names,
        cellRange: assistantToolData.arguments.cell_range,
        data: assistantToolData.arguments.data,
      };
    }
  } else if (assistantContent) {
    // Fallback to old parsing logic
    const assistantParsed = parseContent(assistantContent);
    
    // Convert to string for checking operation type
    const contentStr = typeof assistantContent === 'string' 
      ? assistantContent 
      : JSON.stringify(assistantContent);
    
    // Determine operation from tool name or content
    if (contentStr.includes('create_workbook') || contentStr.includes('create-workbook')) {
      operation = 'create-workbook';
    } else if (contentStr.includes('write_data') || contentStr.includes('write-data')) {
      operation = 'write-data';
    } else if (contentStr.includes('read_data') || contentStr.includes('read-data')) {
      operation = 'read-data';
    } else if (contentStr.includes('list_sheets') || contentStr.includes('list-sheets')) {
      operation = 'list-sheets';
    }

    // Extract parameters from assistant content
    if (typeof assistantParsed === 'object' && assistantParsed.parameters) {
      data = { 
        filePath: assistantParsed.parameters.file_path,
        sheetName: assistantParsed.parameters.sheet_name,
        sheets: assistantParsed.parameters.sheet_names,
        cellRange: assistantParsed.parameters.cell_range,
        data: assistantParsed.parameters.data,
      };
    }
  }

  // Parse tool response - this contains the actual results
  if (toolToolData.toolResult) {
    // The tool response is already parsed, extract the output
    const output = toolToolData.toolResult.toolOutput;
    if (output) {
      try {
        // Try to parse the output as JSON
        const parsedOutput = typeof output === 'string' ? JSON.parse(output) : output;
        
        // Extract all the result data
        actualIsSuccess = parsedOutput.success ?? toolToolData.toolResult.isSuccess ?? true;
        
        // Merge the response data with what we already have
        data = {
          ...data,
          ...parsedOutput,
          filePath: parsedOutput.file_path || data.filePath,
          sheetName: parsedOutput.sheet || parsedOutput.sheet_name || data.sheetName,
          cellRange: parsedOutput.range || parsedOutput.cell_range || data.cellRange,
        };
      } catch (e) {
        // If parsing fails, use raw output
        if (output && typeof output === 'object') {
          const outputObj = output as Record<string, any>;
          data = { ...data, ...outputObj };
          actualIsSuccess = outputObj.success ?? true;
        }
      }
    }
  } else if (toolContent) {
    // Fallback to old parsing logic
    const toolParsed = parseContent(toolContent);
    
    if (typeof toolParsed === 'object') {
      // Handle direct response format
      if ('success' in toolParsed) {
        actualIsSuccess = toolParsed.success;
        data = { ...data, ...toolParsed };
      }
      // Handle nested output format
      else if (toolParsed.output && typeof toolParsed.output === 'object') {
        actualIsSuccess = toolParsed.output.success ?? true;
        data = { ...data, ...toolParsed.output };
      }
    }
  }

  return {
    operation,
    ...data,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp,
  };
};

export const getOperationConfig = (operation?: ExcelData['operation']) => {
  const configs = {
    'create-workbook': {
      icon: Plus,
      title: 'Create Workbook',
      description: 'Creating new Excel file',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBgColor: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-emerald-500/20',
    },
    'write-data': {
      icon: Table2,
      title: 'Write Data',
      description: 'Writing data to worksheet',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconBgColor: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/20',
    },
    'read-data': {
      icon: Grid3x3,
      title: 'Read Data',
      description: 'Reading data from worksheet',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconBgColor: 'bg-gradient-to-br from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/20',
    },
    'list-sheets': {
      icon: Sheet,
      title: 'List Sheets',
      description: 'Listing worksheets',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconBgColor: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/20',
    },
  };

  return configs[operation || 'create-workbook'] || configs['create-workbook'];
};

export const formatCellRange = (range?: string): string => {
  if (!range) return 'A1';
  return range;
};

export const formatDataPreview = (data?: any[][]): { preview: any[][], hasMore: boolean } => {
  if (!data || data.length === 0) {
    return { preview: [], hasMore: false };
  }

  const maxRows = 10;
  const maxCols = 10;
  
  const preview = data.slice(0, maxRows).map(row => 
    Array.isArray(row) ? row.slice(0, maxCols) : [row]
  );
  
  const hasMore = data.length > maxRows || (data[0] && Array.isArray(data[0]) && data[0].length > maxCols);
  
  return { preview, hasMore };
};

export const getCellValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const getColumnLetter = (index: number): string => {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

export const getExcelIcon = (): LucideIcon => {
  return FileSpreadsheet;
};

export const formatSheetName = (name: string): string => {
  // Truncate long sheet names for display
  if (name.length > 20) {
    return name.substring(0, 17) + '...';
  }
  return name;
};

export const isNumeric = (value: any): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

export const formatCellDisplay = (value: any): { display: string, isNumber: boolean, isFormula: boolean } => {
  const strValue = getCellValue(value);
  const isNumber = isNumeric(value);
  const isFormula = typeof value === 'string' && value.startsWith('=');
  
  return {
    display: strValue,
    isNumber,
    isFormula
  };
}; 