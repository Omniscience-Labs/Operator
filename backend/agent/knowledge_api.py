"""
Knowledge Base API endpoints for managing agent knowledge bases.
"""

import os
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from uuid import uuid4
import asyncio
from datetime import datetime

from utils.logger import logger
from utils.auth_utils import get_current_user_id_from_jwt
from services.supabase import DBConnection

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    agent_id: Optional[str] = None
    index_type: str = "managed"  # "managed" or "external"
    llama_index_id: Optional[str] = None  # For external indexes


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class KnowledgeBaseResponse(BaseModel):
    id: str
    account_id: str
    agent_id: Optional[str]
    name: str
    description: Optional[str]
    llama_index_id: Optional[str]
    index_type: str
    status: str
    error_message: Optional[str]
    metadata: Dict[str, Any]
    created_at: str
    updated_at: str


class KnowledgeBaseFileResponse(BaseModel):
    id: str
    knowledge_base_id: str
    file_name: str
    file_path: str
    file_size: Optional[int]
    file_type: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: str


@router.get("/bases", response_model=List[KnowledgeBaseResponse])
async def list_knowledge_bases(
    agent_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """List all knowledge bases for the user or a specific agent."""
    logger.info(f"Listing knowledge bases for user: {user_id}, agent: {agent_id}")
    
    db = DBConnection()
    client = await db.client
    
    try:
        query = client.table('knowledge_bases').select('*').eq('account_id', user_id)
        
        if agent_id:
            query = query.eq('agent_id', agent_id)
            
        result = await query.execute()
        
        return [
            KnowledgeBaseResponse(
                id=kb['id'],
                account_id=kb['account_id'],
                agent_id=kb.get('agent_id'),
                name=kb['name'],
                description=kb.get('description'),
                llama_index_id=kb.get('llama_index_id'),
                index_type=kb['index_type'],
                status=kb['status'],
                error_message=kb.get('error_message'),
                metadata=kb.get('metadata', {}),
                created_at=kb['created_at'],
                updated_at=kb['updated_at']
            )
            for kb in result.data
        ]
        
    except Exception as e:
        logger.error(f"Error listing knowledge bases: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bases", response_model=KnowledgeBaseResponse)
async def create_knowledge_base(
    kb_data: KnowledgeBaseCreate,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Create a new knowledge base."""
    logger.info(f"Creating knowledge base for user: {user_id}")
    
    db = DBConnection()
    client = await db.client
    
    try:
        # Validate agent ownership if agent_id is provided
        if kb_data.agent_id:
            agent_result = await client.table('agents').select('account_id').eq('agent_id', kb_data.agent_id).single().execute()
            if not agent_result.data or agent_result.data['account_id'] != user_id:
                raise HTTPException(status_code=403, detail="Agent not found or access denied")
        
        # Create knowledge base
        insert_data = {
            "account_id": user_id,
            "agent_id": kb_data.agent_id,
            "name": kb_data.name,
            "description": kb_data.description,
            "index_type": kb_data.index_type,
            "llama_index_id": kb_data.llama_index_id,
            "status": "ready" if kb_data.index_type == "external" else "pending",
            "metadata": {}
        }
        
        result = await client.table('knowledge_bases').insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create knowledge base")
            
        kb = result.data[0]
        
        return KnowledgeBaseResponse(
            id=kb['id'],
            account_id=kb['account_id'],
            agent_id=kb.get('agent_id'),
            name=kb['name'],
            description=kb.get('description'),
            llama_index_id=kb.get('llama_index_id'),
            index_type=kb['index_type'],
            status=kb['status'],
            error_message=kb.get('error_message'),
            metadata=kb.get('metadata', {}),
            created_at=kb['created_at'],
            updated_at=kb['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating knowledge base: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/bases/{knowledge_base_id}", response_model=KnowledgeBaseResponse)
async def update_knowledge_base(
    knowledge_base_id: str,
    kb_data: KnowledgeBaseUpdate,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Update a knowledge base."""
    logger.info(f"Updating knowledge base {knowledge_base_id} for user: {user_id}")
    
    db = DBConnection()
    client = await db.client
    
    try:
        # Verify ownership
        existing = await client.table('knowledge_bases').select('*').eq('id', knowledge_base_id).eq('account_id', user_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        # Prepare update data
        update_data = {}
        if kb_data.name is not None:
            update_data['name'] = kb_data.name
        if kb_data.description is not None:
            update_data['description'] = kb_data.description
        if kb_data.status is not None:
            update_data['status'] = kb_data.status
            
        if not update_data:
            return KnowledgeBaseResponse(**existing.data)
            
        # Update knowledge base
        result = await client.table('knowledge_bases').update(update_data).eq('id', knowledge_base_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update knowledge base")
            
        kb = result.data[0]
        
        return KnowledgeBaseResponse(
            id=kb['id'],
            account_id=kb['account_id'],
            agent_id=kb.get('agent_id'),
            name=kb['name'],
            description=kb.get('description'),
            llama_index_id=kb.get('llama_index_id'),
            index_type=kb['index_type'],
            status=kb['status'],
            error_message=kb.get('error_message'),
            metadata=kb.get('metadata', {}),
            created_at=kb['created_at'],
            updated_at=kb['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating knowledge base: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bases/{knowledge_base_id}")
async def delete_knowledge_base(
    knowledge_base_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Delete a knowledge base and all associated files."""
    logger.info(f"Deleting knowledge base {knowledge_base_id} for user: {user_id}")
    
    db = DBConnection()
    client = await db.client
    
    try:
        # Verify ownership
        existing = await client.table('knowledge_bases').select('*').eq('id', knowledge_base_id).eq('account_id', user_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        # Delete knowledge base (files will be cascade deleted)
        await client.table('knowledge_bases').delete().eq('id', knowledge_base_id).execute()
        
        # TODO: Also delete the index from LlamaCloud if it's a managed index
        
        return {"message": "Knowledge base deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting knowledge base: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bases/{knowledge_base_id}/files")
async def upload_file_to_knowledge_base(
    knowledge_base_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Upload a file to a knowledge base."""
    logger.info(f"Uploading file to knowledge base {knowledge_base_id} for user: {user_id}")
    
    db = DBConnection()
    client = await db.client
    
    try:
        # Verify ownership
        kb_result = await client.table('knowledge_bases').select('*').eq('id', knowledge_base_id).eq('account_id', user_id).single().execute()
        if not kb_result.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
            
        kb = kb_result.data
        
        # Generate unique file path
        file_id = str(uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        file_path = f"knowledge/{knowledge_base_id}/{file_id}{file_extension}"
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # TODO: Upload to storage (S3 or similar)
        # For now, we'll just record the metadata
        
        # Record file in database
        file_data = {
            "knowledge_base_id": knowledge_base_id,
            "file_name": file.filename,
            "file_path": file_path,
            "file_size": file_size,
            "file_type": file.content_type,
            "status": "pending"
        }
        
        file_result = await client.table('knowledge_base_files').insert(file_data).execute()
        
        if not file_result.data:
            raise HTTPException(status_code=500, detail="Failed to record file")
            
        # TODO: Trigger indexing process
        # This would typically:
        # 1. Upload file to storage
        # 2. Send to LlamaCloud for indexing
        # 3. Update file status to "indexed" when complete
        
        file_record = file_result.data[0]
        
        return KnowledgeBaseFileResponse(
            id=file_record['id'],
            knowledge_base_id=file_record['knowledge_base_id'],
            file_name=file_record['file_name'],
            file_path=file_record['file_path'],
            file_size=file_record.get('file_size'),
            file_type=file_record.get('file_type'),
            status=file_record['status'],
            error_message=file_record.get('error_message'),
            created_at=file_record['created_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bases/{knowledge_base_id}/files", response_model=List[KnowledgeBaseFileResponse])
async def list_knowledge_base_files(
    knowledge_base_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """List all files in a knowledge base."""
    logger.info(f"Listing files for knowledge base {knowledge_base_id}")
    
    db = DBConnection()
    client = await db.client
    
    try:
        # Verify ownership
        kb_result = await client.table('knowledge_bases').select('id').eq('id', knowledge_base_id).eq('account_id', user_id).single().execute()
        if not kb_result.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        # Get files
        files_result = await client.table('knowledge_base_files').select('*').eq('knowledge_base_id', knowledge_base_id).execute()
        
        return [
            KnowledgeBaseFileResponse(
                id=f['id'],
                knowledge_base_id=f['knowledge_base_id'],
                file_name=f['file_name'],
                file_path=f['file_path'],
                file_size=f.get('file_size'),
                file_type=f.get('file_type'),
                status=f['status'],
                error_message=f.get('error_message'),
                created_at=f['created_at']
            )
            for f in files_result.data
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bases/{knowledge_base_id}/files/{file_id}")
async def delete_knowledge_base_file(
    knowledge_base_id: str,
    file_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Delete a file from a knowledge base."""
    logger.info(f"Deleting file {file_id} from knowledge base {knowledge_base_id}")
    
    db = DBConnection()
    client = await db.client
    
    try:
        # Verify ownership
        kb_result = await client.table('knowledge_bases').select('id').eq('id', knowledge_base_id).eq('account_id', user_id).single().execute()
        if not kb_result.data:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
        
        # Delete file
        await client.table('knowledge_base_files').delete().eq('id', file_id).eq('knowledge_base_id', knowledge_base_id).execute()
        
        # TODO: Also remove from storage and update LlamaCloud index
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))