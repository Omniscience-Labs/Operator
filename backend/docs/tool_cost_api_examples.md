# Tool Cost Estimate APIs

## Overview
Get comprehensive cost information for all available tools, including data providers, with detailed descriptions and categorization.

## API Endpoints

### 1. Detailed Cost Estimates
```http
GET /api/tools/cost-estimates
Authorization: Bearer <token>
```

**Response Example:**
```json
{
  "summary": {
    "total_tools": 17,
    "average_cost": 1.85,
    "cost_distribution": {
      "high_cost": 5,
      "medium_cost": 6,
      "low_cost": 6
    }
  },
  "tools": [
    {
      "tool_name": "sb_browser_tool",
      "display_name": "Browser Tool",
      "description": "Automate web browsing, clicking, form filling, and page interaction",
      "category": "automation",
      "icon": "🌐",
      "credit_cost": 3.0,
      "cost_tier": "high",
      "tier_color": "#ef4444",
      "cost_explanation": "Browser Tool costs 3.0 credits per use"
    },
    {
      "tool_name": "linkedin_data_provider",
      "display_name": "LinkedIn Data Provider", 
      "description": "Access LinkedIn profiles, company data, and professional information",
      "category": "data_providers",
      "icon": "💼",
      "credit_cost": 3.0,
      "cost_tier": "high",
      "tier_color": "#ef4444",
      "cost_explanation": "LinkedIn Data Provider costs 3.0 credits per use"
    },
    {
      "tool_name": "apollo_data_provider",
      "display_name": "Apollo Data Provider",
      "description": "Lead generation, contact enrichment, and company discovery", 
      "category": "data_providers",
      "icon": "🎯",
      "credit_cost": 2.5,
      "cost_tier": "medium",
      "tier_color": "#f59e0b",
      "cost_explanation": "Apollo Data Provider costs 2.5 credits per use"
    },
    {
      "tool_name": "web_search_tool",
      "display_name": "Web Search",
      "description": "Search the web using Tavily API and scrape webpages with Firecrawl",
      "category": "research", 
      "icon": "🔍",
      "credit_cost": 2.0,
      "cost_tier": "medium",
      "tier_color": "#f59e0b",
      "cost_explanation": "Web Search costs 2.0 credits per use"
    },
    {
      "tool_name": "sb_files_tool",
      "display_name": "File Manager",
      "description": "Create, read, update, and delete files with comprehensive file management",
      "category": "files",
      "icon": "📁", 
      "credit_cost": 0.5,
      "cost_tier": "low",
      "tier_color": "#10b981",
      "cost_explanation": "File Manager costs 0.5 credits per use"
    }
  ],
  "categorized_tools": {
    "automation": [
      {
        "tool_name": "sb_browser_tool",
        "display_name": "Browser Tool",
        "credit_cost": 3.0,
        "cost_tier": "high"
      }
    ],
    "data_providers": [
      {
        "tool_name": "linkedin_data_provider", 
        "display_name": "LinkedIn Data Provider",
        "credit_cost": 3.0,
        "cost_tier": "high"
      },
      {
        "tool_name": "apollo_data_provider",
        "display_name": "Apollo Data Provider", 
        "credit_cost": 2.5,
        "cost_tier": "medium"
      },
      {
        "tool_name": "amazon_data_provider",
        "display_name": "Amazon Data Provider",
        "credit_cost": 2.0,
        "cost_tier": "medium"
      },
      {
        "tool_name": "twitter_data_provider",
        "display_name": "Twitter Data Provider",
        "credit_cost": 1.5,
        "cost_tier": "medium"
      },
      {
        "tool_name": "zillow_data_provider", 
        "display_name": "Zillow Data Provider",
        "credit_cost": 1.5,
        "cost_tier": "medium"
      },
      {
        "tool_name": "yahoo_finance_data_provider",
        "display_name": "Yahoo Finance Data Provider",
        "credit_cost": 1.0,
        "cost_tier": "low"
      },
      {
        "tool_name": "activejobs_data_provider",
        "display_name": "Active Jobs Data Provider", 
        "credit_cost": 1.0,
        "cost_tier": "low"
      }
    ],
    "ai": [
      {
        "tool_name": "sb_vision_tool",
        "display_name": "Image Processing",
        "credit_cost": 2.0,
        "cost_tier": "medium"
      },
      {
        "tool_name": "sb_podcast_tool",
        "display_name": "Audio Overviews",
        "credit_cost": 1.5,
        "cost_tier": "medium"
      },
      {
        "tool_name": "sb_audio_transcription_tool",
        "display_name": "Audio Transcription",
        "credit_cost": 1.0,
        "cost_tier": "low"
      }
    ]
  },
  "cost_tiers": {
    "high": {
      "min_cost": 3.0,
      "color": "#ef4444", 
      "description": "Resource-intensive tools"
    },
    "medium": {
      "min_cost": 1.5,
      "color": "#f59e0b",
      "description": "Standard functionality tools"
    },
    "low": {
      "min_cost": 0.0,
      "color": "#10b981",
      "description": "Basic operation tools"
    }
  }
}
```

### 2. Simple Cost List
```http
GET /api/tools/costs  
Authorization: Bearer <token>
```

**Response Example:**
```json
{
  "tool_costs": {
    "Deploy Tool": 5.0,
    "Browser Tool": 3.0,
    "LinkedIn Data Provider": 3.0,
    "Apollo Data Provider": 2.5,
    "Web Search": 2.0,
    "Amazon Data Provider": 2.0,
    "Legacy Data Providers": 2.0,
    "Image Processing": 2.0,
    "Excel Operations": 2.0,
    "PDF Form Filler": 1.5,
    "Terminal": 1.5,
    "Twitter Data Provider": 1.5,
    "Zillow Data Provider": 1.5,
    "Audio Overviews": 1.5,
    "Yahoo Finance Data Provider": 1.0,
    "Active Jobs Data Provider": 1.0,
    "Audio Transcription": 1.0,
    "MCP Tools": 1.0,
    "File Manager": 0.5,
    "Port Exposure": 0.3
  },
  "total_tools": 20,
  "cost_range": {
    "highest": 5.0,
    "lowest": 0.3,
    "average": 1.87
  }
}
```

### 3. Existing Individual Endpoints

#### Data Provider Cost Estimate
```http
GET /api/data-provider/{provider_name}/cost-estimate?route={route}
Authorization: Bearer <token>
```

**Example:**
```http
GET /api/data-provider/linkedin/cost-estimate?route=person
```

**Response:**
```json
{
  "provider_name": "linkedin",
  "tool_name": "linkedin_data_provider",
  "route": "person",
  "estimated_credits": 3.0,
  "cost_tier": "high",
  "explanation": "Calling LinkedIn Data Provider (person) will cost approximately 3.0 credits"
}
```

#### Current Credit Rates
```http
GET /api/credit-rates
Authorization: Bearer <token>
```

**Response:**
```json
{
  "base_rates": {
    "conversation_per_minute": 1.0,
    "reasoning_multipliers": {
      "medium": 2.5,
      "high": 4.0
    }
  },
  "tool_costs": {
    "sb_browser_tool": 3.0,
    "linkedin_data_provider": 3.0,
    "apollo_data_provider": 2.5,
    "twitter_data_provider": 1.5,
    "sb_files_tool": 0.5
  }
}
```

## Tool Categories

### 🚀 **Infrastructure & Automation** (High Cost)
- **Deploy Tool**: 5.0 credits - Application deployment
- **Browser Tool**: 3.0 credits - Web automation

### 💼 **Data Providers** (Variable Cost)
- **LinkedIn Data Provider**: 3.0 credits - Professional profiles
- **Apollo Data Provider**: 2.5 credits - Lead generation  
- **Amazon Data Provider**: 2.0 credits - Product data
- **Twitter Data Provider**: 1.5 credits - Social media data
- **Zillow Data Provider**: 1.5 credits - Real estate data
- **Yahoo Finance Data Provider**: 1.0 credits - Financial data
- **Active Jobs Data Provider**: 1.0 credits - Job search data

### 🤖 **AI Tools** (Medium Cost)
- **Image Processing**: 2.0 credits - Vision analysis
- **Audio Overviews**: 1.5 credits - Audio summaries
- **Audio Transcription**: 1.0 credits - Speech to text

### 💻 **Development Tools** (Medium Cost)  
- **Terminal**: 1.5 credits - Shell commands
- **Web Search**: 2.0 credits - Internet research

### 📁 **File Tools** (Low to Medium Cost)
- **Excel Operations**: 2.0 credits - Spreadsheet manipulation
- **PDF Form Filler**: 1.5 credits - PDF processing  
- **File Manager**: 0.5 credits - Basic file operations

### ⚙️ **System Tools** (Low Cost)
- **MCP Tools**: 1.0 credits - External integrations
- **Port Exposure**: 0.3 credits - Network configuration

## Cost Tiers

| Tier | Range | Color | Description | Examples |
|------|-------|-------|-------------|----------|
| **High** | 3.0+ credits | 🔴 Red | Resource-intensive tools | Deploy Tool, LinkedIn Data Provider |
| **Medium** | 1.5-2.9 credits | 🟡 Amber | Standard functionality | Apollo Data Provider, Web Search |
| **Low** | 0.0-1.4 credits | 🟢 Green | Basic operations | File Manager, Port Exposure |

## Usage Examples

### Get All Tool Costs
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/tools/costs
```

### Get Detailed Tool Information
```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/tools/cost-estimates
```

### Estimate LinkedIn Call Cost
```bash  
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/data-provider/linkedin/cost-estimate?route=person"
```

## Integration Notes

- **Tool costs include data providers** as individual tools
- **Consistent pricing** across all tools types
- **Real-time estimates** based on current configuration
- **Category-based organization** for easy browsing
- **Cost tier visualization** with colors and descriptions 