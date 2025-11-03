# suvernire plus - Backend API

Backend API for the suvernire plus custom merchandise e-commerce platform.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create database**
   ```bash
   # Create PostgreSQL database
   createdb suvernireplus
   ```

4. **Run migrations** (once database models are created)
   ```bash
   npm run db:migrate
   ```

5. **Seed initial data** (once seeders are created)
   ```bash
   npm run db:seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000/api`

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Sequelize models
│   ├── migrations/      # Database migrations
│   ├── seeders/         # Seed data
│   ├── controllers/     # Route controllers
│   ├── routes/          # Express routes
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   └── utils/          # Utility functions
├── tests/              # Test files
├── .env.example        # Environment variables template
└── server.js           # Entry point
```

## API Endpoints

API endpoints will be documented as they are implemented. See `API-SPEC.md` in the root directory for the complete API specification.

## Environment Variables

See `.env.example` for all required environment variables.

## Development

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

## Database

- `npm run db:migrate` - Run migrations
- `npm run db:migrate:undo` - Undo last migration
- `npm run db:seed` - Run seeders
- `npm run db:seed:undo` - Undo last seeder
- `npm run db:reset` - Reset database (migrate + seed)

## License

MIT

