# TicTacToe Deployment Guide

## Overview
This document covers deploying the TicTacToe multiplayer game with Nakama backend to production.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Nakama Server  │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ - Game UI       │    │ - Match Logic   │    │ - User Data     │
│ - WebSocket     │    │ - Authentication│    │ - Game Stats    │
│ - State Display │    │ - Real-time     │    │ - Leaderboards  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 16+
- Git

### Quick Start
```bash
# Clone repository
git clone <your-repo-url>
cd tictactoe

# Start backend services
docker-compose up -d

# Start frontend
cd frontend
npm install
npm start

# Access game at http://localhost:3000
```

## Production Deployment

### Option 1: Docker Compose (Recommended)

1. **Server Requirements:**
   - 2+ CPU cores
   - 4GB+ RAM
   - 20GB+ storage
   - Ubuntu 20.04+ or similar

2. **Deploy Backend:**
   ```bash
   # On your server
   git clone <your-repo-url>
   cd tictactoe
   
   # Create production environment
   cp .env.example .env.production
   
   # Edit production settings
   nano .env.production
   
   # Deploy with production compose
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Deploy Frontend:**
   ```bash
   cd frontend
   
   # Build for production
   npm run build
   
   # Serve with nginx or similar
   # Copy build/ contents to web server
   ```

### Option 2: Cloud Deployment

#### Nakama Cloud
1. Sign up at https://heroiclabs.com/nakama-cloud/
2. Upload `tictactoe.js` module
3. Configure database
4. Get endpoint URL

#### Frontend (Netlify/Vercel)
1. Connect GitHub repository
2. Set build command: `cd frontend && npm run build`
3. Set publish directory: `frontend/build`
4. Add environment variables:
   ```
   REACT_APP_NAKAMA_HOST=your-nakama-host
   REACT_APP_NAKAMA_PORT=443
   REACT_APP_NAKAMA_KEY=your-key
   ```

## Configuration

### Environment Variables

**Backend (.env):**
```bash
POSTGRES_DB=nakama
POSTGRES_PASSWORD=your-secure-password
NAKAMA_DSN=postgres://postgres:password@postgres:5432/nakama
```

**Frontend (.env.local):**
```bash
REACT_APP_NAKAMA_HOST=your-domain.com
REACT_APP_NAKAMA_PORT=443
REACT_APP_NAKAMA_KEY=your-server-key
```

### SSL/HTTPS Setup

For production, enable HTTPS:

1. **Get SSL Certificate:**
   ```bash
   # Using Let's Encrypt
   certbot --nginx -d yourdomain.com
   ```

2. **Configure Nginx:**
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       # Frontend
       location / {
           root /var/www/tictactoe;
           try_files $uri $uri/ /index.html;
       }
       
       # Nakama API
       location /v2/ {
           proxy_pass http://localhost:7349;
           proxy_set_header Host $host;
       }
       
       # WebSocket
       location /ws {
           proxy_pass http://localhost:7350;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

## Monitoring & Maintenance

### Health Checks
```bash
# Check Nakama health
curl https://yourdomain.com/v2/healthcheck

# Check database
docker-compose exec postgres pg_isready

# Check logs
docker-compose logs -f nakama
```

### Backup Strategy
```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres nakama > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres nakama < backup.sql
```

### Scaling Considerations

1. **Horizontal Scaling:**
   - Use Nakama cluster mode
   - Load balancer for multiple instances
   - Shared PostgreSQL database

2. **Vertical Scaling:**
   - Increase CPU/RAM for containers
   - Optimize PostgreSQL settings
   - Use Redis for session storage

## Security

### Production Checklist
- [ ] Change default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerts
- [ ] Regular security updates
- [ ] Backup strategy in place

### Nakama Security
```yaml
# docker-compose.prod.yml
nakama:
  environment:
    - NAKAMA_RUNTIME_HTTP_KEY=your-secure-key
    - NAKAMA_SESSION_TOKEN_EXPIRY_SEC=7200
    - NAKAMA_LOGGER_LEVEL=WARN
```

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Check firewall settings
   - Verify ports are open
   - Check service status

2. **Database Connection:**
   - Verify PostgreSQL is running
   - Check connection string
   - Review database logs

3. **Module Loading:**
   - Check file permissions
   - Verify module syntax
   - Review Nakama logs

### Performance Optimization

1. **Frontend:**
   ```bash
   # Enable gzip compression
   # Optimize bundle size
   npm run build --analyze
   ```

2. **Backend:**
   ```yaml
   # Increase connection limits
   nakama:
     deploy:
       resources:
         limits:
           memory: 2G
           cpus: "1.0"
   ```

## Support

For issues and support:
1. Check logs: `docker-compose logs`
2. Review documentation
3. Contact development team

## Version History

- v1.0.0: Initial release
- v1.1.0: Added matchmaker
- v1.2.0: Performance improvements