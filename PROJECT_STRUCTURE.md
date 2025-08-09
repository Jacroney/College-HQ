# College HQ Project Structure

## Directory Organization

```
College HQ/
├── src/                    # React frontend application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components (Advising, Profile, etc.)
│   ├── contexts/          # React contexts (Auth, etc.)
│   ├── services/          # API service layer
│   ├── types/             # TypeScript type definitions
│   └── config/            # Configuration files
│
├── lambda-functions/       # AWS Lambda backend services
│   ├── auth-handler/      # Cognito JWT validation
│   ├── profile-service/   # User profile management
│   ├── advising-service/  # AI advising agent
│   ├── course-service/    # Course catalog & requirements
│   ├── conversation-service/ # Chat history
│   └── shared/            # Shared utilities
│
├── scrapers/              # Python data collection scripts
│   ├── coursecatalog_scraper.py
│   ├── degreerequirements_scraper.py
│   └── flowchart_scraper.py
│
├── public/                # Static assets
│   ├── universities.json  # University data
│   └── college-hq-icon.svg
│
└── dist/                  # Build output (gitignored)
```

## Old Directories (Can be removed)

- `advising-agent/` - Moved to lambda-functions/advising-service
- `profile-api/` - Moved to lambda-functions/profile-service

## Deployment

### Frontend
```bash
npm run build        # Build React app
npm run dev         # Local development
```

### Backend (Lambda Functions)
```bash
cd lambda-functions/[function-name]
npm run deploy      # Deploy individual function

# Or deploy all:
cd lambda-functions
./deploy-all.sh
```

### Database
- DynamoDB tables managed via AWS Console
- Table names in environment variables

## Environment Variables

Create `.env.local` with:
```
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=your_id
VITE_USER_POOL_CLIENT_ID=your_client_id
VITE_OAUTH_DOMAIN=your_domain
VITE_API_URL=your_api_gateway_url
```

## Git Workflow

1. Frontend changes → src/
2. Backend changes → lambda-functions/
3. Data updates → scrapers/
4. Deploy Lambda → npm run deploy
5. Deploy frontend → npm run build