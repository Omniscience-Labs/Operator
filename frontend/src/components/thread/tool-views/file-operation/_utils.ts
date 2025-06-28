import { LucideIcon, FilePen, Replace, Trash2, FileText, FileCode, FileSpreadsheet, File } from 'lucide-react';

export type FileOperation = 'create' | 'rewrite' | 'delete' | 'read';

export interface OperationConfig {
  icon: LucideIcon;
  color: string;
  successMessage: string;
  progressMessage: string;
  bgColor: string;
  gradientBg: string;
  borderColor: string;
  badgeColor: string;
  hoverColor: string;
}

export const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const extensionMap: Record<string, string> = {
    // Web languages
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    json: 'json',
    jsonc: 'json',

    // Build and config files
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    env: 'bash',
    gitignore: 'bash',
    dockerignore: 'bash',

    // Scripting languages
    py: 'python',
    rb: 'ruby',
    php: 'php',
    go: 'go',
    java: 'java',
    kt: 'kotlin',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    swift: 'swift',
    rs: 'rust',

    // Shell scripts
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    bat: 'batch',
    cmd: 'batch',

    // Markup languages (excluding markdown which has its own renderer)
    svg: 'svg',
    tex: 'latex',

    // Data formats
    graphql: 'graphql',
    gql: 'graphql',
  };

  return extensionMap[extension] || 'text';
};

export const getOperationType = (name?: string, assistantContent?: any): FileOperation => {
  if (name) {
    if (name.includes('create')) return 'create';
    if (name.includes('rewrite')) return 'rewrite';
    if (name.includes('delete')) return 'delete';
    if (name.includes('read')) return 'read';
  }

  if (!assistantContent) return 'create';

  // Assuming normalizeContentToString is imported from existing utils
  const contentStr = typeof assistantContent === 'string' ? assistantContent : JSON.stringify(assistantContent);
  if (!contentStr) return 'create';

  if (contentStr.includes('<create-file>')) return 'create';
  if (contentStr.includes('<full-file-rewrite>')) return 'rewrite';
  if (contentStr.includes('<read-file>')) return 'read';
  if (
    contentStr.includes('delete-file') ||
    contentStr.includes('<delete>')
  )
    return 'delete';

  if (contentStr.toLowerCase().includes('create file')) return 'create';
  if (contentStr.toLowerCase().includes('rewrite file'))
    return 'rewrite';
  if (contentStr.toLowerCase().includes('read file')) return 'read';
  if (contentStr.toLowerCase().includes('delete file')) return 'delete';

  return 'create';
};

export const getOperationConfigs = (): Record<FileOperation, OperationConfig> => ({
  create: {
    icon: FilePen,
    color: 'text-emerald-600 dark:text-emerald-400',
    successMessage: 'File created successfully',
    progressMessage: 'Creating file...',
    bgColor: 'bg-gradient-to-b from-emerald-100 to-emerald-50 shadow-inner dark:from-emerald-800/40 dark:to-emerald-900/60 dark:shadow-emerald-950/20',
    gradientBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/20',
    badgeColor: 'bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 shadow-sm dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300',
    hoverColor: 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
  },
  rewrite: {
    icon: Replace,
    color: 'text-blue-600 dark:text-blue-400',
    successMessage: 'File rewritten successfully',
    progressMessage: 'Rewriting file...',
    bgColor: 'bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20',
    gradientBg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/20',
    badgeColor: 'bg-gradient-to-b from-blue-200 to-blue-100 text-blue-700 shadow-sm dark:from-blue-800/50 dark:to-blue-900/60 dark:text-blue-300',
    hoverColor: 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
  },
  delete: {
    icon: Trash2,
    color: 'text-rose-600 dark:text-rose-400',
    successMessage: 'File deleted successfully',
    progressMessage: 'Deleting file...',
    bgColor: 'bg-gradient-to-b from-rose-100 to-rose-50 shadow-inner dark:from-rose-800/40 dark:to-rose-900/60 dark:shadow-rose-950/20',
    gradientBg: 'bg-gradient-to-br from-rose-500/20 to-rose-600/10',
    borderColor: 'border-rose-500/20',
    badgeColor: 'bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 shadow-sm dark:from-rose-800/50 dark:to-rose-900/60 dark:text-rose-300',
    hoverColor: 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
  },
  read: {
    icon: FileText,
    color: 'text-purple-600 dark:text-purple-400',
    successMessage: 'File read successfully',
    progressMessage: 'Reading file...',
    bgColor: 'bg-gradient-to-b from-purple-100 to-purple-50 shadow-inner dark:from-purple-800/40 dark:to-purple-900/60 dark:shadow-purple-950/20',
    gradientBg: 'bg-gradient-to-br from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/20',
    badgeColor: 'bg-gradient-to-b from-purple-200 to-purple-100 text-purple-700 shadow-sm dark:from-purple-800/50 dark:to-purple-900/60 dark:text-purple-300',
    hoverColor: 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
  },
});

export const getFileIcon = (fileName: string): LucideIcon => {
  if (fileName.endsWith('.md')) return FileCode;
  if (fileName.endsWith('.csv')) return FileSpreadsheet;
  if (fileName.endsWith('.html')) return FileCode;
  return File;
};

export const processFilePath = (filePath: string | null): string | null => {
  return filePath
    ? filePath.trim().replace(/\\n/g, '\n').split('\n')[0]
    : null;
};

export const getFileName = (processedFilePath: string | null): string => {
  return processedFilePath
    ? processedFilePath.split('/').pop() || processedFilePath
    : '';
};

export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

export const isFileType = {
  markdown: (fileExtension: string): boolean => fileExtension === 'md',
  html: (fileExtension: string): boolean => fileExtension === 'html' || fileExtension === 'htm',
  csv: (fileExtension: string): boolean => fileExtension === 'csv',
};

export const hasLanguageHighlighting = (language: string): boolean => {
  return language !== 'text';
};

export const splitContentIntoLines = (fileContent: string | null): string[] => {
  return fileContent
    ? fileContent.replace(/\\n/g, '\n').split('\n')
    : [];
};