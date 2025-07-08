export const DEFAULT_AGENTPRESS_TOOLS: Record<string, { enabled: boolean; description: string; icon: string; color: string }> = {
    'sb_shell_tool': { enabled: false, description: 'Execute shell commands in tmux sessions for terminal operations, CLI tools, and system management', icon: '💻', color: 'bg-slate-100 dark:bg-slate-800' },
    'sb_files_tool': { enabled: false, description: 'Create, read, update, and delete files in the workspace with comprehensive file management', icon: '📁', color: 'bg-blue-100 dark:bg-blue-800/50' },
    'sb_browser_tool': { enabled: false, description: 'Browser automation for web navigation, clicking, form filling, and page interaction', icon: '🌐', color: 'bg-indigo-100 dark:bg-indigo-800/50' },
    'sb_deploy_tool': { enabled: false, description: 'Deploy applications and services with automated deployment capabilities', icon: '🚀', color: 'bg-green-100 dark:bg-green-800/50' },
    'sb_expose_tool': { enabled: false, description: 'Expose services and manage ports for application accessibility', icon: '🔌', color: 'bg-orange-100 dark:bg-orange-800/20' },
    'web_search_tool': { enabled: false, description: 'Search the web using Tavily API and scrape webpages with Firecrawl for research', icon: '🔍', color: 'bg-yellow-100 dark:bg-yellow-800/50' },
    'sb_vision_tool': { enabled: false, description: 'Vision and image processing capabilities for visual content analysis', icon: '👁️', color: 'bg-pink-100 dark:bg-pink-800/50' },
    'sb_excel_tool': { enabled: false, description: 'Excel file operations including creating, reading, writing, and formatting spreadsheets', icon: '📊', color: 'bg-emerald-100 dark:bg-emerald-800/50' },
    'sb_pdf_form_tool': { enabled: false, description: 'PDF form operations including reading form fields, filling forms, and flattening PDFs', icon: '📄', color: 'bg-purple-100 dark:bg-purple-800/50' },
    'sb_audio_transcription_tool': { enabled: false, description: 'Transcribe audio files up to 2 hours in length with automatic chunking for large files', icon: '🎤', color: 'bg-rose-100 dark:bg-rose-800/50' },
    'data_providers_tool': { enabled: false, description: 'Access to data providers and external APIs like Apollo (requires API key)', icon: '🔗', color: 'bg-cyan-100 dark:bg-cyan-800/50' },
    'sb_podcast_tool': { enabled: false, description: 'Generate AI-powered podcasts from URLs, files, images, and other content sources with customizable conversation styles', icon: '🎙️', color: 'bg-violet-100 dark:bg-violet-800/50' },
};

export const getToolDisplayName = (toolName: string): string => {
    const displayNames: Record<string, string> = {
      'sb_shell_tool': 'Terminal',
      'sb_files_tool': 'File Manager',
      'sb_browser_tool': 'Browser Automation',
      'sb_deploy_tool': 'Deploy Tool',
      'sb_expose_tool': 'Port Exposure',
      'web_search_tool': 'Web Search',
      'sb_vision_tool': 'Image Processing',
      'sb_excel_tool': 'Excel Operations',
      'sb_pdf_form_tool': 'PDF Form Filler',
      'data_providers_tool': 'Data Providers',
      'sb_audio_transcription_tool': 'Audio Transcription',
      'sb_podcast_tool': 'Audio Overviews',
    };
    
    return displayNames[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };