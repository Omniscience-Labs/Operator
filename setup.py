#!/usr/bin/env python3
import os
import sys
import time
import platform
import subprocess
from getpass import getpass
import re
import json


IS_WINDOWS = platform.system() == 'Windows'

# ANSI colors for pretty output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_banner():
    """Print Suna setup banner"""
    print(f"""
{Colors.BLUE}{Colors.BOLD}
   ███████╗██╗   ██╗███╗   ██╗ █████╗ 
   ██╔════╝██║   ██║████╗  ██║██╔══██╗
   ███████╗██║   ██║██╔██╗ ██║███████║
   ╚════██║██║   ██║██║╚██╗██║██╔══██║
   ███████║╚██████╔╝██║ ╚████║██║  ██║
   ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝
                                      
   Setup Wizard
{Colors.ENDC}
""")

PROGRESS_FILE = '.setup_progress'

def save_progress(step):
    with open(PROGRESS_FILE, 'w') as f:
        f.write(str(step))

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            try:
                return int(f.read().strip())
            except ValueError:
                return 0
    return 0

def clear_progress():
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)

ENV_DATA_FILE = '.setup_env.json'

def save_env_data(env_data):
    with open(ENV_DATA_FILE, 'w') as f:
        json.dump(env_data, f)

def load_env_data():
    if os.path.exists(ENV_DATA_FILE):
        with open(ENV_DATA_FILE, 'r') as f:
            return json.load(f)
    return {
        'supabase': {},
        'daytona': {},
        'llm': {},
        'search': {},
        'rapidapi': {}
    }


def print_step(step_num, total_steps, step_name):
    """Print a step header"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}Step {step_num}/{total_steps}: {step_name}{Colors.ENDC}")
    print(f"{Colors.CYAN}{'='*50}{Colors.ENDC}\n")

def print_info(message):
    """Print info message"""
    print(f"{Colors.CYAN}ℹ️  {message}{Colors.ENDC}")

def print_success(message):
    """Print success message"""
    print(f"{Colors.GREEN}✅  {message}{Colors.ENDC}")

def print_warning(message):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_error(message):
    """Print error message"""
    print(f"{Colors.RED}❌  {message}{Colors.ENDC}")

def check_requirements():
    """Check if all required tools are installed"""
    requirements = {
        'git': 'https://git-scm.com/downloads',
        'docker': 'https://docs.docker.com/get-docker/',
        'python3': 'https://www.python.org/downloads/',
        'poetry': 'https://python-poetry.org/docs/#installation',
        'pip3': 'https://pip.pypa.io/en/stable/installation/',
        'node': 'https://nodejs.org/en/download/',
        'npm': 'https://docs.npmjs.com/downloading-and-installing-node-js-and-npm',
    }
    
    missing = []
    
    for cmd, url in requirements.items():
        try:
            # Check if python3/pip3 for Windows
            if platform.system() == 'Windows' and cmd in ['python3', 'pip3']:
                cmd_to_check = cmd.replace('3', '')
            else:
                cmd_to_check = cmd
                
            subprocess.run(
                [cmd_to_check, '--version'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
                shell=IS_WINDOWS
            )
            print_success(f"{cmd} is installed")
        except (subprocess.SubprocessError, FileNotFoundError):
            missing.append((cmd, url))
            print_error(f"{cmd} is not installed")
    
    if missing:
        print_error("Missing required tools. Please install them before continuing:")
        for cmd, url in missing:
            print(f"  - {cmd}: {url}")
        sys.exit(1)
    
    return True

def check_docker_running():
    """Check if Docker is running"""
    try:
        result = subprocess.run(
            ['docker', 'info'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            shell=IS_WINDOWS
        )
        print_success("Docker is running")
        return True
    except subprocess.SubprocessError:
        print_error("Docker is installed but not running. Please start Docker and try again.")
        sys.exit(1)

def check_suna_directory():
    """Check if we're in a Suna repository"""
    required_dirs = ['backend', 'frontend']
    required_files = ['README.md', 'docker-compose.yaml']
    
    for directory in required_dirs:
        if not os.path.isdir(directory):
            print_error(f"'{directory}' directory not found. Make sure you're in the Suna repository root.")
            return False
    
    for file in required_files:
        if not os.path.isfile(file):
            print_error(f"'{file}' not found. Make sure you're in the Suna repository root.")
            return False
    
    print_success("Suna repository detected")
    return True

def validate_url(url, allow_empty=False):
    """Validate a URL"""
    if allow_empty and not url:
        return True
    
    pattern = re.compile(
        r'^(?:http|https)://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or IP
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    return bool(pattern.match(url))

def validate_api_key(api_key, allow_empty=False):
    """Validate an API key (basic format check)"""
    if allow_empty and not api_key:
        return True
    
    # Basic check: not empty and at least 10 chars
    return bool(api_key)

def collect_supabase_info():
    """Collect Supabase information"""
    print_info("You'll need to create a Supabase project before continuing")
    print_info("Visit https://supabase.com/dashboard/projects to create one")
    print_info("After creating your project, visit the project settings -> Data API and you'll need to get the following information:")
    print_info("1. Supabase Project URL (e.g., https://abcdefg.supabase.co)")
    print_info("2. Supabase anon key")
    print_info("3. Supabase service role key")
    input("Press Enter to continue once you've created your Supabase project...")
    
    while True:
        supabase_url = input("Enter your Supabase Project URL (e.g., https://abcdefg.supabase.co): ")
        if validate_url(supabase_url):
            break
        print_error("Invalid URL format. Please enter a valid URL.")
    
    while True:
        supabase_anon_key = input("Enter your Supabase anon key: ")
        if validate_api_key(supabase_anon_key):
            break
        print_error("Invalid API key format. It should be at least 10 characters long.")
    
    while True:
        supabase_service_role_key = input("Enter your Supabase service role key: ")
        if validate_api_key(supabase_service_role_key):
            break
        print_error("Invalid API key format. It should be at least 10 characters long.")
    
    return {
        'SUPABASE_URL': supabase_url,
        'SUPABASE_ANON_KEY': supabase_anon_key,
        'SUPABASE_SERVICE_ROLE_KEY': supabase_service_role_key,
    }

def collect_daytona_info():
    """Collect Daytona API key"""
    print_info("You'll need to create a Daytona account before continuing")
    print_info("Visit https://app.daytona.io/ to create one")
    print_info("Then, generate an API key from 'Keys' menu")
    print_info("After that, go to Images (https://app.daytona.io/dashboard/images)")
    print_info("Click '+ Create Image'")
    print_info(f"Enter 'kortix/suna:0.1.3' as the image name")
    print_info(f"Set '/usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf' as the Entrypoint")

    input("Press Enter to continue once you've completed these steps...")
    
    while True:
        daytona_api_key = input("Enter your Daytona API key: ")
        if validate_api_key(daytona_api_key):
            break
        print_error("Invalid API key format. It should be at least 10 characters long.")
    
    return {
        'DAYTONA_API_KEY': daytona_api_key,
        'DAYTONA_SERVER_URL': "https://app.daytona.io/api",
        'DAYTONA_TARGET': "us",
    }

def collect_llm_api_keys():
    """Collect LLM API keys for various providers"""
    print_info("Suna now uses only Omni 5 - the most advanced AI model available")
    print_info("You need AWS Bedrock credentials to access Omni 5 through Anthropic")
    
    # Only Anthropic (AWS Bedrock) is available for Omni 5
    print(f"\n{Colors.CYAN}Available LLM provider:{Colors.ENDC}")
    print(f"{Colors.CYAN}[1] {Colors.GREEN}Anthropic (AWS Bedrock){Colors.ENDC} {Colors.CYAN}- Omni 5 access{Colors.ENDC}")
    print_info("This is the only available option for accessing Omni 5")
    
    # Automatically select Anthropic since it's the only option
    selected_providers = ['ANTHROPIC']
    print_info("Automatically configuring Anthropic (AWS Bedrock) for Omni 5 access")
    
    # # Legacy multi-provider code commented out - only Omni 5 is active
    # while True:
    #     providers_input = input("Select providers (required, at least one): ")
    #     selected_providers = []
    #     
    #     try:
    #         # Parse the input, handle both comma-separated and space-separated
    #         provider_numbers = [int(p.strip()) for p in providers_input.replace(',', ' ').split()]
    #         
    #         for num in provider_numbers:
    #             if num == 1:
    #                 selected_providers.append('OPENAI')
    #             elif num == 2:
    #                 selected_providers.append('ANTHROPIC')
    #             elif num == 3:
    #                 selected_providers.append('OPENROUTER')
    #         
    #         if selected_providers:
    #             break
    #         else:
    #             print_error("Please select at least one provider.")
    #     except ValueError:
    #         print_error("Invalid input. Please enter provider numbers (e.g., 1,2,3).")

    # Collect API keys for selected providers
    api_keys = {}
    model_info = {}
    
    # Model aliases for reference - Only Omni 5 is recommended and active
    model_aliases = {
        'OPENAI': [
            # 'openai/gpt-4o', 'openai/gpt-4o-mini'  # Commented out - only Omni 5 is active
        ],
        'ANTHROPIC': [
            # Only Omni 5 is available and recommended
            'bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0',  # Omni 5 - AWS Bedrock
            # 'anthropic/claude-sonnet-4-20250514',  # Legacy direct API - Commented out
            # 'anthropic/claude-3-5-sonnet-latest'  # Commented out - only Omni 5 is active
        ],
        'OPENROUTER': [
            # 'openrouter/google/gemini-2.5-pro-preview', 'openrouter/deepseek/deepseek-chat-v3-0324:free', 'openrouter/openai/gpt-4o-2024-11-20'  # Commented out - only Omni 5 is active
        ],
    }
    
    for provider in selected_providers:
        print_info(f"\nConfiguring {provider}")
        
        # OpenAI provider commented out - only Omni 5 is active
        # if provider == 'OPENAI':
        #     while True:
        #         api_key = input("Enter your OpenAI API key: ")
        #         if validate_api_key(api_key):
        #             api_keys['OPENAI_API_KEY'] = api_key
        #             
        #             # Recommend default model
        #             print(f"\n{Colors.CYAN}Recommended OpenAI models:{Colors.ENDC}")
        #             for i, model in enumerate(model_aliases['OPENAI'], 1):
        #                 print(f"{Colors.CYAN}[{i}] {Colors.GREEN}{model}{Colors.ENDC}")
        #             
        #             model_choice = input("Select default model (1-4) or press Enter for gpt-4o: ").strip()
        #             if not model_choice:
        #                 model_info['default_model'] = 'openai/gpt-4o'
        #             elif model_choice.isdigit() and 1 <= int(model_choice) <= len(model_aliases['OPENAI']):
        #                 model_info['default_model'] = model_aliases['OPENAI'][int(model_choice) - 1]
        #             else:
        #                 model_info['default_model'] = 'openai/gpt-4o'
        #                 print_warning(f"Invalid selection, using default: openai/gpt-4o")
        #             break
        #         print_error("Invalid API key format. It should be at least 10 characters long.")
        
        if provider == 'ANTHROPIC':
            print_info("For Anthropic provider, you need AWS Bedrock credentials for Omni 5 access")
            print_info("This provides access to Omni 5 - the latest and most advanced model")
            
            while True:
                aws_access_key = input("Enter your AWS Access Key ID: ")
                if validate_api_key(aws_access_key):
                    api_keys['AWS_ACCESS_KEY_ID'] = aws_access_key
                    break
                print_error("Invalid AWS Access Key ID format. It should be at least 10 characters long.")
            
            while True:
                aws_secret_key = input("Enter your AWS Secret Access Key: ")
                if validate_api_key(aws_secret_key):
                    api_keys['AWS_SECRET_ACCESS_KEY'] = aws_secret_key
                    break
                print_error("Invalid AWS Secret Access Key format. It should be at least 10 characters long.")
            
            # Set AWS region for Bedrock
            aws_region = input("Enter your AWS region (press Enter for us-east-1): ").strip()
            if not aws_region:
                aws_region = "us-east-1"
            api_keys['AWS_REGION_NAME'] = aws_region
            
            # Only Omni 5 is available
            print(f"\n{Colors.CYAN}Available Anthropic model:{Colors.ENDC}")
            print(f"{Colors.CYAN}[1] {Colors.GREEN}Omni 5 (bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0){Colors.ENDC}")
            print_info("Omni 5 is the only available model and will be set as default")
            
            model_info['default_model'] = 'bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0'
        
        # OpenRouter provider commented out - only Omni 5 is active
        # elif provider == 'OPENROUTER':
        #     while True:
        #         api_key = input("Enter your OpenRouter API key: ")
        #         if validate_api_key(api_key):
        #             api_keys['OPENROUTER_API_KEY'] = api_key
        #             api_keys['OPENROUTER_API_BASE'] = 'https://openrouter.ai/api/v1'
        #
        #             # Recommend default model
        #             print(f"\n{Colors.CYAN}Recommended OpenRouter models:{Colors.ENDC}")
        #             for i, model in enumerate(model_aliases['OPENROUTER'], 1):
        #                 print(f"{Colors.CYAN}[{i}] {Colors.GREEN}{model}{Colors.ENDC}")
        #             
        #             model_choice = input("Select default model (1-3) or press Enter for gemini-2.5-flash: ").strip()
        #             if not model_choice or model_choice == '1':
        #                 model_info['default_model'] = 'openrouter/google/gemini-2.5-flash-preview'
        #             elif model_choice.isdigit() and 1 <= int(model_choice) <= len(model_aliases['OPENROUTER']):
        #                 model_info['default_model'] = model_aliases['OPENROUTER'][int(model_choice) - 1]
        #             else:
        #                 model_info['default_model'] = 'openrouter/google/gemini-2.5-flash-preview'
        #                 print_warning(f"Invalid selection, using default: openrouter/google/gemini-2.5-flash-preview")
        #             break
        #         print_error("Invalid API key format. It should be at least 10 characters long.")
        
    # If no default model has been set, check which provider was selected and set an appropriate default
    if 'default_model' not in model_info:
        if 'AWS_ACCESS_KEY_ID' in api_keys:  # AWS Bedrock for Omni 5
            model_info['default_model'] = 'bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0'
        # elif 'OPENAI_API_KEY' in api_keys:  # OpenAI commented out - only Omni 5 is active
        #     model_info['default_model'] = 'openai/gpt-4o'
        # elif 'OPENROUTER_API_KEY' in api_keys:  # OpenRouter commented out - only Omni 5 is active
        #     model_info['default_model'] = 'openrouter/google/gemini-2.5-flash-preview'
    
    print_success(f"Using {model_info['default_model']} as the default model")
    
    # Add the default model to the API keys dictionary
    api_keys['MODEL_TO_USE'] = model_info['default_model']
    
    return api_keys

def collect_search_api_keys():
    """Collect search API keys (now required, not optional)"""
    print_info("You'll need to obtain API keys for search and web scraping")
    print_info("Visit https://tavily.com/ to get a Tavily API key")
    print_info("Visit https://firecrawl.dev/ to get a Firecrawl API key")
    
    while True:
        tavily_api_key = input("Enter your Tavily API key: ")
        if validate_api_key(tavily_api_key):
            break
        print_error("Invalid API key format. It should be at least 10 characters long.")
    
    while True:
        firecrawl_api_key = input("Enter your Firecrawl API key: ")
        if validate_api_key(firecrawl_api_key):
            break
        print_error("Invalid API key format. It should be at least 10 characters long.")
    
    # Ask if user is self-hosting Firecrawl
    is_self_hosted = input("Are you self-hosting Firecrawl? (y/n): ").lower().strip() == 'y'
    firecrawl_url = "https://api.firecrawl.dev"  # Default URL
    
    if is_self_hosted:
        while True:
            custom_url = input("Enter your Firecrawl URL (e.g., https://your-firecrawl-instance.com): ")
            if validate_url(custom_url):
                firecrawl_url = custom_url
                break
            print_error("Invalid URL format. Please enter a valid URL.")
    
    return {
        'TAVILY_API_KEY': tavily_api_key,
        'FIRECRAWL_API_KEY': firecrawl_api_key,
        'FIRECRAWL_URL': firecrawl_url,
    }

def collect_rapidapi_keys():
    """Collect RapidAPI key (optional)"""
    print_info("To enable API services like LinkedIn, and others, you'll need a RapidAPI key")
    print_info("Each service requires individual activation in your RapidAPI account:")
    print_info("1. Locate the service's `base_url` in its corresponding file (e.g., https://linkedin-data-scraper.p.rapidapi.com in backend/agent/tools/data_providers/LinkedinProvider.py)")
    print_info("2. Visit that specific API on the RapidAPI marketplace")
    print_info("3. Subscribe to th`e service (many offer free tiers with limited requests)")
    print_info("4. Once subscribed, the service will be available to your agent through the API Services tool")
    print_info("A RapidAPI key is optional for API services like LinkedIn")
    print_info("Visit https://rapidapi.com/ to get your API key if needed")
    print_info("You can leave this blank and add it later if desired")
    
    rapid_api_key = input("Enter your RapidAPI key (optional, press Enter to skip): ")
    
    # Allow empty key
    if not rapid_api_key:
        print_info("Skipping RapidAPI key setup. You can add it later if needed.")
    else:
        # Validate if not empty
        if not validate_api_key(rapid_api_key, allow_empty=True):
            print_warning("The API key format seems invalid, but continuing anyway.")
    
    return {
        'RAPID_API_KEY': rapid_api_key,
    }

def configure_backend_env(env_vars, use_docker=True):
    """Configure backend .env file"""
    env_path = os.path.join('backend', '.env')
    
    # Redis configuration (based on deployment method)
    redis_host = 'redis' if use_docker else 'localhost'
    redis_config = {
        'REDIS_HOST': redis_host,
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': '',
        'REDIS_SSL': 'false',
    }

    # RabbitMQ configuration (based on deployment method)
    rabbitmq_host = 'rabbitmq' if use_docker else 'localhost'
    rabbitmq_config = {
        'RABBITMQ_HOST': rabbitmq_host,
        'RABBITMQ_PORT': '5672',
    }
    
    # Organize all configuration
    all_config = {}
    
    # Create a string with the formatted content
    env_content = """# Generated by Suna setup script

# Environment Mode
# Valid values: local, staging, production
ENV_MODE=local

#DATABASE
"""

    # Supabase section
    for key, value in env_vars['supabase'].items():
        env_content += f"{key}={value}\n"
    
    # Redis section
    env_content += "\n# REDIS\n"
    for key, value in redis_config.items():
        env_content += f"{key}={value}\n"
    
    # RabbitMQ section
    env_content += "\n# RABBITMQ\n"
    for key, value in rabbitmq_config.items():
        env_content += f"{key}={value}\n"
    
    # LLM section
    env_content += "\n# LLM Providers:\n"
    # Add empty values for all LLM providers we support
    all_llm_keys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'MODEL_TO_USE']
    # Add AWS keys separately
    aws_keys = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION_NAME']
    
    # First add the keys that were provided
    for key, value in env_vars['llm'].items():
        if key in all_llm_keys:
            env_content += f"{key}={value}\n"
            # Remove from the list once added
            if key in all_llm_keys:
                all_llm_keys.remove(key)
    
    # Add empty values for any remaining LLM keys
    for key in all_llm_keys:
        env_content += f"{key}=\n"
    
    # AWS section
    env_content += "\n# AWS Bedrock\n"
    for key in aws_keys:
        value = env_vars['llm'].get(key, '')
        env_content += f"{key}={value}\n"
    
    # Additional OpenRouter params
    if 'OR_SITE_URL' in env_vars['llm'] or 'OR_APP_NAME' in env_vars['llm']:
        env_content += "\n# OpenRouter Additional Settings\n"
        if 'OR_SITE_URL' in env_vars['llm']:
            env_content += f"OR_SITE_URL={env_vars['llm']['OR_SITE_URL']}\n"
        if 'OR_APP_NAME' in env_vars['llm']:
            env_content += f"OR_APP_NAME={env_vars['llm']['OR_APP_NAME']}\n"
    
    # DATA APIs section
    env_content += "\n# DATA APIS\n"
    for key, value in env_vars['rapidapi'].items():
        env_content += f"{key}={value}\n"
    
    # Web search section
    env_content += "\n# WEB SEARCH\n"
    tavily_key = env_vars['search'].get('TAVILY_API_KEY', '')
    env_content += f"TAVILY_API_KEY={tavily_key}\n"
    
    # Web scrape section
    env_content += "\n# WEB SCRAPE\n"
    firecrawl_key = env_vars['search'].get('FIRECRAWL_API_KEY', '')
    firecrawl_url = env_vars['search'].get('FIRECRAWL_URL', '')
    env_content += f"FIRECRAWL_API_KEY={firecrawl_key}\n"
    env_content += f"FIRECRAWL_URL={firecrawl_url}\n"
    
    # Daytona section
    env_content += "\n# Sandbox container provider:\n"
    for key, value in env_vars['daytona'].items():
        env_content += f"{key}={value}\n"
    
    # Add next public URL at the end
    env_content += f"NEXT_PUBLIC_URL=http://localhost:3000\n"
    
    # Write to file
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    print_success(f"Backend .env file created at {env_path}")
    print_info(f"Redis host is set to: {redis_host}")
    print_info(f"RabbitMQ host is set to: {rabbitmq_host}")

def configure_frontend_env(env_vars, use_docker=True):
    """Configure frontend .env.local file"""
    env_path = os.path.join('frontend', '.env.local')
    
    # Use the appropriate backend URL based on start method
    backend_url = "http://localhost:8000/api"

    config = {
        'NEXT_PUBLIC_SUPABASE_URL': env_vars['supabase']['SUPABASE_URL'],
        'NEXT_PUBLIC_SUPABASE_ANON_KEY': env_vars['supabase']['SUPABASE_ANON_KEY'],
        'NEXT_PUBLIC_BACKEND_URL': backend_url,
        'NEXT_PUBLIC_URL': 'http://localhost:3000',
        'NEXT_PUBLIC_ENV_MODE': 'LOCAL',
    }

    # Write to file
    with open(env_path, 'w') as f:
        for key, value in config.items():
            f.write(f"{key}={value}\n")
    
    print_success(f"Frontend .env.local file created at {env_path}")
    print_info(f"Backend URL is set to: {backend_url}")

def setup_supabase():
    """Setup Supabase database"""
    print_info("Setting up Supabase database...")
    
    # Check if the Supabase CLI is installed
    try:
        subprocess.run(
            ['supabase', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            shell=IS_WINDOWS
        )
    except (subprocess.SubprocessError, FileNotFoundError):
        print_error("Supabase CLI is not installed.")
        print_info("Please install it by following instructions at https://supabase.com/docs/guides/cli/getting-started")
        print_info("After installing, run this setup again")
        sys.exit(1)
    
    # Extract project reference from Supabase URL
    supabase_url = os.environ.get('SUPABASE_URL')
    if not supabase_url:
        # Get from main function if environment variable not set
        env_path = os.path.join('backend', '.env')
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('SUPABASE_URL='):
                        supabase_url = line.strip().split('=', 1)[1]
                        break

    project_ref = None
    if supabase_url:
        # Extract project reference from URL (format: https://[project_ref].supabase.co)
        match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
        if match:
            project_ref = match.group(1)
            print_success(f"Extracted project reference '{project_ref}' from your Supabase URL")
    
    # If extraction failed, ask the user
    if not project_ref:
        print_info("Could not extract project reference from Supabase URL")
        print_info("Get your Supabase project reference from the Supabase dashboard")
        print_info("It's the portion after 'https://' and before '.supabase.co' in your project URL")
        project_ref = input("Enter your Supabase project reference: ")
    
    # Change the working directory to backend
    backend_dir = os.path.join(os.getcwd(), 'backend')
    print_info(f"Changing to backend directory: {backend_dir}")
    
    try:
        # Login to Supabase CLI (interactive)
        print_info("Logging into Supabase CLI...")
        subprocess.run(['supabase', 'login'], check=True, shell=IS_WINDOWS)
        
        # Link to project
        print_info(f"Linking to Supabase project {project_ref}...")
        subprocess.run(
            ['supabase', 'link', '--project-ref', project_ref],
            cwd=backend_dir,
            check=True,
            shell=IS_WINDOWS
        )
        
        # Push database migrations
        print_info("Pushing database migrations...")
        subprocess.run(
            ['supabase', 'db', 'push'],
            cwd=backend_dir,
            check=True,
            shell=IS_WINDOWS
        )
        
        print_success("Supabase database setup completed")
        
        # Reminder for manual step
        print_warning("IMPORTANT: You need to manually expose the 'basejump' schema in Supabase")
        print_info("Go to the Supabase web platform -> choose your project -> Project Settings -> Data API")
        print_info("In the 'Exposed Schema' section, add 'basejump' if not already there")
        input("Press Enter once you've completed this step...")
        
    except subprocess.SubprocessError as e:
        print_error(f"Failed to setup Supabase: {e}")
        sys.exit(1)

def install_dependencies():
    """Install frontend and backend dependencies"""
    print_info("Installing required dependencies...")
    
    try:
        # Install frontend dependencies
        print_info("Installing frontend dependencies...")
        subprocess.run(
            ['npm', 'install'], 
            cwd='frontend',
            check=True,
            shell=IS_WINDOWS
        )
        print_success("Frontend dependencies installed successfully")
        
        # Lock dependencies
        print_info("Locking dependencies...")
        subprocess.run(
            ['poetry', 'lock'],
            cwd='backend',
            check=True,
            shell=IS_WINDOWS
        )
        # Install backend dependencies
        print_info("Installing backend dependencies...")
        subprocess.run(
            ['poetry', 'install'], 
            cwd='backend',
            check=True,
            shell=IS_WINDOWS
        )
        print_success("Backend dependencies installed successfully")
        
        return True
    except subprocess.SubprocessError as e:
        print_error(f"Failed to install dependencies: {e}")
        print_info("You may need to install them manually.")
        return False

def start_suna():
    """Start Suna using Docker Compose or manual startup"""
    print_info("You can start Suna using either Docker Compose or by manually starting the frontend, backend and worker.")

    print(f"\n{Colors.CYAN}How would you like to start Suna?{Colors.ENDC}")
    print(f"{Colors.CYAN}[1] {Colors.GREEN}Docker Compose{Colors.ENDC} {Colors.CYAN}(recommended, starts all services){Colors.ENDC}")
    print(f"{Colors.CYAN}[2] {Colors.GREEN}Manual startup{Colors.ENDC} {Colors.CYAN}(requires Redis, RabbitMQ & separate terminals){Colors.ENDC}\n")
    
    while True:
        start_method = input("Enter your choice (1 or 2): ")
        if start_method in ["1", "2"]:
            break
        print_error("Invalid selection. Please enter '1' for Docker Compose or '2' for Manual startup.")
    
    use_docker = start_method == "1"
    
    if use_docker:
        print_info("Starting Suna with Docker Compose...")
        
        try:
            # TODO: uncomment when we have pre-built images on Docker Hub or GHCR
            # GitHub repository environment variable setup
            # github_repo = None
            
            # print(f"\n{Colors.CYAN}Do you want to use pre-built images or build locally?{Colors.ENDC}")
            # print(f"{Colors.CYAN}[1] {Colors.GREEN}Pre-built images{Colors.ENDC} {Colors.CYAN}(faster){Colors.ENDC}")
            # print(f"{Colors.CYAN}[2] {Colors.GREEN}Build locally{Colors.ENDC} {Colors.CYAN}(customizable){Colors.ENDC}\n")
            
            # while True:
            #     build_choice = input("Enter your choice (1 or 2): ")
            #     if build_choice in ["1", "2"]:
            #         break
            #     print_error("Invalid selection. Please enter '1' for pre-built images or '2' for building locally.")
                
            # use_prebuilt = build_choice == "1"
            
            # if use_prebuilt:
            #     # Get GitHub repository name from user
            #     print_info("For pre-built images, you need to specify a GitHub repository name")
            #     print_info("Example format: your-github-username/repo-name")
                
            #     github_repo = input("Enter GitHub repository name: ")
            #     if not github_repo or "/" not in github_repo:
            #         print_warning("Invalid GitHub repository format. Using a default value.")
            #         # Create a random GitHub repository name as fallback
            #         random_name = ''.join(random.choices(string.ascii_lowercase, k=8))
            #         github_repo = f"user/{random_name}"
                
            #     # Set the environment variable
            #     os.environ["GITHUB_REPOSITORY"] = github_repo
            #     print_info(f"Using GitHub repository: {github_repo}")
                
            #     # Start with pre-built images
            #     print_info("Using pre-built images...")
            #     subprocess.run(['docker', 'compose', '-f', 'docker-compose.ghcr.yaml', 'up', '-d'], check=True)
            # else:
            #     # Start with docker-compose (build images locally)
            #     print_info("Building images locally...")
            #     subprocess.run(['docker', 'compose', 'up', '-d'], check=True)

            print_info("Building images locally...")
            subprocess.run(['docker', 'compose', 'up', '-d', '--build'], check=True, shell=IS_WINDOWS)

            # Wait for services to be ready
            print_info("Waiting for services to start...")
            time.sleep(10)  # Give services some time to start
            
            # Check if services are running
            result = subprocess.run(
                ['docker', 'compose', 'ps', '-q'],
                capture_output=True,
                text=True,
                shell=IS_WINDOWS
            )
            
            if "backend" in result.stdout and "frontend" in result.stdout:
                print_success("Suna services are up and running!")
            else:
                print_warning("Some services might not be running correctly. Check 'docker compose ps' for details.")
            
        except subprocess.SubprocessError as e:
            print_error(f"Failed to start Suna: {e}")
            sys.exit(1)
            
        return use_docker
    else:
        print_info("For manual startup, you'll need to:")
        print_info("1. Start Redis and RabbitMQ in Docker (required for the backend)")
        print_info("2. Start the frontend with npm run dev")
        print_info("3. Start the backend with poetry run python3.11 api.py")
        print_info("4. Start the worker with poetry run python3.11 -m dramatiq run_agent_background")
        print_warning("Note: Redis and RabbitMQ must be running before starting the backend")
        print_info("Detailed instructions will be provided at the end of setup")
        
        return use_docker

def final_instructions(use_docker=True, env_vars=None):
    """Show final instructions"""
    print(f"\n{Colors.GREEN}{Colors.BOLD}✨ Suna Setup Complete! ✨{Colors.ENDC}\n")
    
    # Display LLM configuration info if available
    if env_vars and 'llm' in env_vars and 'MODEL_TO_USE' in env_vars['llm']:
        default_model = env_vars['llm']['MODEL_TO_USE']
        print_info(f"Suna is configured to use {Colors.GREEN}{default_model}{Colors.ENDC} as the default LLM model")
    
    if use_docker:
        print_info("Your Suna instance is now running!")
        print_info("Access it at: http://localhost:3000")
        print_info("Create an account using Supabase authentication to start using Suna")
        print("\nUseful Docker commands:")
        print(f"{Colors.CYAN}  docker compose ps{Colors.ENDC}         - Check the status of Suna services")
        print(f"{Colors.CYAN}  docker compose logs{Colors.ENDC}       - View logs from all services")
        print(f"{Colors.CYAN}  docker compose logs -f{Colors.ENDC}    - Follow logs from all services")
        print(f"{Colors.CYAN}  docker compose down{Colors.ENDC}       - Stop Suna services")
        print(f"{Colors.CYAN}  docker compose up -d{Colors.ENDC}      - Start Suna services (after they've been stopped)")
    else:
        print_info("Suna setup is complete but services are not running yet.")
        print_info("To start Suna, you need to:")
        
        print_info("1. Start Redis and RabbitMQ (required for backend):")
        print(f"{Colors.CYAN}    cd backend")
        print(f"    docker compose up redis rabbitmq -d{Colors.ENDC}")
        
        print_info("2. In one terminal:")
        print(f"{Colors.CYAN}    cd frontend")
        print(f"    npm run dev{Colors.ENDC}")
        
        print_info("3. In another terminal:")
        print(f"{Colors.CYAN}    cd backend")
        print(f"    poetry run python3.11 api.py{Colors.ENDC}")
        
        print_info("3. In one more terminal:")
        print(f"{Colors.CYAN}    cd backend")
        print(f"    poetry run python3.11 -m dramatiq run_agent_background{Colors.ENDC}")
        
        print_info("4. Once all services are running, access Suna at: http://localhost:3000")
        print_info("5. Create an account using Supabase authentication to start using Suna")

# Then update your main() function as follows:

def main():
    total_steps = 8
    current_step = load_progress() + 1

    print_banner()
    print("This wizard will guide you through setting up Suna, an open-source generalist AI agent.\n")

    env_vars = load_env_data()

    if current_step <= 1:
        print_step(current_step, total_steps, "Checking requirements")
        check_requirements()
        check_docker_running()
        if not check_suna_directory():
            print_error("This setup script must be run from the Suna repository root directory.")
            sys.exit(1)
        save_progress(current_step)
        current_step += 1

    if current_step <= 2:
        print_step(current_step, total_steps, "Collecting Supabase information")
        env_vars['supabase'] = collect_supabase_info()
        os.environ['SUPABASE_URL'] = env_vars['supabase']['SUPABASE_URL']
        save_env_data(env_vars)
        save_progress(current_step)
        current_step += 1

    if current_step <= 3:
        print_step(current_step, total_steps, "Collecting Daytona information")
        env_vars['daytona'] = collect_daytona_info()
        save_env_data(env_vars)
        save_progress(current_step)
        current_step += 1

    if current_step <= 4:
        print_step(current_step, total_steps, "Collecting LLM API keys")
        env_vars['llm'] = collect_llm_api_keys()
        save_env_data(env_vars)
        save_progress(current_step)
        current_step += 1

    if current_step <= 5:
        print_step(current_step, total_steps, "Collecting search and web scraping API keys")
        env_vars['search'] = collect_search_api_keys()
        save_env_data(env_vars)
        save_progress(current_step)
        current_step += 1

    if current_step <= 6:
        print_step(current_step, total_steps, "Collecting RapidAPI key")
        env_vars['rapidapi'] = collect_rapidapi_keys()
        save_env_data(env_vars)
        save_progress(current_step)
        current_step += 1

    if current_step <= 7:
        print_step(current_step, total_steps, "Setting up Supabase")
        setup_supabase()
        save_progress(current_step)
        current_step += 1

    if current_step <= 8:
        print_step(current_step, total_steps, "Installing dependencies")
        install_dependencies()
        print_info("Configuring environment files...")
        configure_backend_env(env_vars, True)
        configure_frontend_env(env_vars, True)
        print_step(current_step, total_steps, "Starting Suna")
        use_docker = start_suna()
        if not use_docker:
            configure_backend_env(env_vars, use_docker)
            configure_frontend_env(env_vars, use_docker)
        final_instructions(use_docker, env_vars)
        clear_progress()
        if os.path.exists(ENV_DATA_FILE):
            os.remove(ENV_DATA_FILE)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup interrupted. You can resume setup anytime by running this script again.")
        sys.exit(1)
