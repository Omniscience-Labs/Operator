#!/usr/bin/env python
"""
Script to archive all stopped sandboxes.

Usage:
    python archive_stopped_sandboxes.py [--dry-run]

This script:
1. Gets all projects with associated sandbox information.
2. Filters for sandboxes that are currently in a 'stopped' state.
3. Archives these stopped sandboxes.

Make sure your environment variables are properly set:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- DAYTONA_SERVER_URL
"""

import asyncio
import sys
import os
import argparse
from typing import List, Dict, Any
from datetime import datetime, timedelta # timedelta is no longer strictly needed but kept as it's part of datetime

from dotenv import load_dotenv

# Load script-specific environment variables
load_dotenv(".env")

from services.supabase import DBConnection
from sandbox.sandbox import daytona, SandboxState # Import SandboxState for clarity
from utils.logger import logger

# Global DB connection to reuse
db_connection = None


async def get_all_projects_with_sandboxes() -> List[Dict[str, Any]]:
    """
    Query all projects that have sandbox information.
        
    Returns:
        List of projects with their sandbox information
    """
    global db_connection
    if db_connection is None:
        db_connection = DBConnection()
    
    client = await db_connection.client
    
    # Print the Supabase URL being used
    print(f"Using Supabase URL: {os.getenv('SUPABASE_URL')}")
        
    # Initialize variables for pagination
    all_projects = []
    page_size = 1000
    current_page = 0
    has_more = True
    
    logger.info("Starting to fetch all projects with sandbox information (paginated)")
    
    # Paginate through all projects
    while has_more:
        # Query projects with pagination
        start_range = current_page * page_size
        end_range = start_range + page_size - 1
        
        logger.info(f"Fetching projects page {current_page+1} (range: {start_range}-{end_range})")
        
        try:
            result = await client.table('projects').select(
                'project_id',
                'name',
                'created_at',
                'account_id',
                'sandbox'
            ).order('created_at', desc=True).range(start_range, end_range).execute()
            
            # Debug info - print raw response
            print(f"Response data length: {len(result.data)}")
            
            if not result.data:
                print("No more data returned from query, ending pagination")
                has_more = False
            else:
                # Print a sample project to see the actual data structure
                if current_page == 0 and result.data:
                    print(f"Sample project data: {result.data[0]}")
                
                all_projects.extend(result.data)
                current_page += 1
                
                # Progress update
                logger.info(f"Loaded {len(all_projects)} projects so far")
                print(f"Loaded {len(all_projects)} projects so far...")
                
                # Check if we've reached the end - if we got fewer results than the page size
                if len(result.data) < page_size:
                    print(f"Got {len(result.data)} records which is less than page size {page_size}, ending pagination")
                    has_more = False
                else:
                    print(f"Full page returned ({len(result.data)} records), continuing to next page")
                    
        except Exception as e:
            logger.error(f"Error during pagination: {str(e)}")
            print(f"Error during pagination: {str(e)}")
            has_more = False  # Stop on error
    
    # Print the query result summary
    total_projects = len(all_projects)
    print(f"Found {total_projects} total projects in database")
    logger.info(f"Total projects found in database: {total_projects}")
    
    if not all_projects:
        logger.info("No projects found in database")
        return []
    
    # Filter projects that have sandbox information
    projects_with_sandboxes = [
        project for project in all_projects
        if project.get('sandbox') and project['sandbox'].get('id')
    ]
    
    logger.info(f"Found {len(projects_with_sandboxes)} projects with sandboxes")
    
    # Print a few sample projects for debugging
    if projects_with_sandboxes:
        print("\nSample of projects with sandboxes:")
        for i, project in enumerate(projects_with_sandboxes[:3]):
            print(f"  {i+1}. {project.get('name')} (Created: {project.get('created_at')})")
            print(f"     Sandbox ID: {project['sandbox'].get('id')}")
            if i >= 2:
                break
    
    return projects_with_sandboxes


async def archive_sandbox(project: Dict[str, Any], dry_run: bool) -> bool:
    """
    Archive a single sandbox.
    
    Args:
        project: Project information containing sandbox to archive
        dry_run: If True, only simulate archiving
        
    Returns:
        True if successful, False otherwise
    """
    sandbox_id = project['sandbox'].get('id')
    project_name = project.get('name', 'Unknown')
    project_id = project.get('project_id', 'Unknown')
    created_at = project.get('created_at', 'Unknown') # Kept created_at for logging, even if not used for filtering
    
    try:
        logger.info(f"Checking sandbox {sandbox_id} for project '{project_name}' (ID: {project_id}, Created: {created_at})")
        
        if dry_run:
            logger.info(f"DRY RUN: Would archive sandbox {sandbox_id}")
            print(f"Would archive sandbox {sandbox_id} for project '{project_name}' (Created: {created_at})")
            return True
        
        # Get the sandbox
        sandbox = daytona.get(sandbox_id)
        
        # Check sandbox state - it must be stopped before archiving
        sandbox_info = sandbox.info()
        
        # Log the current state
        logger.info(f"Sandbox {sandbox_id} is in '{sandbox_info.state}' state")
        
        # Only archive if the sandbox is in the stopped state
        if sandbox.state == SandboxState.STOPPED: # Using SandboxState enum for clarity
            logger.info(f"Archiving sandbox {sandbox_id} as it is in stopped state")
            sandbox.archive()
            logger.info(f"Successfully archived sandbox {sandbox_id}")
            return True
        else:
            logger.info(f"Skipping sandbox {sandbox_id} as it is not in stopped state (current: {sandbox_info.state})")
            return True
            
    except Exception as e:
        import traceback
        error_type = type(e).__name__
        stack_trace = traceback.format_exc()
        
        # Log detailed error information
        logger.error(f"Error processing sandbox {sandbox_id}: {str(e)}")
        logger.error(f"Error type: {error_type}")
        logger.error(f"Stack trace:\n{stack_trace}")
        
        # If the exception has a response attribute (like in HTTP errors), log it
        if hasattr(e, 'response'):
            try:
                response_data = e.response.json() if hasattr(e.response, 'json') else str(e.response)
                logger.error(f"Response data: {response_data}")
            except Exception:
                logger.error(f"Could not parse response data from error")
        
        print(f"Failed to process sandbox {sandbox_id}: {error_type} - {str(e)}")
        return False


async def process_sandboxes(sandboxes_to_archive: List[Dict[str, Any]], dry_run: bool) -> tuple[int, int]:
    """
    Process all sandboxes sequentially.
    
    Args:
        sandboxes_to_archive: List of projects whose sandboxes are to be archived
        dry_run: Whether to actually archive sandboxes or just simulate
        
    Returns:
        Tuple of (processed_count, failed_count)
    """
    processed_count = 0
    failed_count = 0
    
    if dry_run:
        logger.info(f"DRY RUN: Would archive {len(sandboxes_to_archive)} sandboxes")
    else:
        logger.info(f"Archiving {len(sandboxes_to_archive)} sandboxes")
    
    print(f"Processing {len(sandboxes_to_archive)} sandboxes...")
    
    # Process each sandbox sequentially
    for i, project in enumerate(sandboxes_to_archive):
        success = await archive_sandbox(project, dry_run)
        
        if success:
            processed_count += 1
        else:
            failed_count += 1
        
        # Print progress periodically
        if (i + 1) % 20 == 0 or (i + 1) == len(sandboxes_to_archive):
            progress = (i + 1) / len(sandboxes_to_archive) * 100
            print(f"Progress: {i + 1}/{len(sandboxes_to_archive)} sandboxes processed ({progress:.1f}%)")
            print(f"  - Processed: {processed_count}, Failed: {failed_count}")
    
    return processed_count, failed_count


async def main():
    """Main function to run the script."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Archive all stopped sandboxes')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be archived without actually archiving')
    args = parser.parse_args()

    logger.info(f"Starting sandbox cleanup for all stopped sandboxes")
    if args.dry_run:
        logger.info("DRY RUN MODE - No sandboxes will be archived")
    
    # Print environment info
    print(f"Environment Mode: {os.getenv('ENV_MODE', 'Not set')}")
    print(f"Daytona Server: {os.getenv('DAYTONA_SERVER_URL', 'Not set')}")
    
    try:
        # Initialize global DB connection
        global db_connection
        db_connection = DBConnection()
        
        # Get all projects with sandboxes
        all_projects_with_sandboxes = await get_all_projects_with_sandboxes()
        
        if not all_projects_with_sandboxes:
            logger.info("No projects with sandboxes to process.")
            print("No projects with sandboxes to archive.")
            return

        # Filter for stopped sandboxes
        stopped_sandboxes = []
        print("\nChecking sandbox states (this might take a while for many sandboxes)...")
        # Add a counter for progress
        for i, project in enumerate(all_projects_with_sandboxes):
            sandbox_id = project['sandbox'].get('id')
            if sandbox_id:
                try:
                    sandbox = daytona.get(sandbox_id)
                    sandbox_info = sandbox.info()
                    if sandbox_info.state == SandboxState.STOPPED:
                        stopped_sandboxes.append(project)
                    logger.info(f"Sandbox {sandbox_id} state: {sandbox_info.state}")
                except Exception as e:
                    logger.error(f"Error checking state for sandbox {sandbox_id}: {str(e)}")
                    print(f"Error checking state for sandbox {sandbox_id}: {str(e)}")
            
            # Print progress periodically for state checking
            if (i + 1) % 50 == 0 or (i + 1) == len(all_projects_with_sandboxes):
                progress = (i + 1) / len(all_projects_with_sandboxes) * 100
                print(f"Progress checking states: {i + 1}/{len(all_projects_with_sandboxes)} sandboxes checked ({progress:.1f}%)")


        if not stopped_sandboxes:
            logger.info("No stopped sandboxes to archive.")
            print("No stopped sandboxes found to archive.")
            return
        
        # Print summary of what will be processed
        print("\n===== SANDBOX CLEANUP SUMMARY =====")
        print(f"Total projects with sandboxes found: {len(all_projects_with_sandboxes)}")
        print(f"Total stopped sandboxes to be archived: {len(stopped_sandboxes)}")
        print("===================================")
        
        logger.info(f"Found {len(stopped_sandboxes)} stopped sandboxes to archive.")
        
        # Ask for confirmation before proceeding
        if not args.dry_run:
            print("\n⚠️  WARNING: You are about to archive stopped sandboxes ⚠️")
            print("This action cannot be undone!")
            confirmation = input("\nAre you sure you want to proceed with archiving? (TRUE/FALSE): ").strip().upper()
            
            if confirmation != "TRUE":
                print("Archiving cancelled. Exiting script.")
                logger.info("Archiving cancelled by user")
                return
            
            print("\nProceeding with sandbox archiving...\n")
            logger.info("User confirmed sandbox archiving")
        
        # List a sample of projects to be processed
        for i, project in enumerate(stopped_sandboxes[:5]):  # Just show first 5 for brevity
            created_at = project.get('created_at', 'Unknown')
            project_name = project.get('name', 'Unknown')
            project_id = project.get('project_id', 'Unknown')
            sandbox_id = project['sandbox'].get('id')
            
            print(f"{i+1}. Project: {project_name}")
            print(f"   Project ID: {project_id}")
            print(f"   Created At: {created_at}")
            print(f"   Sandbox ID: {sandbox_id}")
            
        if len(stopped_sandboxes) > 5:
            print(f"   ... and {len(stopped_sandboxes) - 5} more projects")
        
        # Process all sandboxes
        processed_count, failed_count = await process_sandboxes(stopped_sandboxes, args.dry_run)
        
        # Print final summary
        print("\nSandbox Cleanup Summary:")
        print(f"Total stopped sandboxes to archive: {len(stopped_sandboxes)}")
        print(f"Total sandboxes processed: {processed_count}") # Changed from len(stopped_sandboxes) to processed_count for accuracy
        
        if args.dry_run:
            print(f"DRY RUN: No sandboxes were actually archived")
        else:
            print(f"Successfully archived: {processed_count - failed_count}") # Corrected to show actual archived count
            print(f"Failed to archive: {failed_count}")
        
        logger.info("Sandbox cleanup completed")
            
    except Exception as e:
        logger.error(f"Error during sandbox cleanup: {str(e)}")
        sys.exit(1)
    finally:
        # Clean up database connection
        if db_connection:
            await DBConnection.disconnect()


if __name__ == "__main__":
    asyncio.run(main())