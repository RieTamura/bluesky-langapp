# Data Management System

This document describes the data management system for Bluesky LangApp, including JSON-based storage, Git version control, and export functionality.

## Overview

The data management system provides:

1. **JSON-based Data Storage**: File-based storage with automatic backups
2. **Git Version Control**: Track changes to learning data over time
3. **Export Functionality**: Multiple export formats for external integrations
4. **Backup System**: Automated and manual backup capabilities

## Architecture

### Data Storage Structure

```
project-root/
├── app-data.json          # Main application data
├── data-backups/          # Automatic backups
├── data-git/              # Git repository for version control
│   ├── users/             # User data files
│   ├── words/             # Word data organized by user
│   ├── backups/           # Git-tracked backups
│   └── .git/              # Git repository
└── exports/               # Export files for external tools
```

### Data Models

#### AppData Structure
```json
{
  "users": [
    {
      "id": "user_123",
      "blueskyId": "user.bsky.social",
      "displayName": "User Name",
      "avatarUrl": "https://...",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "words": [
    {
      "id": "word_456",
      "word": "example",
      "status": "learning",
      "userId": "user_123",
      "date": "2025-01-01T00:00:00.000Z",
      "definition": "A representative form or pattern",
      "exampleSentence": "This is an example sentence",
      "reviewCount": 3,
      "correctCount": 2,
      "lastReviewedAt": "2025-01-01T12:00:00.000Z",
      "difficultyLevel": 2
    }
  ],
  "version": "1.0.0",
  "lastBackup": "2025-01-01T00:00:00.000Z"
}
```

## API Endpoints

### Data Management
- `POST /api/data/initialize` - Initialize data system
- `GET /api/data/stats` - Get data statistics
- `POST /api/data/backup` - Create manual backup
- `GET /api/data/backups` - List available backups

### User Management
- `GET /api/data/users` - Get all users
- `GET /api/data/users/:userId` - Get specific user
- `POST /api/data/users` - Create user
- `PUT /api/data/users/:userId` - Update user

### Word Management
- `GET /api/data/words` - Get all words (optional ?userId filter)
- `GET /api/data/words/:wordId` - Get specific word
- `POST /api/data/words` - Create word
- `PUT /api/data/words/:wordId` - Update word
- `DELETE /api/data/words/:wordId` - Delete word

### Git Integration
- `POST /api/data/git/init` - Initialize Git repository
- `POST /api/data/git/export` - Export data to Git
- `GET /api/data/git/status` - Get Git repository status

### Export Functionality
- `POST /api/data/export/tangled/:userId` - Create Tangled export
- `POST /api/data/export/csv` - Create CSV export
- `GET /api/data/exports` - List available exports
- `GET /api/data/exports/:fileName` - Download export file

## CLI Usage

The data management system includes a CLI tool for common operations:

```bash
# Initialize data system
npm run data:init

# Initialize Git repository
npm run data:git-init

# Export data to Git
npm run data:export

# Show statistics
npm run data:stats

# Create backup
npm run data:backup

# Advanced usage with the CLI script
node scripts/data-manager.js tangled-export user123
node scripts/data-manager.js csv-export user123
node scripts/data-manager.js git-status
```

## Git Version Control

### Repository Structure

The Git repository (`data-git/`) organizes data as follows:

```
data-git/
├── users/
│   ├── user123.json       # Individual user data
│   └── user456.json
├── words/
│   ├── user123/
│   │   ├── unknown.json   # Words by status
│   │   ├── learning.json
│   │   ├── known.json
│   │   └── summary.json   # User learning summary
│   └── user456/
│       └── ...
├── backups/
│   ├── backup_2025-01-01T00-00-00-000Z.json
│   └── ...
└── README.md
```

### Commit Strategy

- **Automatic commits**: Created when exporting data via API
- **Manual commits**: Can include custom commit messages
- **Commit messages**: Include timestamp and user context

Example commit messages:
- `Update data for user user123 - 2025-01-01T12:00:00.000Z`
- `Learning progress milestone: 100 words learned`
- `Manual export: Weekly backup`

## Export Formats

### 1. Tangled Format

Compatible with Tangled language learning platform:

```json
{
  "format": "tangled-v1",
  "metadata": {
    "exportedAt": "2025-01-01T00:00:00.000Z",
    "source": "bluesky-langapp",
    "version": "1.0.0",
    "userId": "user123",
    "userName": "User Name"
  },
  "vocabulary": [
    {
      "word": "example",
      "status": "learning",
      "addedAt": "2025-01-01T00:00:00.000Z",
      "reviewCount": 3,
      "correctCount": 2,
      "definition": "A representative form",
      "difficulty": 2,
      "tags": ["bluesky", "imported"]
    }
  ],
  "progress": {
    "totalWords": 100,
    "masteredWords": 30,
    "learningWords": 50,
    "newWords": 20
  }
}
```

### 2. CSV Format

For spreadsheet applications:

```csv
Word,Status,User ID,Date Added,Definition,Example Sentence,Review Count,Correct Count,Last Reviewed,Difficulty Level
"example","learning","user123","2025-01-01T00:00:00.000Z","A representative form","This is an example",3,2,"2025-01-01T12:00:00.000Z",2
```

### 3. Standard JSON

Native application format with full data structure.

## Backup System

### Automatic Backups

- Created during data exports
- Stored in `data-backups/` directory
- Include timestamp in filename
- Contain complete application state

### Manual Backups

- Triggered via API or CLI
- Include metadata about backup creation
- Can be restored via API

### Backup Retention

- Automatic cleanup of old backups (configurable)
- Keep daily backups for 30 days
- Keep weekly backups for 6 months
- Keep monthly backups for 2 years

## Data Migration

### From Existing words.json

The system automatically migrates existing `words.json` files:

1. Reads existing word data
2. Adds missing IDs and user associations
3. Preserves all existing data
4. Creates backup of original file

### Version Compatibility

- Data format versioning ensures compatibility
- Migration scripts handle format updates
- Backward compatibility maintained

## Security Considerations

### Data Protection

- Local file-based storage (no external dependencies)
- Git repository for version control and backup
- No sensitive data stored in plain text
- User data anonymization options

### Access Control

- API endpoints require proper authentication (when implemented)
- File system permissions protect data files
- Git repository access controls

## Performance

### Optimization Strategies

- Lazy loading of large datasets
- Efficient JSON parsing and serialization
- Indexed data structures for fast lookups
- Batch operations for bulk updates

### Scalability

- File-based storage suitable for individual users
- Git repository handles large datasets efficiently
- Export functionality supports data portability

## Troubleshooting

### Common Issues

1. **Git repository not initialized**
   - Run `npm run data:git-init`
   - Check file permissions

2. **Export failures**
   - Verify data integrity with `npm run data:stats`
   - Check available disk space

3. **Backup restoration issues**
   - Verify backup file integrity
   - Check file permissions

### Logging

- All operations logged to console
- Error details included in API responses
- Git operations logged with full output

## Future Enhancements

### Planned Features

1. **Automatic sync with external services**
2. **Real-time collaboration features**
3. **Advanced analytics and reporting**
4. **Cloud storage integration**
5. **Mobile app data synchronization**

### Integration Opportunities

- **Anki**: Export to Anki deck format
- **Quizlet**: Compatible export format
- **Google Sheets**: Direct integration
- **Notion**: Database integration