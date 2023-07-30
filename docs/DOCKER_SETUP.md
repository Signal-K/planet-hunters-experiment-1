# Docker Setup Guide

## Overview

This project includes Docker configuration for containerized development and builds. Docker allows you to:

- **Develop consistently** across different machines
- **Run isolated builds** without affecting your host system
- **Automate CI/CD pipelines** with reproducible builds
- **Scale build infrastructure** horizontally

## Prerequisites

- **Docker Desktop** (20.10+) - [Install here](https://www.docker.com/products/docker-desktop)
- **Docker Compose** (1.29+) - Usually included with Docker Desktop

## Quick Start

### 1. Start Development Environment

```bash
# Start the Metro bundler in a Docker container
docker-compose up react-native

# Or in detached mode
docker-compose up -d react-native
```

The dev server will be available at:
- **Metro Bundler**: http://localhost:8081
- **Dev Server**: http://localhost:8082
- **Expo Dev Client**: http://localhost:19000

### 2. Build the Image (Optional)

Pre-build the image to speed up subsequent runs:

```bash
docker-compose build react-native
```

### 3. Stop the Service

```bash
# Stop all services
docker-compose down

# Or stop and remove volumes
docker-compose down -v
```

## Services

### `react-native` (Main Development Service)

**Purpose**: Run the Metro bundler and development server

**What it does**:
1. Installs Node.js dependencies
2. Downloads Godot prebuilt libraries
3. Starts Metro bundler
4. Provides hot reload via volume mounts

**Usage**:
```bash
docker-compose up react-native
```

**Volumes**:
- Source code mounted for hot reload
- `node_modules` volume for persistence
- Cache volumes for faster rebuilds

### `godot-cli` (Optional - Godot Headless Operations)

**Purpose**: Run Godot in headless mode for automated exports and builds

**Requirements**:
- Requires a Dockerfile.godot to be created
- For PCK file generation without GUI

**Usage**:
```bash
# Start with godot profile
docker-compose up --profile godot godot-cli

# Or run a specific command
docker-compose run --rm godot-cli godot --path . --export-pack "iOS" ../ios/GodotTest.pck
```

### `ios-builder` (Optional - iOS Build Service)

**Purpose**: Build iOS app in Docker (experimental)

**Requirements**:
- macOS host (Docker on macOS)
- Xcode installed on host
- Requires a Dockerfile.ios

**Limitations**:
- Docker on macOS cannot run iOS builds natively
- Currently designed as reference architecture
- Use native `npm run ios` on macOS instead

**Usage**:
```bash
docker-compose build --profile ios ios-builder
```

### `android-builder` (Optional - Android Build Service)

**Purpose**: Build Android APK in Docker

**Requirements**:
- Android SDK and NDK
- Requires a Dockerfile.android

**Usage**:
```bash
docker-compose up --profile android android-builder
```

## File Structure

```
.
├── Dockerfile                 # Main Node.js/Metro bundler image
├── docker-compose.yml         # Service orchestration
├── .dockerignore             # Files excluded from Docker build context
├── Dockerfile.godot          # (Optional) Godot headless image
├── Dockerfile.ios            # (Optional) iOS build image
├── Dockerfile.android        # (Optional) Android build image
└── docs/
    ├── GODOT_INTEGRATION.md
    └── DOCKER_SETUP.md (this file)
```

## Environment Variables

### Inside Docker Container

The following environment variables are automatically set:

```bash
NODE_ENV=development
NODE_BINARY=/usr/local/bin/node
PATH="/app/node_modules/.bin:$PATH"
REACT_NATIVE_PACKAGER_HOSTNAME=localhost
METRO_PORT=8081
RCT_METRO_PORT=8081
```

### Custom Variables

Create a `.env` file in the project root:

```bash
NODE_ENV=development
DEBUG=*
LOG_LEVEL=info
```

Pass it to Docker:

```bash
docker-compose up --env-file .env react-native
```

## Common Tasks

### View Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f react-native

# View last 100 lines
docker-compose logs --tail=100 react-native
```

### Execute Commands in Running Container

```bash
# Run a command in the running container
docker-compose exec react-native npm install new-package

# Run an interactive shell
docker-compose exec -it react-native bash

# Run multiple commands
docker-compose exec react-native sh -c "npm run lint && npm test"
```

### Rebuild the Image

```bash
# Rebuild without cache
docker-compose build --no-cache react-native

# Rebuild and restart
docker-compose up --build react-native
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove all volumes
docker volume prune

# Complete cleanup (WARNING: removes everything)
docker-compose down -v --rmi all
```

## Volumes Explained

### Mounted Source Code Volumes

These volumes enable **hot reload** during development:

```yaml
- ./app:./app
- ./components:./components
- ./scripts:./scripts
```

Changes in these directories are immediately reflected in the running container.

### Persistent Data Volumes

These volumes cache build artifacts and dependencies:

```yaml
- node_modules:/app/node_modules
- metro_cache:/.metro
- gradle_cache:/.gradle
```

This speeds up subsequent builds and runs.

## Troubleshooting

### Port Already in Use

```bash
# Find which process is using port 8081
lsof -i :8081

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
# ports:
#   - "8083:8081"  # Map to different host port
```

### Container Exits Immediately

```bash
# Check logs for errors
docker-compose logs react-native

# Start with interactive shell for debugging
docker-compose run -it react-native bash
```

### Build Context Too Large

Docker build context includes node_modules and build artifacts. The `.dockerignore` file excludes them:

```dockerfile
# .dockerignore
node_modules/
build/
ios/Pods/
android/.gradle/
```

To reduce image size further, add to `.dockerignore`:

```dockerfile
.git/
.vscode/
.idea/
*.log
```

### Permission Errors

If you get permission errors on mounted volumes:

```bash
# Run as your user ID
docker-compose exec -u $(id -u):$(id -g) react-native bash
```

### Metro Bundler Not Starting

```bash
# Clear Metro cache and restart
docker-compose exec react-native rm -rf ~/.metro
docker-compose restart react-native
```

## Performance Tips

### 1. Use Named Volumes

Named volumes are faster than bind mounts on Docker Desktop:

```yaml
volumes:
  - node_modules:/app/node_modules  # Fast - named volume
  - ./src:./src                      # Slower - bind mount
```

### 2. Optimize Dockerfile

Use multi-stage builds to reduce final image size:

```dockerfile
# Current Dockerfile uses builder pattern
# See Dockerfile for details
```

### 3. Cache Layers

Docker caches layers. Order dependencies from least to most frequently changed:

```dockerfile
# Install dependencies (changes less often)
RUN npm install

# Copy source (changes more often)
COPY . .
```

### 4. Use `.dockerignore`

Exclude unnecessary files from build context to speed up builds.

## Advanced Usage

### Override Entrypoint

```bash
# Use an interactive shell instead of npm start
docker-compose run -it react-native bash

# Run a specific command
docker-compose run -it react-native npm run lint

# Run with custom environment
docker-compose run -e DEBUG=* react-native npm start
```

### Use Docker in CI/CD

### GitHub Actions Example

```yaml
name: Build and Test
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Scale Services

```bash
# Run multiple instances
docker-compose up --scale react-native=3
```

## Creating Additional Dockerfiles

### Dockerfile.godot

For headless Godot operations:

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    libxcursor1 \
    libxinerama1 \
    libxrandr2 \
    libxext6

WORKDIR /opt

# Download Godot
RUN curl -fsSL https://github.com/migeran/godot/releases/download/4.5.1.migeran.2/Godot_v4.5.1.migeran.2_linux_x86_64.zip \
    -o godot.zip && \
    unzip godot.zip && \
    rm godot.zip && \
    chmod +x Godot_*

WORKDIR /app
ENV GODOT_PATH=/opt/Godot_v4.5.1.migeran.2_linux_x86_64
```

### Dockerfile.android

For Android builds with NDK:

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    android-sdk \
    gradle \
    build-essential

ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=$ANDROID_SDK_ROOT
ENV GRADLE_USER_HOME=/.gradle

# Download SDK components
RUN mkdir -p $ANDROID_SDK_ROOT && \
    cd $ANDROID_SDK_ROOT && \
    # Install NDK, build tools, etc.
    echo "y" | /opt/android-sdk/cmdline-tools/bin/sdkmanager "ndk;25.1.8937393"

COPY --from=builder /app .
WORKDIR /app
```

## Network Configuration

Services communicate via the `godot-network` bridge network:

```yaml
networks:
  godot-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

Access services by hostname:
- `react-native:8081` - From other containers
- `localhost:8081` - From host machine

## Security Considerations

### 1. Don't Commit Secrets

```bash
# .env files should be in .gitignore
echo ".env.local" >> .gitignore
```

### 2. Use Secrets in Production

For production Docker deployments, use Docker secrets or external secret management.

### 3. Scan Images for Vulnerabilities

```bash
# Using Trivy scanner
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image godot-react-native:latest
```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
