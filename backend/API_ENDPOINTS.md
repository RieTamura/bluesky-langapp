# Bluesky LangApp API Endpoints

## Authentication Endpoints

### POST /api/auth/login
Login with Bluesky credentials.

**Request Body:**
```json
{
  "identifier": "your.bsky.social",
  "password": "your-app-password"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "sessionId": "session_1234567890_abcdef123",
  "user": {
    "identifier": "your.bsky.social"
  }
}
```

**Response (Error):**
```json
{
  "error": "Authentication failed",
  "message": "Invalid credentials"
}
```

### POST /api/auth/logout
Logout and clear session.

**Headers:**
```
Authorization: Bearer session_1234567890_abcdef123
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Get current user authentication status.

**Headers:**
```
Authorization: Bearer session_1234567890_abcdef123
```

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "message": "User is authenticated"
}
```

**Response (Not Authenticated):**
```json
{
  "error": "Not authenticated",
  "message": "Valid session required"
}
```

## Posts Endpoints

### GET /api/posts
Get user's Bluesky posts with extracted words for language learning.

**Headers:**
```
Authorization: Bearer session_1234567890_abcdef123
```

**Query Parameters:**
- `identifier` (required): Bluesky user identifier (e.g., "user.bsky.social")
- `limit` (optional): Number of posts to fetch (default: 10, max: 100)

**Example Request:**
```
GET /api/posts?identifier=user.bsky.social&limit=5
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "at://did:plc:example/app.bsky.feed.post/3k2k3j2k3j2k3j",
      "text": "Hello world! This is my first post on Bluesky.",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "author": {
        "did": "did:plc:example",
        "handle": "user.bsky.social",
        "displayName": "User Name"
      },
      "extractedWords": ["hello", "world", "first", "post", "bluesky"]
    }
  ],
  "meta": {
    "count": 1,
    "limit": 5,
    "identifier": "user.bsky.social"
  }
}
```

### GET /api/posts/following
Get posts from the user's following timeline (home feed).

**Headers:**
```
Authorization: Bearer session_1234567890_abcdef123
```

**Query Parameters:**
- `limit` (optional): Number of posts to fetch (default: 10, max: 100)

**Example Request:**
```
GET /api/posts/following?limit=5
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "at://did:plc:example/app.bsky.feed.post/3k2k3j2k3j2k3j",
      "text": "Hello from someone you follow!",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "author": {
        "did": "did:plc:example2",
        "handle": "friend.bsky.social",
        "displayName": "Friend Name"
      },
      "extractedWords": ["hello", "someone", "follow"]
    }
  ],
  "meta": {
    "count": 1,
    "limit": 5,
    "feedType": "following"
  }
}
```

### GET /api/posts/:id
Get a specific post by ID (Not yet implemented).

**Headers:**
```
Authorization: Bearer session_1234567890_abcdef123
```

**Response:**
```json
{
  "error": "Not implemented",
  "message": "Individual post fetching not yet implemented",
  "postId": "3k2k3j2k3j2k3j"
}
```

## Health Check

### GET /health
Check if the API server is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Responses

All endpoints may return these common error responses:

**400 Bad Request:**
```json
{
  "error": "Bad Request",
  "message": "Specific error message"
}
```

**401 Unauthorized:**
```json
{
  "error": "Not authenticated",
  "message": "Please login first"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

## Usage Example

1. **Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "your.bsky.social", "password": "your-app-password"}'
```

2. **Get Posts:**
```bash
curl -X GET "http://localhost:3000/api/posts?identifier=your.bsky.social&limit=5" \
  -H "Authorization: Bearer your-session-id"
```

3. **Logout:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer your-session-id"
```