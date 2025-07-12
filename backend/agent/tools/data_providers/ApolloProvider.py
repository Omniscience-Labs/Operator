import os
import requests
from typing import Dict, Any, Optional, List
from utils.config import config


class ApolloProvider:
    """
    Apollo.io API provider for people and organization search, and people enrichment.
    
    This provider enables lead generation through Apollo's comprehensive
    people and organization search capabilities, plus the ability to enrich
    people data with verified contact information.
    """
    
    def __init__(self):
        self.base_url = "https://api.apollo.io/api/v1"
        self.api_key = config.APOLLO_API_KEY
        
        if not self.api_key:
            raise ValueError("APOLLO_API_KEY not found in configuration")
        
        self.endpoints = {
            "people_search": {
                "route": "/mixed_people/search",
                "method": "POST",
                "name": "People Search",
                "description": "Search for people in the Apollo database with advanced filtering options. Useful for lead generation, prospecting, and finding contacts by job title, company, location, seniority level, and more. IMPORTANT: After displaying search results to the user and finding relevant people, you MUST use the 'ask' tool to offer people enrichment. Ask the user if they want to enrich any specific person's data with verified emails and/or phone numbers using Apollo's People Enrichment service (which may consume API credits).",
                "payload": {
                    "person_titles[]": "Job titles held by people (e.g., 'marketing manager', 'sales director')",
                    "person_locations[]": "Geographic locations where people live (e.g., 'california', 'chicago', 'ireland')",
                    "person_seniorities[]": "Job seniority levels (e.g., 'director', 'senior', 'vp', 'c_suite')",
                    "organization_locations[]": "Company headquarters locations (e.g., 'texas', 'tokyo', 'spain')",
                    "q_organization_domains[]": "Company domains (e.g., 'apollo.io', 'microsoft.com')",
                    "contact_email_status[]": "Email verification status ('verified', 'unverified', 'likely_to_engage', 'unavailable')",
                    "organization_ids[]": "Apollo organization IDs to filter by specific companies",
                    "organization_num_employees_ranges[]": "Employee count ranges (e.g., '1,10', '250,500', '10000,20000')",
                    "q_keywords": "General keywords to filter results",
                    "page": "Page number (default: 1)",
                    "per_page": "Results per page (default: 10, max: 100) - Use smaller values to avoid context limits"
                }
            },
            "people_enrichment": {
                "route": "/people/match",
                "method": "POST",
                "name": "People Enrichment",
                "description": "Enrich data for 1 person with verified contact information. Use this ONLY after user confirms they want to enrich a specific person's data (use 'ask' tool first). This may consume API credits. Provide as much identifying information as possible (name, email, company domain, LinkedIn URL) to improve match accuracy. User can choose to reveal personal emails and/or phone numbers.",
                "payload": {
                    "first_name": "First name of the person (required if not using 'name')",
                    "last_name": "Last name of the person (required if not using 'name')", 
                    "name": "Full name of the person (alternative to first_name + last_name)",
                    "email": "Email address of the person (if known)",
                    "hashed_email": "MD5 or SHA-256 hashed email (if known)",
                    "organization_name": "Name of the person's employer/company",
                    "domain": "Company domain (e.g., 'apollo.io' without www or @)",
                    "id": "Apollo person ID (if known from previous search)",
                    "linkedin_url": "LinkedIn profile URL",
                    "reveal_personal_emails": "Set to true to reveal personal emails (may consume credits, default: false)",
                    "reveal_phone_number": "Set to true to reveal phone numbers (may consume credits, requires webhook_url, default: false)",
                    "webhook_url": "Required if reveal_phone_number is true - URL to receive phone number data asynchronously"
                }
            },
            "bulk_people_enrichment": {
                "route": "/people/bulk_match", 
                "method": "POST",
                "name": "Bulk People Enrichment",
                "description": "Enrich data for up to 10 people with verified contact information. Use this ONLY after user confirms they want to enrich multiple people's data (use 'ask' tool first). This may consume API credits. Provide identifying information for each person in the details array. User can choose to reveal personal emails and/or phone numbers for all people.",
                "payload": {
                    "reveal_personal_emails": "Set to true to reveal personal emails for all matches (may consume credits, default: false)",
                    "reveal_phone_number": "Set to true to reveal phone numbers for all matches (may consume credits, requires webhook_url, default: false)", 
                    "webhook_url": "Required if reveal_phone_number is true - URL to receive phone number data asynchronously",
                    "details": "Array of person objects (max 10), each containing identifying information like first_name, last_name, email, organization_name, domain, etc."
                }
            },
            "organization_enrichment": {
                "route": "/organizations/{id}",
                "method": "GET",
                "name": "Organization Enrichment",
                "description": "Get complete details about a specific organization by Apollo ID. Use this ONLY after user confirms they want to enrich a specific organization's data (use 'ask' tool first). This requires a master API key and may consume API credits. Not accessible to Apollo users on free plans.",
                "payload": {
                    "id": "Apollo organization ID (required) - obtained from organization search results"
                }
            },
            "bulk_organization_enrichment": {
                "route": "/organizations/bulk_enrich",
                "method": "POST",
                "name": "Bulk Organization Enrichment", 
                "description": "Enrich data for multiple organizations with detailed information. Use this ONLY after user confirms they want to enrich multiple organizations' data (use 'ask' tool first). This may consume API credits and requires proper API permissions. Provide organization identifiers like domains, names, or Apollo IDs.",
                "payload": {
                    "domains": "Array of organization domains to enrich (e.g., ['apollo.io', 'salesforce.com'])",
                    "organization_names": "Array of organization names to enrich",
                    "organization_ids": "Array of Apollo organization IDs to enrich",
                    "reveal_emails": "Set to true to reveal organization emails (may consume credits, default: false)",
                    "reveal_phone_numbers": "Set to true to reveal organization phone numbers (may consume credits, default: false)"
                }
            },
            "organization_search": {
                "route": "/organizations/search",
                "method": "POST", 
                "name": "Organization Search",
                "description": "Search for organizations/companies in the Apollo database. Perfect for finding target companies, researching prospects, and building account lists based on industry, size, location, and other criteria. IMPORTANT: After displaying search results to the user and finding relevant organizations, you MUST use the 'ask' tool to offer organization enrichment. Ask the user if they want to enrich any specific organization's data with complete details using Apollo's Organization Enrichment service (which may consume API credits and requires master API key).",
                "payload": {
                    "q_organization_domains[]": "Company domains to search for (e.g., 'apollo.io', 'salesforce.com')",
                    "organization_locations[]": "Company headquarters locations (e.g., 'san francisco', 'new york', 'london')",
                    "organization_num_employees_ranges[]": "Employee count ranges (e.g., '1,10', '11,50', '51,200', '201,500', '501,1000', '1001,5000', '5001,10000', '10001+')",
                    "organization_industry_tag_ids[]": "Industry tag IDs for filtering by specific industries",
                    "organization_keyword_tags[]": "Keyword tags associated with organizations",
                    "q_keywords": "General search keywords for company names, descriptions, etc.",
                    "sort_by_field": "Field to sort by ('organization_created_at', 'organization_num_employees')",
                    "sort_ascending": "Sort in ascending order (true/false, default: false)",
                    "page": "Page number (default: 1)",
                    "per_page": "Results per page (default: 25, max: 100)"
                }
            }
        }
    
    def get_endpoints(self) -> Dict[str, Dict[str, Any]]:
        """Get available endpoints for this provider."""
        return self.endpoints
    
    def call_endpoint(self, route: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Call an Apollo API endpoint with the given parameters.
        
        Args:
            route: The endpoint route key ('people_search', 'organization_search', 'people_enrichment', 'bulk_people_enrichment', 'organization_enrichment', 'bulk_organization_enrichment')
            payload: Query parameters and filters for the API call
            
        Returns:
            dict: The JSON response from the Apollo API
            
        Raises:
            ValueError: If the endpoint route is not found or required parameters are missing
            requests.RequestException: If the API call fails
        """
        if route not in self.endpoints:
            raise ValueError(f"Endpoint '{route}' not found. Available endpoints: {list(self.endpoints.keys())}")
        
        endpoint = self.endpoints[route]
        url = f"{self.base_url}{endpoint['route']}"
        
        # Handle URL path parameters for GET requests (e.g., organization enrichment by ID)
        if endpoint['method'] == 'GET' and '{id}' in endpoint['route']:
            if not payload or 'id' not in payload:
                raise ValueError(f"Organization ID is required for {route} endpoint")
            url = url.replace('{id}', str(payload['id']))
            # Remove id from payload since it's now in the URL path
            payload = {k: v for k, v in payload.items() if k != 'id'} if payload else {}
        
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "x-api-key": self.api_key
        }
        
        # Prepare the request payload
        request_data = {}
        
        # Handle None or invalid payload
        if payload is None:
            payload = {}
        elif not isinstance(payload, dict):
            raise ValueError(f"Invalid payload type: expected dict, got {type(payload)}")
        
        if payload:
            # Handle array parameters for Apollo API
            for key, value in payload.items():
                if key.endswith("[]") and isinstance(value, str):
                    # Convert comma-separated strings to arrays for Apollo API
                    request_data[key] = [v.strip() for v in value.split(",") if v.strip()]
                elif key.endswith("[]") and isinstance(value, list):
                    request_data[key] = value
                else:
                    request_data[key] = value
        
        # Set default pagination if not provided (only for POST endpoints)
        if endpoint['method'] == 'POST':
            if "page" not in request_data:
                request_data["page"] = 1
            if "per_page" not in request_data:
                request_data["per_page"] = 10  # Reduced from 25 to prevent context overflow
            
        # Validate required search criteria for Apollo endpoints
        self._validate_search_criteria(route, request_data)
        
        try:
            # Use appropriate HTTP method
            if endpoint['method'] == 'GET':
                response = requests.get(url, params=request_data, headers=headers, timeout=30)
            else:  # POST
                response = requests.post(url, json=request_data, headers=headers, timeout=30)
            
            # Check if response is successful
            if not response.ok:
                if response.status_code == 422:
                    raise ValueError(
                        f"Apollo API call failed with 422 Unprocessable Entity. "
                        f"This typically occurs because: "
                        f"1) You're on Apollo's free plan (search endpoints require a paid plan), "
                        f"2) Invalid search parameters, or "
                        f"3) Missing required API permissions. "
                        f"Please upgrade your Apollo plan or check your search criteria. "
                        f"Response: {response.text}"
                    )
                elif response.status_code == 401:
                    raise ValueError(
                        f"Apollo API authentication failed. Please check your APOLLO_API_KEY. "
                        f"Response: {response.text}"
                    )
                elif response.status_code == 429:
                    raise ValueError(
                        f"Apollo API rate limit exceeded. Please wait before making more requests. "
                        f"Response: {response.text}"
                    )
                else:
                    raise ValueError(f"Apollo API request failed with status {response.status_code}: {response.text}")
            
            # Try to parse JSON response
            try:
                json_response = response.json()
                
                # Handle case where API returns valid JSON null
                if json_response is None:
                    raise ValueError("Apollo API returned null response")
                
                return json_response
            except ValueError as e:
                raise ValueError(f"Invalid JSON response from Apollo API: {e}")
                
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Network error when calling Apollo API: {e}")
        except Exception as e:
            raise ValueError(f"Error calling Apollo API endpoint: {e}")
    
    def _validate_search_criteria(self, route: str, request_data: Dict[str, Any]) -> None:
        """
        Validate that required search criteria are provided for Apollo API calls.
        Apollo's search endpoints require at least one search criterion beyond pagination.
        
        Args:
            route: The endpoint route key
            request_data: The prepared request data
            
        Raises:
            ValueError: If no search criteria are provided
        """
        # Handle None or empty request_data
        if request_data is None:
            request_data = {}
            
        if not isinstance(request_data, dict):
            raise ValueError(f"Invalid request_data type: expected dict, got {type(request_data)}")
        
        # Define search criteria fields for each endpoint
        people_search_criteria = [
            "person_titles[]", "person_locations[]", "person_seniorities[]",
            "organization_locations[]", "q_organization_domains[]", 
            "contact_email_status[]", "organization_ids[]",
            "organization_num_employees_ranges[]", "q_keywords"
        ]
        
        organization_search_criteria = [
            "q_organization_domains[]", "organization_locations[]",
            "organization_num_employees_ranges[]", "organization_industry_tag_ids[]",
            "organization_keyword_tags[]", "q_keywords", "sort_by_field"
        ]
        
        people_enrichment_criteria = [
            "first_name", "last_name", "name", "email", "hashed_email",
            "organization_name", "domain", "id", "linkedin_url"
        ]
        
        organization_enrichment_criteria = [
            "id"  # Organization enrichment requires Apollo organization ID
        ]
        
        bulk_organization_enrichment_criteria = [
            "domains", "organization_names", "organization_ids"
        ]
        
        # Skip validation for non-search endpoints (pagination params only are ok)
        excluded_keys = {"api_key", "page", "per_page", "sort_ascending", "reveal_personal_emails", "reveal_phone_number", "webhook_url", "details", "reveal_emails", "reveal_phone_numbers", "domains", "organization_names", "organization_ids"}
        
        search_keys = [k for k in request_data if k not in excluded_keys]
        if not search_keys:
            raise ValueError("No search criteria provided after excluding pagination keys")

        if route == "people_search":
            # Check if any people search criteria are provided
            has_criteria = any(
                key in request_data and request_data[key] 
                for key in people_search_criteria
            )
            
            if not has_criteria:
                raise ValueError(
                    "Apollo people search requires at least one search criterion. "
                    f"Please provide one of: {', '.join(people_search_criteria)}. "
                    "Example: person_titles=['software engineer'], organization_locations=['san francisco'], or q_keywords='marketing'"
                )
                
        elif route == "organization_search":
            # Check if any organization search criteria are provided
            has_criteria = any(
                key in request_data and request_data[key] 
                for key in organization_search_criteria
            )
            
            if not has_criteria:
                raise ValueError(
                    "Apollo organization search requires at least one search criterion. "
                    f"Please provide one of: {', '.join(organization_search_criteria)}. "
                    "Example: organization_locations=['new york'], organization_num_employees_ranges=['51,200'], or q_keywords='technology'"
                )
                
        elif route == "people_enrichment":
            # Check if any people enrichment criteria are provided
            has_criteria = any(
                key in request_data and request_data[key] 
                for key in people_enrichment_criteria
            )
            
            if not has_criteria:
                raise ValueError(
                    "Apollo people enrichment requires at least one identifying criterion. "
                    f"Please provide one of: {', '.join(people_enrichment_criteria)}. "
                    "Example: name='John Doe', email='john@company.com', or domain='company.com' with first_name='John'"
                )
                
            # Validate webhook_url requirement for phone number reveal
            if request_data.get("reveal_phone_number") and not request_data.get("webhook_url"):
                raise ValueError(
                    "webhook_url is required when reveal_phone_number is set to true. "
                    "Apollo sends phone number data asynchronously to the provided webhook URL."
                )
                
        elif route == "bulk_people_enrichment":
            # Check if details array is provided and not empty
            if not request_data.get("details") or not isinstance(request_data["details"], list):
                raise ValueError(
                    "Bulk people enrichment requires a 'details' array with person information. "
                    "Each person should have identifying information like first_name, last_name, email, etc."
                )
                
            if len(request_data["details"]) > 10:
                raise ValueError(
                    "Bulk people enrichment supports maximum 10 people per request. "
                    f"You provided {len(request_data['details'])} people."
                )
                
            # Validate webhook_url requirement for phone number reveal
            if request_data.get("reveal_phone_number") and not request_data.get("webhook_url"):
                raise ValueError(
                    "webhook_url is required when reveal_phone_number is set to true. "
                    "Apollo sends phone number data asynchronously to the provided webhook URL."
                )
                
        elif route == "organization_enrichment":
            # Check if organization ID is provided
            if not request_data.get("id"):
                raise ValueError(
                    "Apollo organization enrichment requires an organization ID. "
                    "Please provide the 'id' parameter with a valid Apollo organization ID from previous search results."
                )
                
        elif route == "bulk_organization_enrichment":
            # Check if at least one organization identifier is provided
            has_criteria = any(
                key in request_data and request_data[key] 
                for key in bulk_organization_enrichment_criteria
            )
            
            if not has_criteria:
                raise ValueError(
                    "Bulk organization enrichment requires at least one organization identifier. "
                    f"Please provide one of: {', '.join(bulk_organization_enrichment_criteria)}. "
                    "Example: domains=['apollo.io', 'salesforce.com'] or organization_names=['Apollo', 'Salesforce']"
                )
    
    def search_people(
        self, 
        person_titles: Optional[List[str]] = None,
        person_locations: Optional[List[str]] = None,
        person_seniorities: Optional[List[str]] = None,
        organization_locations: Optional[List[str]] = None,
        organization_domains: Optional[List[str]] = None,
        contact_email_status: Optional[List[str]] = None,
        organization_ids: Optional[List[str]] = None,
        employee_ranges: Optional[List[str]] = None,
        keywords: Optional[str] = None,
        page: int = 1,
        per_page: int = 25
    ) -> Dict[str, Any]:
        """
        Convenience method for people search with typed parameters.
        
        Args:
            person_titles: Job titles to search for
            person_locations: Personal locations to filter by
            person_seniorities: Seniority levels to filter by
            organization_locations: Company headquarters locations
            organization_domains: Company domains
            contact_email_status: Email verification statuses
            organization_ids: Specific Apollo organization IDs
            employee_ranges: Company size ranges (e.g., ['1,10', '11,50'])
            keywords: General search keywords
            page: Page number
            per_page: Results per page
            
        Returns:
            dict: Apollo API response with people search results
        """
        payload = {
            "page": page,
            "per_page": min(per_page, 100)  # Apollo max is 100
        }
        
        if person_titles:
            payload["person_titles[]"] = person_titles
        if person_locations:
            payload["person_locations[]"] = person_locations
        if person_seniorities:
            payload["person_seniorities[]"] = person_seniorities
        if organization_locations:
            payload["organization_locations[]"] = organization_locations
        if organization_domains:
            payload["q_organization_domains[]"] = organization_domains
        if contact_email_status:
            payload["contact_email_status[]"] = contact_email_status
        if organization_ids:
            payload["organization_ids[]"] = organization_ids
        if employee_ranges:
            payload["organization_num_employees_ranges[]"] = employee_ranges
        if keywords:
            payload["q_keywords"] = keywords
            
        return self.call_endpoint("people_search", payload)
    
    def search_organizations(
        self,
        organization_domains: Optional[List[str]] = None,
        organization_locations: Optional[List[str]] = None,
        employee_ranges: Optional[List[str]] = None,
        industry_tag_ids: Optional[List[str]] = None,
        keyword_tags: Optional[List[str]] = None,
        keywords: Optional[str] = None,
        sort_by_field: Optional[str] = None,
        sort_ascending: bool = False,
        page: int = 1,
        per_page: int = 25
    ) -> Dict[str, Any]:
        """
        Convenience method for organization search with typed parameters.
        
        Args:
            organization_domains: Company domains to search
            organization_locations: Company headquarters locations
            employee_ranges: Employee count ranges
            industry_tag_ids: Industry tag IDs
            keyword_tags: Keyword tags
            keywords: General search keywords
            sort_by_field: Field to sort results by
            sort_ascending: Sort in ascending order
            page: Page number
            per_page: Results per page
            
        Returns:
            dict: Apollo API response with organization search results
        """
        payload = {
            "page": page,
            "per_page": min(per_page, 100),  # Apollo max is 100
            "sort_ascending": sort_ascending
        }
        
        if organization_domains:
            payload["q_organization_domains[]"] = organization_domains
        if organization_locations:
            payload["organization_locations[]"] = organization_locations
        if employee_ranges:
            payload["organization_num_employees_ranges[]"] = employee_ranges
        if industry_tag_ids:
            payload["organization_industry_tag_ids[]"] = industry_tag_ids
        if keyword_tags:
            payload["organization_keyword_tags[]"] = keyword_tags
        if keywords:
            payload["q_keywords"] = keywords
        if sort_by_field:
            payload["sort_by_field"] = sort_by_field
            
        return self.call_endpoint("organization_search", payload)

    def enrich_person(
        self,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        name: Optional[str] = None,
        email: Optional[str] = None,
        hashed_email: Optional[str] = None,
        organization_name: Optional[str] = None,
        domain: Optional[str] = None,
        person_id: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        reveal_personal_emails: bool = False,
        reveal_phone_number: bool = False,
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convenience method for enriching a single person's data.
        
        Args:
            first_name: First name of the person
            last_name: Last name of the person
            name: Full name (alternative to first_name + last_name)
            email: Email address of the person
            hashed_email: MD5 or SHA-256 hashed email
            organization_name: Name of the person's employer
            domain: Company domain (without www or @)
            person_id: Apollo person ID from previous search
            linkedin_url: LinkedIn profile URL
            reveal_personal_emails: Whether to reveal personal emails (may consume credits)
            reveal_phone_number: Whether to reveal phone numbers (may consume credits, requires webhook_url)
            webhook_url: URL to receive phone number data (required if reveal_phone_number=True)
            
        Returns:
            dict: Apollo API response with enriched person data
        """
        payload = {}
        
        if first_name:
            payload["first_name"] = first_name
        if last_name:
            payload["last_name"] = last_name
        if name:
            payload["name"] = name
        if email:
            payload["email"] = email
        if hashed_email:
            payload["hashed_email"] = hashed_email
        if organization_name:
            payload["organization_name"] = organization_name
        if domain:
            payload["domain"] = domain
        if person_id:
            payload["id"] = person_id
        if linkedin_url:
            payload["linkedin_url"] = linkedin_url
        if reveal_personal_emails:
            payload["reveal_personal_emails"] = True
        if reveal_phone_number:
            payload["reveal_phone_number"] = True
        if webhook_url:
            payload["webhook_url"] = webhook_url
            
        return self.call_endpoint("people_enrichment", payload)
    
    def enrich_people_bulk(
        self,
        people_details: List[Dict[str, Any]],
        reveal_personal_emails: bool = False,
        reveal_phone_number: bool = False,
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convenience method for enriching multiple people's data (up to 10).
        
        Args:
            people_details: List of person dictionaries, each containing identifying information
                          like first_name, last_name, email, organization_name, domain, etc.
            reveal_personal_emails: Whether to reveal personal emails for all matches (may consume credits)
            reveal_phone_number: Whether to reveal phone numbers for all matches (may consume credits, requires webhook_url)
            webhook_url: URL to receive phone number data (required if reveal_phone_number=True)
            
        Returns:
            dict: Apollo API response with enriched people data
            
        Example:
            people_details = [
                {"first_name": "John", "last_name": "Doe", "domain": "company.com"},
                {"name": "Jane Smith", "email": "jane@example.com"}
            ]
        """
        payload = {
            "details": people_details
        }
        
        if reveal_personal_emails:
            payload["reveal_personal_emails"] = True
        if reveal_phone_number:
            payload["reveal_phone_number"] = True
        if webhook_url:
            payload["webhook_url"] = webhook_url
            
        return self.call_endpoint("bulk_people_enrichment", payload)

    def enrich_organization(
        self,
        organization_id: str
    ) -> Dict[str, Any]:
        """
        Convenience method for enriching a single organization's data by Apollo ID.
        
        Args:
            organization_id: Apollo organization ID from previous search results
            
        Returns:
            dict: Apollo API response with enriched organization data
            
        Note:
            This endpoint requires a master API key and is not accessible to Apollo users on free plans.
        """
        payload = {
            "id": organization_id
        }
        
        return self.call_endpoint("organization_enrichment", payload)
    
    def enrich_organizations_bulk(
        self,
        domains: Optional[List[str]] = None,
        organization_names: Optional[List[str]] = None,
        organization_ids: Optional[List[str]] = None,
        reveal_emails: bool = False,
        reveal_phone_numbers: bool = False
    ) -> Dict[str, Any]:
        """
        Convenience method for enriching multiple organizations' data.
        
        Args:
            domains: List of organization domains to enrich (e.g., ['apollo.io', 'salesforce.com'])
            organization_names: List of organization names to enrich
            organization_ids: List of Apollo organization IDs to enrich
            reveal_emails: Whether to reveal organization emails (may consume credits)
            reveal_phone_numbers: Whether to reveal organization phone numbers (may consume credits)
            
        Returns:
            dict: Apollo API response with enriched organizations data
            
        Example:
            domains = ['apollo.io', 'salesforce.com']
            organization_names = ['Apollo', 'Salesforce']
        """
        payload = {}
        
        if domains:
            payload["domains"] = domains
        if organization_names:
            payload["organization_names"] = organization_names
        if organization_ids:
            payload["organization_ids"] = organization_ids
        if reveal_emails:
            payload["reveal_emails"] = True
        if reveal_phone_numbers:
            payload["reveal_phone_numbers"] = True
            
        return self.call_endpoint("bulk_organization_enrichment", payload)


if __name__ == "__main__":
    """Test the Apollo provider"""
    from dotenv import load_dotenv
    load_dotenv()
    
    try:
        provider = ApolloProvider()
        
        # Test people search
        print("Testing people search...")
        people_result = provider.search_people(
            person_titles=["software engineer", "developer"],
            organization_locations=["san francisco"],
            per_page=5
        )
        print(f"Found {people_result.get('pagination', {}).get('total_entries', 0)} people")
        
        # Test organization search
        print("\nTesting organization search...")
        org_result = provider.search_organizations(
            organization_locations=["san francisco"],
            employee_ranges=["51,200"],
            per_page=5
        )
        print(f"Found {org_result.get('pagination', {}).get('total_entries', 0)} organizations")
        
        # Test people enrichment (with sample data - won't actually enrich without user confirmation)
        print("\nTesting people enrichment endpoints availability...")
        endpoints = provider.get_endpoints()
        if "people_enrichment" in endpoints:
            print("✓ People enrichment endpoint available")
        if "bulk_people_enrichment" in endpoints:
            print("✓ Bulk people enrichment endpoint available")
            
        # Test organization enrichment endpoints availability
        print("\nTesting organization enrichment endpoints availability...")
        if "organization_enrichment" in endpoints:
            print("✓ Organization enrichment endpoint available")
        if "bulk_organization_enrichment" in endpoints:
            print("✓ Bulk organization enrichment endpoint available")
            
        # Example of how enrichment would work (commented out to avoid API consumption in tests)
        # print("\nExample enrichment calls (commented out):")
        # print("# People enrichment:")
        # print("# enriched = provider.enrich_person(")
        # print("#     name='John Doe',")
        # print("#     domain='apollo.io',")
        # print("#     reveal_personal_emails=True")
        # print("# )")
        # print("#")
        # print("# Organization enrichment:")
        # print("# enriched_org = provider.enrich_organization(")
        # print("#     organization_id='123456789'")
        # print("# )")
        
    except Exception as e:
        print(f"Test failed: {e}") 