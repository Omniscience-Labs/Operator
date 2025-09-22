# CORS Configuration Guide

This document explains how CORS (Cross-Origin Resource Sharing) is configured in the backend API.

## Overview

CORS configuration has been updated to use environment variables instead of hardcoded values, providing better flexibility and security for different deployment environments.

## Configuration

### Environment Variables

The following environment variables control CORS behavior:

#### `CORS_ALLOWED_ORIGINS`
- **Type**: Comma-separated string
- **Default**: `http://localhost:3000`
- **Description**: List of allowed origins for CORS requests
- **Example**: 
  ```
  CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com,https://staging.example.com
  ```

#### `CORS_ALLOWED_ORIGIN_REGEX` (Optional)
- **Type**: Regex pattern string
- **Default**: None (staging mode defaults to `https://suna-.*-prjcts\.vercel\.app`)
- **Description**: Regex pattern to match dynamic origins (useful for preview deployments)
- **Example**: 
  ```
  CORS_ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
  ```

## Implementation Details

The CORS configuration is applied in `/backend/api.py` using FastAPI's CORSMiddleware:

```python
# CORS_ALLOWED_ORIGINS should be a comma-separated string of allowed origins
cors_origins_str = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')
allowed_origins = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip()]

# Allow regex pattern for dynamic origins (optional)
allow_origin_regex = os.getenv('CORS_ALLOWED_ORIGIN_REGEX', None)
```

### Staging Environment

When `ENV_MODE=staging`, the following additional behavior applies:
- `https://operator.staging.becomeomni.com` is automatically added to allowed origins
- If no regex is provided, defaults to allowing Vercel preview deployments: `https://suna-.*-prjcts\.vercel\.app`

## Configuration Examples

### Development
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Production
```env
CORS_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
```

### With Preview Deployments
```env
CORS_ALLOWED_ORIGINS=https://app.example.com
CORS_ALLOWED_ORIGIN_REGEX=https://preview-.*\.example\.app
```

## Security Considerations

1. **Be Specific**: Only include origins that actually need access to your API
2. **Avoid Wildcards**: Don't use `*` for allowed origins in production
3. **Use HTTPS**: Always use HTTPS origins in production environments
4. **Validate Regex**: Be careful with regex patterns to avoid unintended matches

## Migration from Hardcoded Values

Previously, CORS origins were hardcoded in the `api.py` file. The migration preserves all existing allowed origins by default in the `.env.example` file, but you should review and update these for your specific deployment.