# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Development Environment Notes

**CRITICAL**: Always assume that the server (backend) and the mobile app (Expo) are running outside of Claude Code. Do not attempt to start, stop, or restart these services unless explicitly requested by the user.

**Network Configuration**: Trust the URLs configured in `.env` files. The development environment uses custom network configurations including DNS modifications and VPNs. Do not modify API URLs or assume localhost connections without explicit user instruction.

## Development Commands

### Root Commands (Turbo Monorepo)
- `npm run dev` - Start all applications in development mode
- `npm run build` - Build all applications 
- `npm run lint` - Run linting across all workspaces
- `npm run type-check` - Run TypeScript checking across all workspaces
- `npm run clean` - Clean build artifacts
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start PostgreSQL database with Docker Compose

### Backend Commands (apps/backend)
- `npm run dev` - Start Express server with hot reload
- `npm run build` - Compile TypeScript to dist/
- `npm run start` - Run compiled server from dist/
- `npm run type-check` - TypeScript type checking without emitting
- `prisma migrate dev --name migration-name` - Create and run database migrations (preferred over db:generate)
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run create-promo-codes` - Create sample promo codes
- `npm run promo-cli` - Interactive promo code management CLI

### Mobile Commands (apps/mobile)
**IMPORTANT: Run these commands from the apps/mobile directory:**
```bash
cd apps/mobile
npm start            # Start Expo development server
npm run android      # Run on Android device/emulator
npm run ios          # Run on iOS device/simulator
npm run web          # Run in web browser
```

### Payment Configuration Setup

#### For Development/Testing:
The default configuration in `apps/mobile/src/config/payments.ts` works out of the box for testing.

#### For Production:
1. **Update Environment Variables** in `apps/mobile/.env`:
   ```bash
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
   EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER=merchant.com.yourcompany.yourapp
   ```

2. **Apple Pay Setup** (Optional):
   - Get Apple Pay Merchant ID from Apple Developer Console
   - Update `EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID`

3. **Google Pay Setup** (Optional):
   - Get Google Pay Merchant ID from Google Pay Console
   - Update `EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID`

4. **URL Scheme**:
   - Update `EXPO_PUBLIC_URL_SCHEME` to match your app's scheme
   - Update `scheme` in `apps/mobile/app.json` accordingly

### Database Setup
PostgreSQL runs on port 5492 via Docker Compose (compose.yml). Connection string uses database name "silver-spoon".

## Architecture Overview

### Monorepo Structure
- **apps/backend**: Express.js API server with Prisma ORM
- **apps/mobile**: Expo React Native mobile application
- **packages/types**: Shared TypeScript type definitions

### Technology Stack

#### Backend (Express.js)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk JWT verification middleware
- **Payment Processing**: Stripe with webhook handling
- **Security**: Helmet, CORS, input validation with Zod
- **API Structure**: RESTful endpoints with controller/route separation

#### Mobile (Expo)
- **Framework**: Expo with React Native
- **Authentication**: Clerk OAuth integration with AsyncStorage persistence
- **Navigation**: React Navigation with drawer + stack patterns
- **State Management**: React Context API for authentication state
- **UI**: Glassmorphic design with Reanimated animations and haptic feedback
- **Storage**: AsyncStorage for token persistence

### Key Architecture Patterns

#### Authentication Flow
1. Clerk handles OAuth/email authentication in mobile app
2. JWT tokens stored in AsyncStorage with automatic refresh
3. Backend verifies Clerk JWT tokens via middleware
4. User profiles synced between Clerk and local PostgreSQL database
5. AuthContext manages authentication state across React components

#### Database Schema (Prisma)
- **Users**: Core user profiles with subscription status (FREE/BASIC/PRO/ENTERPRISE)
- **Subscriptions**: Stripe subscription data linked to users
- **PromoCodes**: Discount codes with usage tracking and expiration
- **PromoCodeRedemptions**: Many-to-many relationship tracking code usage
- **Checklists**: User-owned checklists with slug-based routing and API/local storage modes
- **ChecklistItems**: Individual checklist items with completion status

#### API Endpoints
- **Authentication**: `/auth/sync` - User profile synchronization
- **Subscriptions**: `/subscriptions/*` - Stripe product, checkout, status endpoints
- **Checklists**: `/api/checklists/*` - Full CRUD operations for checklists and items
- **Webhooks**: `/webhooks/stripe` - Stripe event processing

#### Mobile App Structure
- **Navigation**: Drawer navigation with authenticated/unauthenticated route guards
- **Components**: Reusable UI components (Button, Card, BottomSheetWrapper) with glassmorphic styling, comprehensive Checklist components
- **Screens**: Login/SignUp, Home dashboard, Settings (bottom sheet), Subscription management, Checklist management
- **Services**: API service layer with request/response handling, error management, and checklist synchronization

### Environment Configuration

#### Backend (.env)
- `DATABASE_URL`: PostgreSQL connection (default port 5492 for local Docker)
- `CLERK_JWT_KEY`: Clerk JWT verification key
- `STRIPE_SECRET_KEY`: Stripe API secret
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification
- `FRONTEND_URL`: CORS origin configuration
- `OPENAI_API_KEY`: OpenAI API key for reasoning and content generation
- `EXA_API_KEY`: Exa.ai API key for personalized web search capabilities
- `PORT`: Server port (default 3001)

#### Mobile (.env)
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key for mobile
- `EXPO_PUBLIC_API_URL`: Backend API base URL

### Development Workflow
1. Start PostgreSQL: `npm run docker:up`
2. Set up database: `cd apps/backend && npm run db:generate && npm run db:push`
3. Start development servers: `npm run dev` (runs all apps in parallel)
4. Mobile development: Use Expo CLI for device testing and debugging

### New Features Summary
- **Checklist System**: Full-featured checklist management with local and API storage modes
- **Database Schema**: Extended with Checklist and ChecklistItem models supporting user-owned checklists
- **API Endpoints**: Complete CRUD operations for checklists (`/api/checklists/*`)
- **Mobile Components**: Rich set of checklist UI components with search, sorting, density options, and inline editing
- **URL Scheme**: Updated to "silverspoonapp" in app.json

### React Version Configuration
The mobile app uses React 19.1.1 with Expo's experimental React 19 canary support enabled in app.json (`"experiments": {"reactCanary": true}`). All React dependencies are aligned using npm overrides and resolutions to prevent version conflicts between Clerk, React Navigation, and other dependencies.