#!/bin/bash

# Enhanced error handling and logging
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
  exit 1
}

log "Starting deployment..."
set -e  # Exit immediately on error

cd ~/app || error "Failed to change directory to ~/app"

# Fix npm permissions (use local install instead of global)
log "Setting up npm environment..."
mkdir -p ~/.npm-global
export NPM_CONFIG_PREFIX=~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Create PM2 log directory
log "Creating PM2 log directory..."
mkdir -p /var/log/pm2 || log "Warning: Could not create PM2 log directory, using default location"

# Install specific npm version locally
log "Installing npm..."
curl -qL https://www.npmjs.com/install.sh | sh || error "Failed to install npm"

# Install production dependencies
log "Installing dependencies..."
npm install --production --legacy-peer-deps --no-audit --no-fund || error "Failed to install dependencies"

# Build the application
log "Building application..."
npm run build || error "Failed to build application"

# Install PM2 locally (not globally)
log "Installing PM2..."
npm install pm2@latest || error "Failed to install PM2"

# Start application with PM2
log "Starting application with PM2..."
npx pm2 delete all || log "No existing PM2 processes to delete"
npx pm2 start npm --name "nestjs-app" -- run start:prod --restart-delay=3000 --max-memory-restart=500M --log=/var/log/pm2/app.log --time || error "Failed to start application with PM2"
npx pm2 save || log "Warning: Could not save PM2 process list"

# Setup PM2 to auto-restart on system reboot
log "Setting up PM2 startup..."
npx pm2 startup || log "Warning: Could not setup PM2 startup"
npx pm2 save || log "Warning: Could not save PM2 startup configuration"

log "Deployment completed successfully!"