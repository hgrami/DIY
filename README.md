# Fullstack TypeScript Monorepo

A production-grade fullstack application built with Expo, Clerk, Stripe, PostgreSQL, and Express.js using a Turbo monorepo structure.

## 🚀 Features

### Frontend (Expo)
- **Authentication**: Clerk integration with Google OAuth and email/password
- **UI/UX**: Glassmorphic design with smooth animations and haptics
- **Navigation**: Drawer navigation with bottom sheet settings
- **State Management**: React Context API for auth state
- **Components**: Reusable UI components with TypeScript

### Backend (Express.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk middleware for token verification
- **Subscriptions**: Stripe integration with promo codes
- **API**: RESTful endpoints with TypeScript
- **Webhooks**: Stripe webhook handling

## 📁 Project Structure

```
fullstack-app/
├── apps/
│   ├── mobile/          # Expo React Native app
│   └── backend/         # Express.js API server
├── packages/
│   ├── types/           # Shared TypeScript types
│   └── ui/              # Shared UI components (future)
└── turbo.json           # Turbo configuration
```

## 🛠️ Tech Stack

### Frontend
- **Expo** - React Native development platform
- **Clerk** - Authentication service
- **Stripe** - Payment processing
- **React Navigation** - Navigation library
- **Reanimated** - Animation library
- **Gesture Handler** - Touch handling

### Backend
- **Express.js** - Web framework
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Stripe** - Payment processing
- **Clerk** - Authentication verification

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Expo CLI
- Turbo CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fullstack-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Backend (`.env`):
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   # Edit with your actual values
   ```

   Mobile (`.env`):
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   # Edit with your actual values
   ```

4. **Set up the database**
   ```bash
   cd apps/backend
   npx prisma generate
   npx prisma db push
   ```

5. **Start development servers**
   ```bash
   # From root directory
   npm run dev
   ```

## 🔧 Development

### Available Scripts

```bash
# Root level
npm run dev          # Start all apps in development
npm run build        # Build all apps
npm run lint         # Lint all apps
npm run type-check   # Type check all apps

# Backend
cd apps/backend
npm run dev          # Start backend server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio

# Mobile
cd apps/mobile
npm start            # Start Expo development server
npm run android      # Run on Android
npm run ios          # Run on iOS
```

### Environment Variables

#### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `CLERK_JWT_KEY`: Clerk JWT verification key
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `FRONTEND_URL`: Frontend URL for CORS
- `PORT`: Server port (default: 3001)

#### Mobile
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `EXPO_PUBLIC_API_URL`: Backend API URL

## 📱 Mobile App Features

### Authentication Flow
1. User signs in/up with Clerk
2. Clerk token is stored in AsyncStorage
3. Token is sent to backend for user sync
4. User profile is stored in local database
5. App shows authenticated or unauthenticated routes

### UI Components
- **Button**: Glassmorphic button with haptics
- **Card**: Glassmorphic card component
- **BottomSheetWrapper**: Reusable bottom sheet
- **Navigation**: Drawer + stack navigation

### Screens
- **Login/SignUp**: Clerk authentication
- **Home**: Dashboard with user info
- **Settings**: Bottom sheet with user preferences
- **Subscription**: Stripe subscription management

## 🔌 Backend API

### Authentication
- `GET /auth/sync` - Sync user with database

### Subscriptions
- `GET /subscriptions/products` - Get Stripe products
- `POST /subscriptions/create` - Create checkout session
- `GET /subscriptions/status` - Get user subscription
- `POST /subscriptions/validate-promo` - Validate promo code

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook handler

## 🗄️ Database Schema

### Models
- **User**: User profiles with subscription status
- **Subscription**: Stripe subscription data
- **PromoCode**: Promotional codes with usage tracking
- **PromoCodeRedemption**: Redemption tracking

## 🔐 Security

- JWT token verification with Clerk
- CORS configuration
- Helmet security headers
- Input validation with Zod
- Secure token storage with AsyncStorage

## 🎨 UI/UX Features

- Glassmorphic design with transparency
- Smooth animations with Reanimated
- Haptic feedback on interactions
- Dark mode support
- Responsive design
- Loading states and error handling

## 🚀 Deployment

### Backend
1. Set up PostgreSQL database
2. Configure environment variables
3. Run Prisma migrations
4. Deploy to your preferred platform

### Mobile
1. Configure Expo build settings
2. Set up environment variables
3. Build with EAS or Expo CLI
4. Deploy to app stores

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the repository or contact the development team.