# MongoDB Migration and Multi-User Support Summary

## Changes

1. **MongoDB Connection Settings**
- Created `server/src/config/database.ts` file
- Database connection setup using mongoose

2. **Model Definitions**
- `server/src/models/User.ts` - User model
- `server/src/models/Paper.ts` - Document model
- `server/src/models/Chat.ts` - Chat model

3. **Repository Class Updates**
- `PaperRepository`: Changed from file-based to MongoDB-based storage
- `ChatRepository`: Changed from file-based to MongoDB-based storage
- All methods updated to accept userId and paperId

4. **Service Class Updates**
- `PaperService`: Added multi-user support methods
- `ChatService`: Added multi-user support methods
- `UserService`: Added new

5. **Controller Class Updates**
- `PaperController`: Added multi-user support methods
- `ChatController`: Added multi-user support methods
- `UserController`: Added new

6. **Route Updates**
- `papers.ts`: Added user ID parameter to path
- `chat.ts`: Added document ID and user ID parameters to path
- `users.ts`: Added new

7. **Main Application File Updates**
- Added MongoDB connection setup
- Registered user routes

## Data Structure Changes

### Document Model
```typescript
{
  userId: ObjectId,         // Document owner ID
  title: String,            // Document title
  content: Paper,           // Document content (keeping original JSON structure)
  collaborators: [ObjectId] // Array of collaborator IDs
}
```

### Chat Model
```typescript
{
  userId: ObjectId,       // User ID
  paperId: ObjectId,      // Document ID
  messages: [            // Array of messages
    {
      id: String,         // Message ID
      role: String,       // Role (user/system/assistant)
      content: String,    // Message content
      timestamp: Number,  // Timestamp
      blockId: String     // Connected block ID
    }
  ]
}
```

### User Model
```typescript
{
  username: String,       // User name (unique)
  email: String,          // Email (optional)
}
```

## Migration Method

1. **Environment Setup**
- Install MongoDB or create an Atlas account
- Add MongoDB connection string to `.env` file:
  ```
  MONGODB_URI=mongodb://localhost:27017/paer
  ```

2. **Initial Data Migration**
- Need to write a script to migrate data from existing JSON files to MongoDB
- Need to create initial user account

3. **API Usage Method Changes**
- Added userId parameter to all API requests
- Added paperId parameter to chat API

## Multi-User Support Features

1. **User Management**
- Create user: `POST /api/users`
- Get user: `GET /api/users/:id`
- Get user by username: `GET /api/users/username/:username`

2. **Document Management**
- User-specific document list: `GET /api/papers?userId=:userId`
- Create document: `POST /api/papers` (include userId in body)
- Add document collaborator: `POST /api/papers/:id/collaborators`

3. **Chat**
- Document-specific chat messages: `GET /api/chat/:paperId/messages?userId=:userId`
- Add chat message: `POST /api/chat/:paperId/messages` (include userId in body)

## Security Considerations

Currently, only simple user authentication is implemented, so the following security features need to be added in the future:

1. Token-based authentication (JWT)
2. Password hashing storage
3. Permission management
4. API request restrictions

## Follow-Up Tasks

1. Update client UI to support multi-user features
2. Improve user authentication
3. Implement real-time collaboration features (Socket.io/WebSocket) 