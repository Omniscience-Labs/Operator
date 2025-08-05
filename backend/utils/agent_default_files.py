"""
Utility functions for handling agent default files in Supabase Storage.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from utils.logger import logger
from services.supabase import DBConnection


class AgentDefaultFilesManager:
    def __init__(self):
        self.bucket_name = "agent-default-files"
    
    def _get_file_path(self, account_id: str, agent_id: str, filename: str) -> str:
        """Generate storage path for agent default file."""
        return f"{account_id}/{agent_id}/{filename}"
    
    async def upload_file(self, account_id: str, agent_id: str, file: UploadFile) -> Dict[str, Any]:
        """Upload a default file for an agent."""
        try:
            # Read file content
            content = await file.read()
            file_path = self._get_file_path(account_id, agent_id, file.filename)
            
            logger.info(f"Attempting to upload file: {file_path} to bucket: {self.bucket_name}")
            
            # Upload to Supabase storage
            db = DBConnection()
            client = await db.client
            
            # First try to upload the file
            storage_response = await client.storage.from_(self.bucket_name).upload(
                file_path,
                content,
                {"content-type": file.content_type or "application/octet-stream"}
            )
            
            logger.info(f"Storage upload response: {storage_response}")
            
            # Check if upload failed 
            if storage_response and storage_response.get('error'):
                error = storage_response['error']
                logger.error(f"Storage upload error details: {error}")
                logger.error(f"Full storage response: {storage_response}")
                if 'Duplicate' in str(error) or '409' in str(error):
                    # File exists, delete it first
                    delete_response = await client.storage.from_(self.bucket_name).remove([file_path])
                    if delete_response.get('error'):
                        logger.warning(f"Could not delete existing file {file_path}: {delete_response['error']}")
                    
                    # Try uploading again
                    storage_response = await client.storage.from_(self.bucket_name).upload(
                        file_path,
                        content,
                        {"content-type": file.content_type or "application/octet-stream"}
                    )
                    
                    # Check if second upload also failed
                    if storage_response.get('error'):
                        raise RuntimeError(f"File '{file.filename}' could not be uploaded after removing existing file: {storage_response['error']}")
                else:
                    # Different error, not a duplicate
                    raise RuntimeError(f"Upload failed: {storage_response['error']}")
            else:
                logger.info(f"File upload successful for {file_path}")
            
            # Get public URL (for internal use)
            public_url = await client.storage.from_(self.bucket_name).get_public_url(file_path)
            
            # Return file metadata
            return {
                "name": file.filename,
                "storage_path": file_path,
                "size": len(content),
                "mime_type": file.content_type,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "public_url": public_url
            }
            
        except Exception as e:
            logger.error(f"Error uploading agent default file: {e}")
            raise RuntimeError(f"Failed to upload file: {str(e)}")
    
    async def delete_file(self, account_id: str, agent_id: str, filename: str) -> bool:
        """Delete a default file for an agent."""
        try:
            file_path = self._get_file_path(account_id, agent_id, filename)
            
            db = DBConnection()
            client = await db.client
            
            response = await client.storage.from_(self.bucket_name).remove([file_path])
            
            if response.get('error'):
                logger.error(f"Failed to delete file {file_path}: {response['error']}")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error deleting agent default file: {e}")
            return False
    
    async def copy_files_for_agent_copy(self, source_account_id: str, source_agent_id: str, 
                                       dest_account_id: str, dest_agent_id: str, 
                                       file_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Copy default files when creating agent copy (unmanaged sharing)."""
        try:
            db = DBConnection()
            client = await db.client
            copied_files = []
            
            for file_info in file_list:
                source_path = self._get_file_path(source_account_id, source_agent_id, file_info['name'])
                dest_path = self._get_file_path(dest_account_id, dest_agent_id, file_info['name'])
                
                # Download from source
                download_response = await client.storage.from_(self.bucket_name).download(source_path)
                if download_response.get('error'):
                    logger.warning(f"Failed to download source file {source_path}")
                    continue
                
                # Upload to destination
                upload_response = await client.storage.from_(self.bucket_name).upload(
                    dest_path,
                    download_response['data'],
                    {"content-type": file_info.get('mime_type', 'application/octet-stream')}
                )
                
                if upload_response.get('error'):
                    logger.warning(f"Failed to copy file to {dest_path}")
                    continue
                
                # Update file metadata for new location
                copied_file = file_info.copy()
                copied_file['storage_path'] = dest_path
                copied_files.append(copied_file)
            
            return copied_files
            
        except Exception as e:
            logger.error(f"Error copying agent default files: {e}")
            return []
    
    async def download_files_to_sandbox(self, account_id: str, agent_id: str, 
                                       file_list: List[Dict[str, Any]], sandbox) -> List[str]:
        """Download default files to sandbox /workspace/agent-defaults/ directory."""
        try:
            db = DBConnection()
            client = await db.client
            downloaded_files = []
            
            for file_info in file_list:
                storage_path = file_info['storage_path']
                workspace_path = f"/workspace/agent-defaults/{file_info['name']}"
                
                # Download from Supabase storage
                download_response = await client.storage.from_(self.bucket_name).download(storage_path)
                if download_response.get('error'):
                    logger.warning(f"Failed to download file {storage_path}")
                    continue
                
                # Upload to sandbox
                try:
                    sandbox.fs.upload_file(download_response['data'], workspace_path)
                    downloaded_files.append(workspace_path)
                    logger.info(f"Downloaded default file to sandbox: {workspace_path}")
                except Exception as e:
                    logger.warning(f"Failed to upload file to sandbox {workspace_path}: {e}")
            
            return downloaded_files
            
        except Exception as e:
            logger.error(f"Error downloading agent default files to sandbox: {e}")
            return []