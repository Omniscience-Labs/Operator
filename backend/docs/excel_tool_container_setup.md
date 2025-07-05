# Excel Tool Container Setup Guide

## Overview

The Excel tool runs in **Daytona sandbox containers**, not in the main backend container. This guide explains the container architecture and setup required for the Excel tool to function properly.

## Container Architecture

The Operator platform uses a multi-container architecture:

1. **Main Backend Container** (`backend/Dockerfile`) - Runs the API server
2. **Sandbox Containers** (`backend/sandbox/docker/Dockerfile`) - Where tools execute (**Excel tool runs here**)
3. **Frontend Container** (`frontend/Dockerfile`) - Next.js application

## Excel Dependencies Added

The following dependencies have been added to the sandbox container to support Excel functionality:

### Python Packages (`backend/sandbox/docker/requirements.txt`)
```
openpyxl==3.1.5
pandas==2.2.3
```

### Container Image Version
- **Updated from**: `omnisciencelabs/operator:0.1.2.8-pandoc`  
- **Updated to**: `omnisciencelabs/operator:0.1.2.9-excel`

## Building and Deploying the Updated Container

### 1. **Local Development and Testing**

```bash
# Navigate to sandbox docker directory
cd backend/sandbox/docker

# Build the container locally
docker compose build

# Test the container locally
docker compose up -d

# Verify Excel dependencies are installed
docker exec -it kortix-suna python3 -c "import openpyxl, pandas; print('Excel dependencies OK')"
```

### 2. **Production Deployment**x 

#### Option A: Build and Push to Registry
```bash
# Build with the new version tag
cd backend/sandbox/docker
docker build -t omnisciencelabs/operator:0.1.2.9-excel .

# Push to container registry
docker push omnisciencelabs/operator:0.1.2.9-excel
```

#### Option B: GitHub Actions (Recommended)
```yaml
# .github/workflows/build-sandbox.yml
name: Build Sandbox Container
on:
  push:
    paths:
      - 'backend/sandbox/docker/**'
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push
        run: |
          cd backend/sandbox/docker
          docker build -t omnisciencelabs/operator:0.1.2.9-excel .
          docker push omnisciencelabs/operator:0.1.2.9-excel
```

### 3. **Daytona Configuration Update**

After building and pushing the new container image, update your Daytona configuration:

1. **Log into Daytona Dashboard** (https://app.daytona.io)
2. **Go to Images** → Create/Update Image
3. **Set Image Name**: `omnisciencelabs/operator:0.1.2.9-excel`
4. **Set Entrypoint**: `/usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf`

## Dependency Management Strategy

### **Primary Approach**: Pre-installed Dependencies
- Excel dependencies (`openpyxl`, `pandas`) are now included in the container image
- This ensures consistent, reliable availability across all sandbox instances
- Eliminates network dependency and installation time during tool execution

### **Fallback Approach**: Dynamic Installation
The Excel tool includes fallback logic for older containers:

```python
async def _ensure_openpyxl_installed(self):
    """Ensure openpyxl is installed in the sandbox"""
    try:
        # Check if openpyxl is available
        response = self.sandbox.process.exec("python3 -c 'import openpyxl; print(openpyxl.__version__)'", timeout=10)
        if response.exit_code != 0:
            # Install if not available (fallback for older containers)
            logger.info("Installing openpyxl and pandas in sandbox...")
            install_response = self.sandbox.process.exec("pip install --no-cache-dir openpyxl==3.1.5 pandas==2.2.3", timeout=120)
            # ... error handling
```

## Verification Steps

### 1. **Container Build Verification**
```bash
# Check if packages are installed in the built image
docker run --rm omnisciencelabs/operator:0.1.2.9-excel python3 -c "
import openpyxl
import pandas
print(f'openpyxl version: {openpyxl.__version__}')
print(f'pandas version: {pandas.__version__}')
"
```

### 2. **Production Environment Verification**
```bash
# After deployment, test in a live sandbox
# This can be done through the Operator interface by running:
```

Test Python script:
```python
import openpyxl
import pandas as pd
from openpyxl import Workbook

# Test basic functionality
wb = Workbook()
ws = wb.active
ws['A1'] = 'Hello Excel!'

# Test pandas integration
df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
print("Excel tools ready!")
```

## Troubleshooting

### **Issue**: Excel tool fails with import errors
**Solution**: 
1. Verify container image version in Daytona matches `omnisciencelabs/operator:0.1.2.9-excel`
2. Check sandbox creation logs for image pull errors
3. Manually test dependency installation with shell tool:
   ```bash
   pip install --no-cache-dir openpyxl==3.1.5 pandas==2.2.3
   ```

### **Issue**: Container fails to build
**Solution**:
1. Check Docker build logs for dependency conflicts
2. Verify base image availability
3. Check network connectivity for package downloads

### **Issue**: Dynamic installation times out
**Solution**:
1. Increase timeout in `_ensure_openpyxl_installed` method
2. Use pre-built container with dependencies included
3. Check sandbox internet connectivity

## Security Considerations

- **Package Versions**: Fixed versions prevent supply chain attacks
- **Container Scanning**: Scan built images for vulnerabilities
- **Registry Security**: Use secure container registries with authentication

## Performance Optimization

- **Pre-installed Dependencies**: Eliminates 30-60 second installation time per Excel operation
- **Layer Caching**: Docker layer caching speeds up builds
- **Image Size**: Added dependencies increase container size by ~50MB

## Maintenance

- **Regular Updates**: Update openpyxl and pandas versions for security patches
- **Version Tracking**: Increment container version for each dependency change
- **Testing**: Test Excel functionality after each container update

---

**Important Notes:**
- Excel tool functionality is dependent on the correct container version being deployed
- Always test in a staging environment before production deployment
- Consider rollback plan if new container version causes issues 