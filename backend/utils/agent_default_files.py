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
            
            # Check if upload succeeded or failed
            upload_successful = False
            
            # Handle different response types from Supabase storage
            if hasattr(storage_response, 'path'):
                # UploadResponse object - upload was successful
                logger.info(f"File upload successful for {file_path}")
                logger.info(f"Successful upload response structure: {type(storage_response)} - {storage_response}")
                upload_successful = True
            elif storage_response and hasattr(storage_response, 'get') and storage_response.get('error'):
                error = storage_response['error']
                logger.error(f"Storage upload error details: {error}")
                logger.error(f"Full storage response: {storage_response}")
                if 'Duplicate' in str(error) or '409' in str(error):
                    logger.info(f"File already exists, attempting to delete and re-upload: {file_path}")
                    # File exists, delete it first
                    delete_response = await client.storage.from_(self.bucket_name).remove([file_path])
                    logger.info(f"Delete response: {delete_response}")
                    
                    if delete_response.get('error'):
                        logger.warning(f"Could not delete existing file {file_path}: {delete_response['error']}")
                        # Continue anyway, maybe the delete worked despite the error
                    
                    # Try uploading again
                    logger.info(f"Attempting second upload after delete")
                    storage_response = await client.storage.from_(self.bucket_name).upload(
                        file_path,
                        content,
                        {"content-type": file.content_type or "application/octet-stream"}
                    )
                    logger.info(f"Second upload response: {storage_response}")
                    
                    # Check if second upload also failed
                    if storage_response.get('error'):
                        logger.error(f"Second upload also failed: {storage_response['error']}")
                        raise RuntimeError(f"File '{file.filename}' could not be uploaded after removing existing file: {storage_response['error']}")
                    else:
                        logger.info(f"File upload successful after removing duplicate: {file_path}")
                        upload_successful = True
                else:
                    # Different error, not a duplicate
                    logger.error(f"Non-duplicate upload error: {storage_response['error']}")
                    raise RuntimeError(f"Upload failed: {storage_response['error']}")
            else:
                # No error and no UploadResponse - unexpected case
                logger.warning(f"Unexpected storage response format: {type(storage_response)} - {storage_response}")
                upload_successful = False
            
            # Only proceed if upload was successful
            if not upload_successful:
                raise RuntimeError(f"Upload failed for unknown reason")
            
            # Get public URL (for internal use)
            try:
                public_url = await client.storage.from_(self.bucket_name).get_public_url(file_path)
                logger.info(f"Got public URL: {public_url}")
            except Exception as url_error:
                logger.error(f"Failed to get public URL: {url_error}")
                public_url = f"/{self.bucket_name}/{file_path}"  # Fallback URL
            
            # Return file metadata
            file_metadata = {
                "name": file.filename,
                "storage_path": file_path,
                "size": len(content),
                "mime_type": file.content_type,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "public_url": public_url
            }
            
            logger.info(f"Returning file metadata: {file_metadata}")
            return file_metadata
            
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
                try:
                    file_content = await client.storage.from_(self.bucket_name).download(source_path)
                except Exception as e:
                    logger.warning(f"Failed to download source file {source_path}: {e}")
                    continue
                
                # Upload to destination
                upload_response = await client.storage.from_(self.bucket_name).upload(
                    dest_path,
                    file_content,
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
                try:
                    file_content = await client.storage.from_(self.bucket_name).download(storage_path)
                    logger.info(f"Successfully downloaded file from storage: {storage_path}")
                except Exception as e:
                    logger.warning(f"Failed to download file {storage_path}: {e}")
                    continue
                
                # Upload to sandbox
                try:
                    sandbox.fs.upload_file(file_content, workspace_path)
                    downloaded_files.append(workspace_path)
                    logger.info(f"Downloaded default file to sandbox: {workspace_path}")
                except Exception as e:
                    logger.warning(f"Failed to upload file to sandbox {workspace_path}: {e}")
            
            return downloaded_files
            
        except Exception as e:
            logger.error(f"Error downloading agent default files to sandbox: {e}")
            return []