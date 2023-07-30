# Docker Quick Start Guide

A quick reference for common Docker commands and workflows.

## 🚀 Quick Commands

### Start Development

```bash
# Start the development server
docker-compose up react-native

# Start in background
docker-compose up -d react-native

# View live logs
docker-compose logs -f react-native
```

### Stop Development

```bash
# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Run Commands in Container

```bash
# Install a new package
docker-compose exec react-native npm install lodash

# View project files
docker-compose exec react-native ls -la

# Open shell
docker-compose exec -it react-native bash
```

### Rebuild Image

```bash
# Rebuild without cache
docker-compose build --no-cache react-native

# Rebuild and restart
docker-compose up --build react-native
```

## 📝 Common Tasks

### Clear Cache and Rebuild

```bash
# Clear all caches and rebuild
docker-compose down -v
docker-compose build --no-cache react-native
docker-compose up react-native
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f react-native

# Last 100 lines
docker-compose logs --tail=100 react-native
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (warning: destructive)
docker-compose down -v --rmi all
```

## 🔧 Optional Services

### Godot Headless Operations

```bash
# Build with godot profile
docker-compose build --profile godot godot-cli

# Export PCK file
docker-compose run --rm godot-cli \
  godot --path . --export-pack "iOS" ../ios/GodotTest.pck

# Check Godot version
docker-compose run --rm godot-cli godot --version
```

### Android Builder (if available)

```bash
# Build with android profile
docker-compose build --profile android android-builder

# Run gradle build
docker-compose run --rm android-builder gradle assembleDebug
```

## 📊 System Information

### Check Container Status

```bash
# List all containers
docker-compose ps

# Show full container info
docker-compose ps -a
```

### Check Resource Usage

```bash
# Docker system stats
docker stats

# Disk usage
docker system df

# Image sizes
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}"
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs react-native

# Check container status
docker-compose ps

# Try with interactive shell
docker-compose run -it react-native bash
```

### Port Already in Use

```bash
# Find process using port 8081
lsof -i :8081

# Kill the process
kill -9 <PID>

# Or use different port (edit docker-compose.yml)
```

### Permission Denied

```bash
# Run as your user
docker-compose exec -u $(id -u):$(id -g) react-native bash

# Or use sudo
sudo docker-compose up react-native
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a --volumes

# Remove dangling images
docker image prune

# Remove dangling volumes
docker volume prune
```

## 💡 Tips & Tricks

### Use .env File

Create `.env` in project root:

```bash
NODE_ENV=development
DEBUG=*
```

Then run:

```bash
docker-compose up --env-file .env react-native
```

### Mount Additional Volumes

Edit `docker-compose.yml` to add custom volumes:

```yaml
volumes:
  - ./custom-folder:/app/custom-folder
```

### Run Multiple Commands

```bash
docker-compose exec react-native sh -c \
  "npm run lint && npm test && npm start"
```

### Export and Import Images

```bash
# Save image
docker save react-native:latest | gzip > react-native.tar.gz

# Load image
docker load < react-native.tar.gz
```

## 📚 More Resources

- Full documentation: See [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- Godot integration: See [GODOT_INTEGRATION.md](./GODOT_INTEGRATION.md)
- Docker docs: https://docs.docker.com/
- Docker Compose docs: https://docs.docker.com/compose/
