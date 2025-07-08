/**
 * Meetings API client
 * 
 * Handles all meeting-related API operations including:
 * - CRUD operations for meetings
 * - Folder management
 * - Search functionality
 * - Sharing functionality
 * - WebSocket connections for real-time transcription
 */

import { createClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/error-handler';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';

export interface Meeting {
  meeting_id: string;
  account_id: string;
  folder_id?: string;
  title: string;
  transcript: string;
  metadata?: any;
  recording_mode: 'local' | 'online';
  status: 'active' | 'completed' | 'failed';
  is_public: boolean;
  created_at: string;
  updated_at: string;
  permission_level?: 'view' | 'edit'; // For shared meetings
}

export interface MeetingFolder {
  folder_id: string;
  account_id: string;
  parent_folder_id?: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingShare {
  share_id: string;
  meeting_id: string;
  shared_with_account_id: string;
  permission_level: 'view' | 'edit';
  created_at: string;
}

export interface SearchResult {
  meeting_id: string;
  title: string;
  snippet: string;
  rank: number;
  created_at: string;
}

// Meeting CRUD operations
export const createMeeting = async (
  title: string,
  folder_id?: string,
  recording_mode: 'local' | 'online' = 'local'
): Promise<Meeting> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to create a meeting');
  }

  const response = await fetch(`${API_URL}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ title, folder_id, recording_mode }),
  });

  if (!response.ok) {
    const error = await response.text();
    handleApiError(new Error(error), { operation: 'create meeting', resource: 'meeting' });
    throw new Error(`Failed to create meeting: ${error}`);
  }

  return response.json();
};

export const getMeetings = async (folder_id?: string): Promise<Meeting[]> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to view meetings');
  }

  const url = new URL(`${API_URL}/meetings`);
  if (folder_id) {
    url.searchParams.append('folder_id', folder_id);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to fetch meetings'), { operation: 'fetch meetings', resource: 'meetings' });
    throw new Error('Failed to fetch meetings');
  }

  const data = await response.json();
  return data.meetings;
};

export const getMeeting = async (meeting_id: string): Promise<Meeting> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to view this meeting');
  }

  const response = await fetch(`${API_URL}/meetings/${meeting_id}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Meeting not found'), { operation: 'fetch meeting', resource: 'meeting' });
    throw new Error('Meeting not found');
  }

  return response.json();
};

export const updateMeeting = async (
  meeting_id: string,
  updates: Partial<Meeting>
): Promise<Meeting> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to update a meeting');
  }

  const response = await fetch(`${API_URL}/meetings/${meeting_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to update meeting'), { operation: 'update meeting', resource: 'meeting' });
    throw new Error('Failed to update meeting');
  }

  return response.json();
};

export const deleteMeeting = async (meeting_id: string): Promise<void> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to delete a meeting');
  }

  const response = await fetch(`${API_URL}/meetings/${meeting_id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to delete meeting'), { operation: 'delete meeting', resource: 'meeting' });
    throw new Error('Failed to delete meeting');
  }
};

// Folder operations
export const createFolder = async (
  name: string,
  parent_folder_id?: string
): Promise<MeetingFolder> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to create a folder');
  }

  const response = await fetch(`${API_URL}/meeting-folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ name, parent_folder_id }),
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to create folder'), { operation: 'create folder', resource: 'folder' });
    throw new Error('Failed to create folder');
  }

  return response.json();
};

export const getFolders = async (parent_folder_id?: string): Promise<MeetingFolder[]> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to view folders');
  }

  const url = new URL(`${API_URL}/meeting-folders`);
  if (parent_folder_id) {
    url.searchParams.append('parent_folder_id', parent_folder_id);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to fetch folders'), { operation: 'fetch folders', resource: 'folders' });
    throw new Error('Failed to fetch folders');
  }

  const data = await response.json();
  return data.folders;
};

// Get all folders (including nested ones) for move operations
export const getAllFolders = async (): Promise<MeetingFolder[]> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to view folders');
  }

  const url = new URL(`${API_URL}/meeting-folders`);
  url.searchParams.append('all', 'true'); // Get all folders regardless of parent

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to fetch all folders'), { operation: 'fetch all folders', resource: 'folders' });
    throw new Error('Failed to fetch all folders');
  }

  const data = await response.json();
  return data.folders;
};

export const updateFolder = async (
  folder_id: string,
  updates: Partial<MeetingFolder>
): Promise<MeetingFolder> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to update a folder');
  }

  const response = await fetch(`${API_URL}/meeting-folders/${folder_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to update folder'), { operation: 'update folder', resource: 'folder' });
    throw new Error('Failed to update folder');
  }

  return response.json();
};

export const deleteFolder = async (folder_id: string): Promise<void> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to delete a folder');
  }

  const response = await fetch(`${API_URL}/meeting-folders/${folder_id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to delete folder'), { operation: 'delete folder', resource: 'folder' });
    throw new Error('Failed to delete folder');
  }
};

// Search functionality
export const searchMeetings = async (query: string, limit: number = 50): Promise<SearchResult[]> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to search meetings');
  }

  const url = new URL(`${API_URL}/meetings/search`);
  url.searchParams.append('q', query);
  url.searchParams.append('limit', limit.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Search failed'), { operation: 'search meetings', resource: 'meetings' });
    throw new Error('Search failed');
  }

  const data = await response.json();
  return data.results;
};

// Sharing functionality
export const shareMeeting = async (
  meeting_id: string,
  shared_with_account_id: string,
  permission_level: 'view' | 'edit' = 'view'
): Promise<MeetingShare> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to share a meeting');
  }

  const response = await fetch(`${API_URL}/meetings/${meeting_id}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ shared_with_account_id, permission_level }),
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to share meeting'), { operation: 'share meeting', resource: 'meeting' });
    throw new Error('Failed to share meeting');
  }

  return response.json();
};

export const unshareMeeting = async (
  meeting_id: string,
  shared_with_account_id: string
): Promise<void> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to unshare a meeting');
  }

  const response = await fetch(
    `${API_URL}/meetings/${meeting_id}/share/${shared_with_account_id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    handleApiError(new Error('Failed to unshare meeting'), { operation: 'unshare meeting', resource: 'meeting' });
    throw new Error('Failed to unshare meeting');
  }
};

export const getSharedMeetings = async (): Promise<Meeting[]> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to view shared meetings');
  }

  const response = await fetch(`${API_URL}/meetings/shared`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    handleApiError(new Error('Failed to fetch shared meetings'), { operation: 'fetch shared meetings', resource: 'meetings' });
    throw new Error('Failed to fetch shared meetings');
  }

  const data = await response.json();
  return data.meetings;
};

// WebSocket for real-time transcription
export class TranscriptionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private meeting_id: string,
    private token: string,
    private onTranscriptUpdate: (text: string) => void,
    private onStatusUpdate?: (status: string) => void,
    private onError?: (error: string) => void
  ) {}

  connect() {
    const wsUrl = API_URL.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsUrl}/meetings/${this.meeting_id}/transcribe?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected for meeting:', this.meeting_id);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript_update') {
          this.onTranscriptUpdate(data.text);
        } else if (data.type === 'status_update' && this.onStatusUpdate) {
          this.onStatusUpdate(data.status);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.onError) {
        this.onError('Connection error');
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else if (this.onError) {
      this.onError('Failed to reconnect after multiple attempts');
    }
  }

  sendTranscript(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'transcript',
        text: text
      }));
    }
  }

  updateStatus(status: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'status_update',
        status: status
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
