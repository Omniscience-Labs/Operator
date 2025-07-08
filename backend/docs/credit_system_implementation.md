# Credit Tracking System Implementation

## Overview

The credit tracking system provides comprehensive monitoring and billing for:
- **Conversation time** with reasoning mode multipliers
- **Individual tool usage** with per-tool costs
- **Data provider tools** treated as individual tools (LinkedIn Data Provider, Twitter Data Provider, etc.)
- **Reasoning mode costs** (none, medium, high)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Config.py     │    │ CreditCalculator│    │  CreditTracker  │
│                 │    │                 │    │                 │
│ • Tool costs    │───▶│ • Calculate     │───▶│ • Save to DB    │
│ • Provider costs│    │   credits       │    │ • Track usage   │
│ • Reasoning     │    │ • Validate      │    │ • Reporting     │
│   multipliers   │    │   rates         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ DataProviders   │    │ ResponseProcess │    │  Database       │
│ Tool            │    │                 │    │                 │
│                 │    │ • Execute tools │    │ • agent_runs    │
│ • LinkedIn: 3.0 │    │ • Track credits │    │ • credit_usage  │
│ • Twitter: 1.5  │    │ • Save results  │    │ • Detailed logs │
│ • Apollo: 2.5   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Schema

### Enhanced `agent_runs` Table
```sql
ALTER TABLE agent_runs ADD COLUMN reasoning_mode VARCHAR(10) DEFAULT 'none';
ALTER TABLE agent_runs ADD COLUMN total_time_minutes DECIMAL(10,4) DEFAULT 0;
ALTER TABLE agent_runs ADD COLUMN conversation_credits DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_runs ADD COLUMN tool_credits DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_runs ADD COLUMN total_credits DECIMAL(10,2) DEFAULT 0;
```

### New `credit_usage` Table
```sql
CREATE TABLE credit_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id UUID NOT NULL REFERENCES agent_runs(id),
    usage_type VARCHAR(20) NOT NULL, -- 'conversation', 'tool'
    tool_name VARCHAR(100), -- e.g., 'linkedin_data_provider', 'sb_browser_tool'
    data_provider_name VARCHAR(50), -- LinkedIn, Twitter, Apollo, etc. (for reference)
    credit_amount DECIMAL(10,2) NOT NULL,
    calculation_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Configuration

### Credit Rates (`config.py`)
```python
CREDIT_RATES = {
    # Base conversation rates
    "base_rate": 1.0,                    # 1 credit per minute
    "reasoning_rate_medium": 2.5,        # 2.5x for medium reasoning
    "reasoning_rate_high": 4.0,          # 4x for high reasoning
    
    # Tool-specific costs (includes data providers as individual tools)
    "tool_costs": {
        # Infrastructure & automation tools
        "sb_browser_tool": 3.0,          # High cost (automation)
        "sb_deploy_tool": 5.0,           # Very high cost (infrastructure)
        "web_search_tool": 2.0,          # Medium cost (external API)
        "sb_files_tool": 0.5,            # Low cost (basic operation)
        
        # Data provider tools (appear as individual tools in analytics)
        "linkedin_data_provider": 3.0,   # Premium business data
        "apollo_data_provider": 2.5,     # Lead generation  
        "twitter_data_provider": 1.5,    # Social media data
        "amazon_data_provider": 2.0,     # Product data
        "yahoo_finance_data_provider": 1.0, # Financial data
        "zillow_data_provider": 1.5,     # Real estate data
        
        "default": 0.5                   # Default for unknown tools
    },
    
    # Data provider cost reference (used for fallback)
    "data_provider_costs": {
        "linkedin": 3.0, "apollo": 2.5, "twitter": 1.5,
        "amazon": 2.0, "yahoo_finance": 1.0, "zillow": 1.5,
        "default": 2.0
    }
}
```

## Usage Examples

### 1. Data Provider Call Tracking

When a user calls:
```python
await execute_data_provider_call(
    service_name="linkedin",
    route="person", 
    payload={"link": "https://linkedin.com/in/johndoe"}
)
```

**Credit Tracking Process:**
1. **Before execution**: Calculate LinkedIn cost = 3.0 credits
2. **During execution**: Call LinkedIn API
3. **After execution**: Save to `credit_usage` table:
   ```json
   {
     "usage_type": "tool",
     "tool_name": "linkedin_data_provider",
     "data_provider_name": "linkedin",
     "credit_amount": 3.0,
     "calculation_details": {
       "provider_name": "linkedin",
       "route": "person", 
       "cost_rate": 3.0,
       "cost_tier": "high",
       "tool_name": "linkedin_data_provider"
     }
   }
   ```

### 2. Reasoning Mode Cost Calculation

**Scenario**: 5-minute conversation with high reasoning
- Base time: 5 minutes × 1.0 = 5.0 credits
- High reasoning: 5 minutes × 4.0 = 20.0 credits  
- **Total conversation cost**: 20.0 credits

### 3. Complete Agent Run Example

**Agent Run**: 10 minutes, medium reasoning, with tools
```
Conversation: 10 min × 2.5 = 25.0 credits
Tools used:
├── Browser Tool: 3.0 credits
├── LinkedIn Data Provider: 3.0 credits  
├── Twitter Data Provider: 1.5 credits
└── File Manager: 0.5 credits

Total: 25.0 + 3.0 + 3.0 + 1.5 + 0.5 = 33.0 credits
```

## API Endpoints

### Get Credit Usage for Agent Run
```http
GET /api/agent-run/{agent_run_id}/credit-usage
```

**Response:**
```json
{
  "agent_run_id": "12345",
  "usage_summary": {
    "breakdown": [
      {
        "usage_type": "conversation",
        "total_credits": 25.0,
        "usage_count": 1
      },
      {
        "usage_type": "tool", 
        "total_credits": 8.0,
        "usage_count": 4,
        "details": [
          {"tool_name": "sb_browser_tool", "credits": 3.0},
          {"tool_name": "linkedin_data_provider", "credits": 3.0},
          {"tool_name": "twitter_data_provider", "credits": 1.5}, 
          {"tool_name": "sb_files_tool", "credits": 0.5}
        ]
      }
    ],
    "total_credits": 33.0
  },
  "data_provider_stats": {
    "provider_breakdown": {
      "linkedin": {"total_credits": 3.0, "call_count": 1},
      "twitter": {"total_credits": 1.5, "call_count": 1}
    }
  }
}
```

### Get Current Credit Rates
```http
GET /api/credit-rates
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
    "sb_deploy_tool": 5.0,
    "web_search_tool": 2.0,
    "linkedin_data_provider": 3.0,
    "apollo_data_provider": 2.5,
    "twitter_data_provider": 1.5,
    "yahoo_finance_data_provider": 1.0,
    "sb_files_tool": 0.5
  }
}
```

### Get Data Provider Cost Estimate
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

## Unified Tool Analytics

### Clean User Experience
- **Single tool list**: Users see "LinkedIn Data Provider: 3.0 credits" alongside "Browser Tool: 3.0 credits"
- **No sub-categories**: Data providers appear as top-level tools in analytics
- **Consistent pricing**: All tools use the same cost structure and display format
- **Easy comparison**: Users can easily compare costs across all tools

### Tool Cost Tiers
- **High**: Deploy Tool (5.0), LinkedIn Data Provider (3.0), Browser Tool (3.0)
- **Medium**: Apollo Data Provider (2.5), Web Search (2.0), Amazon Data Provider (2.0)  
- **Low**: Yahoo Finance Data Provider (1.0), File Manager (0.5)

### Enhanced Result Format
Data provider calls return enhanced results but appear as regular tools:
```json
{
  "data": { /* actual API response */ },
  "credit_usage": {
    "provider": "linkedin",
    "route": "person", 
    "credits_charged": 3.0,
    "cost_tier": "high"
  },
  "_credit_info": {
    "tool_name": "linkedin_data_provider",
    "usage_type": "tool",
    "credits": 3.0
  }
}
```

## Integration Points

### 1. Response Processor Integration
- Automatically calculates and tracks tool credits
- Detects data provider calls and extracts provider info
- Saves credit usage during tool execution

### 2. Agent Run Lifecycle  
- **Start**: Store reasoning mode in agent_runs table
- **During**: Track each tool/provider call
- **End**: Calculate conversation credits and update totals

### 3. Billing System Integration
- Real-time credit consumption tracking
- Account-level usage analytics
- Cost forecasting and budgeting

## Benefits

✅ **Clean Analytics**: Data providers appear as individual tools, not sub-categories  
✅ **Granular Tracking**: Each provider (LinkedIn, Twitter, Apollo) tracked separately  
✅ **Reasoning Multipliers**: Higher costs for advanced reasoning modes  
✅ **Real-time Monitoring**: Immediate credit calculation and storage  
✅ **Cost Transparency**: Users see "LinkedIn Data Provider: 3.0 credits" clearly  
✅ **Unified Experience**: All tools treated consistently in pricing and analytics  
✅ **Flexible Pricing**: Easy to adjust rates per tool/provider in single config  
✅ **Audit Trail**: Complete history of credit usage with calculation details

## Migration Path

1. **Run database migration**: `20250114000000_add_credit_tracking.sql`
2. **Deploy backend services**: CreditCalculator, CreditTracker, AgentRunFinalizer
3. **Update tool integrations**: Response processor, data providers tool
4. **Test credit tracking**: Verify calculations and database storage
5. **Enable billing integration**: Connect to payment systems
6. **Launch analytics**: User-facing credit usage dashboards

This implementation provides a complete, production-ready credit tracking system that accurately monitors and bills for individual data provider usage while maintaining flexibility for future enhancements. 