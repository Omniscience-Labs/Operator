'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Folder, FileAudio, MoreHorizontal, Edit2, Trash2, Download, Share2, FolderOpen, Move, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  getMeetings,
  getFolders,
  getAllFolders,
  createMeeting,
  createFolder,
  deleteMeeting,
  deleteFolder,
  updateMeeting,
  updateFolder,
  searchMeetings,
  type Meeting,
  type MeetingFolder,
  type SearchResult,
} from '@/lib/api-meetings';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [folders, setFolders] = useState<MeetingFolder[]>([]);
  const [allFolders, setAllFolders] = useState<MeetingFolder[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id?: string; name: string }[]>([{ name: 'All Meetings' }]);
  
  // Dialog states
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'meeting' | 'folder'; id: string; name: string } | null>(null);
  
  // Drag and drop states
  const [draggedItem, setDraggedItem] = useState<{ type: 'meeting' | 'folder'; id: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Load meetings and folders
  useEffect(() => {
    loadData();
    loadAllFolders();
    loadAllMeetings();
  }, [currentFolderId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [meetingsData, foldersData] = await Promise.all([
        getMeetings(currentFolderId),
        getFolders(currentFolderId),
      ]);
      setMeetings(meetingsData);
      setFolders(foldersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllFolders = async () => {
    try {
      const allFoldersData = await getAllFolders();
      setAllFolders(allFoldersData);
    } catch (error) {
      console.error('Error loading all folders:', error);
    }
  };

  const loadAllMeetings = async () => {
    try {
      const allMeetingsData = await getMeetings();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api'}/meetings?include_all=true`, {
        headers: {
          Authorization: `Bearer ${(await createClient().auth.getSession()).data.session?.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAllMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error loading all meetings:', error);
    }
  };

  const getMeetingCountForFolder = (folderId: string): number => {
    return allMeetings.filter(meeting => meeting.folder_id === folderId).length;
  };

  // Search functionality
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const results = await searchMeetings(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
          toast.error('Search failed');
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleCreateMeeting = async () => {
    if (!newMeetingTitle.trim()) return;

    try {
      const meeting = await createMeeting(newMeetingTitle, currentFolderId, 'local');
      setShowNewMeetingDialog(false);
      setNewMeetingTitle('');
      router.push(`/meetings/${meeting.meeting_id}`);
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder(newFolderName, currentFolderId);
      setShowNewFolderDialog(false);
      setNewFolderName('');
      loadData();
      toast.success('Folder created');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      loadData();
      toast.success('Meeting deleted');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      loadData();
      toast.success('Folder deleted');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const handleRename = async () => {
    if (!editingItem || !editingItem.name.trim()) return;

    try {
      if (editingItem.type === 'meeting') {
        await updateMeeting(editingItem.id, { title: editingItem.name });
      } else {
        await updateFolder(editingItem.id, { name: editingItem.name });
      }
      setEditingItem(null);
      loadData();
      toast.success(`${editingItem.type === 'meeting' ? 'Meeting' : 'Folder'} renamed`);
    } catch (error) {
      console.error('Error renaming:', error);
      toast.error('Failed to rename');
    }
  };

  const navigateToFolder = (folder: MeetingFolder) => {
    setCurrentFolderId(folder.folder_id);
    setBreadcrumbs([...breadcrumbs, { id: folder.folder_id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const downloadTranscript = (meeting: Meeting) => {
    if (!meeting.transcript) return;
    
    // Format transcript with metadata header
    const createdAt = new Date(meeting.created_at);
    const header = `Meeting Transcript
Generated: ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} at ${new Date().toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}
Meeting: ${meeting.title}
Created: ${createdAt.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} at ${createdAt.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}

Full Transcript:
${meeting.transcript}`;

    const blob = new Blob([header], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Start chat with meeting transcript
  const startChatWithMeeting = (meetingId: string) => {
    router.push(`/dashboard?attachMeeting=${meetingId}`);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'meeting' | 'folder', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // If targeting a specific folder, stop propagation to prevent grid highlighting
    if (targetFolderId) {
      e.stopPropagation();
    }
    
    setDragOverTarget(targetFolderId || 'root');
  };

  const handleDragLeave = (e: React.DragEvent, targetFolderId?: string) => {
    // Only clear drag target if we're leaving the actual target, not bubbling
    if (!targetFolderId || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    
    // If dropping on a specific folder, stop propagation
    if (targetFolderId) {
      e.stopPropagation();
    }
    
    setDragOverTarget(null);

    if (!draggedItem) return;

    // Don't allow dropping onto self
    if (draggedItem.id === targetFolderId) return;

    // Don't allow dropping folder into its own child
    if (draggedItem.type === 'folder' && targetFolderId) {
      const isChildFolder = allFolders.some(f => 
        f.folder_id === targetFolderId && 
        isDescendantFolder(f, draggedItem.id, allFolders)
      );
      if (isChildFolder) {
        toast.error("Can't move folder into its own subfolder");
        return;
      }
    }

    try {
      if (draggedItem.type === 'meeting') {
        await updateMeeting(draggedItem.id, { folder_id: targetFolderId });
        toast.success('Meeting moved successfully');
      } else {
        await updateFolder(draggedItem.id, { parent_folder_id: targetFolderId });
        toast.success('Folder moved successfully');
        loadAllFolders(); // Reload all folders since hierarchy changed
      }
      loadData();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }

    setDraggedItem(null);
  };

  // Helper function to check if a folder is a descendant of another
  const isDescendantFolder = (folder: MeetingFolder, ancestorId: string, allFolders: MeetingFolder[]): boolean => {
    if (!folder.parent_folder_id) return false;
    if (folder.parent_folder_id === ancestorId) return true;
    
    const parent = allFolders.find(f => f.folder_id === folder.parent_folder_id);
    return parent ? isDescendantFolder(parent, ancestorId, allFolders) : false;
  };

  // Move item to folder
  const handleMoveToFolder = async (itemType: 'meeting' | 'folder', itemId: string, targetFolderId?: string) => {
    try {
      if (itemType === 'meeting') {
        await updateMeeting(itemId, { folder_id: targetFolderId });
        toast.success('Meeting moved successfully');
      } else {
        await updateFolder(itemId, { parent_folder_id: targetFolderId });
        toast.success('Folder moved successfully');
        loadAllFolders();
      }
      loadData();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }
  };

  // Build folder tree for context menu
  const buildFolderTree = (folders: MeetingFolder[], parentId?: string): MeetingFolder[] => {
    return folders
      .filter(folder => folder.parent_folder_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderFolderMenuItem = (folder: MeetingFolder, itemType: 'meeting' | 'folder', itemId: string, depth = 0) => {
    const children = buildFolderTree(allFolders, folder.folder_id);
    const hasChildren = children.length > 0;
    
    if (hasChildren) {
      return (
        <DropdownMenuSub key={folder.folder_id}>
          <DropdownMenuSubTrigger className={cn("pl-2", depth > 0 && "pl-4")}>
            <Folder className="h-4 w-4 mr-2" />
            {folder.name}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleMoveToFolder(itemType, itemId, folder.folder_id)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Move to "{folder.name}"
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {children.map(child => renderFolderMenuItem(child, itemType, itemId, depth + 1))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    } else {
      return (
        <DropdownMenuItem 
          key={folder.folder_id}
          onClick={() => handleMoveToFolder(itemType, itemId, folder.folder_id)}
          className={cn("pl-2", depth > 0 && "pl-4")}
        >
          <Folder className="h-4 w-4 mr-2" />
          {folder.name}
        </DropdownMenuItem>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Meetings</h1>
            {/* Breadcrumbs */}
            <div className="flex items-center mt-3 text-sm overflow-x-auto pb-1">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="mx-2 text-muted-foreground/50 flex-shrink-0">/</span>}
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={cn(
                      "px-2 py-1 rounded-md transition-all duration-200 hover:bg-accent/80 flex-shrink-0",
                      index === breadcrumbs.length - 1
                        ? "text-foreground font-medium bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Show "Go to Root" button when in empty folders */}
            {currentFolderId && meetings.length === 0 && folders.length === 0 && (
              <Button 
                onClick={() => navigateToBreadcrumb(0)} 
                variant="outline"
                className="shadow-sm hover:shadow-md transition-all duration-200 hover:bg-accent/80 w-full sm:w-auto"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Go to Root
              </Button>
            )}
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowNewFolderDialog(true)} 
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <Folder className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Folder</span>
                <span className="sm:hidden">Folder</span>
              </Button>
              <Button 
                onClick={() => setShowNewMeetingDialog(true)}
                className="flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Meeting</span>
                <span className="sm:hidden">Meeting</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 sm:mb-8 w-full sm:max-w-md">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60">
            <Search className="h-4 w-4" />
          </div>
          <Input
            placeholder="Search meetings and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card/50 backdrop-blur border-border/50 shadow-sm focus:shadow-md transition-colors duration-200 placeholder:text-muted-foreground/60"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-card/80 via-card to-card/80 backdrop-blur border border-border/50 rounded-xl p-4 sm:p-6 shadow-lg">
            <h3 className="font-semibold mb-4 text-foreground/90">Search Results</h3>
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div
                  key={result.meeting_id}
                  className="group p-3 sm:p-4 bg-background/50 backdrop-blur border border-border/30 rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:shadow-md"
                  onClick={() => router.push(`/meetings/${result.meeting_id}`)}
                >
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {result.title}
                  </div>
                  <div
                    className="text-sm text-muted-foreground mt-1.5"
                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folders and Meetings Grid */}
        <div 
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-h-32 rounded-xl transition-all duration-300",
            dragOverTarget === 'root' && "bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-950/60 dark:to-blue-900/40 border-2 border-dashed border-blue-300 dark:border-blue-600 shadow-lg"
          )}
          onDragOver={(e) => handleDragOver(e)}
          onDragLeave={(e) => handleDragLeave(e)}
          onDrop={(e) => handleDrop(e)}
        >
          {/* Folders */}
          {folders.map((folder) => (
            <div
              key={folder.folder_id}
              draggable
              onDragStart={(e) => handleDragStart(e, 'folder', folder.folder_id)}
              onDragOver={(e) => handleDragOver(e, folder.folder_id)}
              onDragLeave={(e) => handleDragLeave(e, folder.folder_id)}
              onDrop={(e) => handleDrop(e, folder.folder_id)}
              className={cn(
                "group bg-gradient-to-br from-card/60 via-card to-card/80 backdrop-blur border border-border/50 rounded-xl p-4 sm:p-5 hover:bg-gradient-to-br hover:from-accent/30 hover:to-accent/10 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/5",
                dragOverTarget === folder.folder_id && "bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-950/60 dark:to-blue-900/40 border-blue-300 dark:border-blue-600 shadow-lg shadow-blue-500/20",
                draggedItem?.id === folder.folder_id && "opacity-50 scale-95"
              )}
              onClick={() => navigateToFolder(folder)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/40 flex items-center justify-center transition-all duration-200 shadow-sm group-hover:shadow-md">
                      <Folder className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {folder.name}
                    </h3>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent/80 h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem({ type: 'folder', id: folder.folder_id, name: folder.name });
                    }}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Move className="h-4 w-4 mr-2" />
                        Move to Folder
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {/* Only show "Move to Root" if not already in root */}
                        {currentFolderId && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToFolder('folder', folder.folder_id, null);
                            }}>
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Move to Root
                            </DropdownMenuItem>
                            {buildFolderTree(allFolders).length > 0 && <DropdownMenuSeparator />}
                          </>
                        )}
                        {buildFolderTree(allFolders)
                          .filter(f => f.folder_id !== folder.folder_id)
                          .map(f => renderFolderMenuItem(f, 'folder', folder.folder_id))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.folder_id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Meeting count on bottom row */}
              <div className="mt-4 pt-3 border-t border-border/30">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground/70">
                    {getMeetingCountForFolder(folder.folder_id)}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {getMeetingCountForFolder(folder.folder_id) === 1 ? 'meeting' : 'meetings'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Meetings */}
          {meetings.map((meeting) => (
            <div
              key={meeting.meeting_id}
              draggable
              onDragStart={(e) => handleDragStart(e, 'meeting', meeting.meeting_id)}
              className={cn(
                "group bg-gradient-to-br from-card/60 via-card to-card/80 backdrop-blur border border-border/50 rounded-xl p-4 sm:p-5 hover:bg-gradient-to-br hover:from-accent/30 hover:to-accent/10 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/5",
                draggedItem?.id === meeting.meeting_id && "opacity-50 scale-95"
              )}
              onClick={() => router.push(`/meetings/${meeting.meeting_id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm group-hover:shadow-md",
                      meeting.status === 'active' 
                        ? "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/40"
                        : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/40"
                    )}>
                      <FileAudio className={cn(
                        "h-6 w-6",
                        meeting.status === 'active' 
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-600 dark:text-slate-400"
                      )} />
                    </div>
                    {/* Subtle active recording indicator */}
                    {meeting.status === 'active' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full shadow-sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {meeting.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 mt-1">
                      {format(new Date(meeting.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className={cn(
                        "text-xs px-3 py-1 rounded-full font-medium border",
                        meeting.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-700'
                          : meeting.status === 'completed' 
                          ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-300 dark:border-slate-700'
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-700'
                      )}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent/80 h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      startChatWithMeeting(meeting.meeting_id);
                    }}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open in Chat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem({ type: 'meeting', id: meeting.meeting_id, name: meeting.title });
                    }}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Move className="h-4 w-4 mr-2" />
                        Move to Folder
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {/* Only show "Move to Root" if not already in root */}
                        {currentFolderId && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToFolder('meeting', meeting.meeting_id, null);
                            }}>
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Move to Root
                            </DropdownMenuItem>
                            {buildFolderTree(allFolders).length > 0 && <DropdownMenuSeparator />}
                          </>
                        )}
                        {buildFolderTree(allFolders).map(f => renderFolderMenuItem(f, 'meeting', meeting.meeting_id))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      downloadTranscript(meeting);
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Transcript
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement sharing
                      toast.info('Sharing coming soon');
                    }}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMeeting(meeting.meeting_id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {meetings.length === 0 && folders.length === 0 && !searchQuery && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <FileAudio className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full opacity-60 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold mb-3">No meetings yet</h3>
            <p className="text-muted-foreground/80 mb-6 max-w-md mx-auto leading-relaxed">
              Create your first meeting to start recording and transcribing conversations
            </p>
            <Button 
              onClick={() => setShowNewMeetingDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Meeting
            </Button>
          </div>
        )}

        {/* New Meeting Dialog */}
        <Dialog open={showNewMeetingDialog} onOpenChange={setShowNewMeetingDialog}>
          <DialogContent className="max-w-md mx-4 bg-gradient-to-br from-card/95 via-card to-card/90 backdrop-blur border border-border/50 shadow-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Create New Meeting
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/80 leading-relaxed text-sm">
                Enter a title for your new meeting to get started with recording and transcription
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-title" className="text-sm font-medium text-foreground/90">
                  Meeting Title
                </Label>
                <Input
                  id="meeting-title"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="e.g., Team Standup, Client Call, Product Review..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateMeeting()}
                  className="h-11 bg-background/50 backdrop-blur border-border/50 shadow-sm focus:shadow-md transition-colors duration-200 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <DialogFooter className="gap-3 flex-col sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setShowNewMeetingDialog(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateMeeting} 
                disabled={!newMeetingTitle.trim()}
                className="w-full sm:w-auto"
              >
                Create Meeting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Folder Dialog */}
        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
          <DialogContent className="max-w-md mx-4 bg-gradient-to-br from-card/95 via-card to-card/90 backdrop-blur border border-border/50 shadow-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Create New Folder
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/80 leading-relaxed text-sm">
                Organize your meetings by creating a new folder
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="folder-name" className="text-sm font-medium text-foreground/90">
                  Folder Name
                </Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Weekly Meetings, Q4 Reviews, Team Calls..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  className="h-11 bg-background/50 backdrop-blur border-border/50 shadow-sm focus:shadow-md transition-colors duration-200 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <DialogFooter className="gap-3 flex-col sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setShowNewFolderDialog(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFolder} 
                disabled={!newFolderName.trim()}
                className="w-full sm:w-auto"
              >
                Create Folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="max-w-md mx-4 bg-gradient-to-br from-card/95 via-card to-card/90 backdrop-blur border border-border/50 shadow-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Rename {editingItem?.type === 'meeting' ? 'Meeting' : 'Folder'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/80 leading-relaxed text-sm">
                Enter a new name for this {editingItem?.type === 'meeting' ? 'meeting' : 'folder'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium text-foreground/90">
                  {editingItem?.type === 'meeting' ? 'Meeting' : 'Folder'} Name
                </Label>
                <Input
                  id="edit-name"
                  value={editingItem?.name || ''}
                  onChange={(e) => editingItem && setEditingItem({ ...editingItem, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  className="h-11 bg-background/50 backdrop-blur border-border/50 shadow-sm focus:shadow-md transition-colors duration-200"
                />
              </div>
            </div>
            <DialogFooter className="gap-3 flex-col sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setEditingItem(null)}
                className="shadow-sm hover:shadow-md transition-all duration-200 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRename} 
                disabled={!editingItem?.name.trim()}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 