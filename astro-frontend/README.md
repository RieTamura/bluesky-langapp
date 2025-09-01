# Bluesky LangApp - Astro Frontend

This is the Astro-based frontend for the Bluesky Language Learning Application.

## Features

- **Astro Framework**: Fast static site generation with island architecture
- **React Islands**: Interactive components where needed
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development
- **Nanostores**: Lightweight state management

## Architecture

### Island Architecture
- Static pages are rendered by Astro for optimal performance
- Interactive components use React islands with `client:load` directive
- State management via Nanostores for cross-island communication

### Key Components

#### Pages
- `/` - Login page
- `/dashboard` - Main dashboard
- `/posts` - Posts with word highlighting
- `/words` - Word management (to be implemented)
- `/learning` - Quiz functionality (to be implemented)
- `/progress` - Learning progress (to be implemented)

#### React Islands
- `LoginForm` - Authentication form
- `PostsContainer` - Posts management with feed switching
- `WordHighlighter` - Interactive word highlighting

#### Stores
- `authStore` - Authentication state
- `postsStore` - Posts and feed management
- `wordsStore` - Word management state
- `learningStore` - Quiz and learning state

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

The frontend communicates with the Express.js backend via `/api` endpoints:
- Authentication: `/api/auth/*`
- Posts: `/api/posts/*`
- Words: `/api/words/*`
- Learning: `/api/learning/*`

## Next Steps

1. Complete word management React islands
2. Implement quiz functionality
3. Add progress visualization
4. Enhance responsive design
5. Add error boundaries and loading states