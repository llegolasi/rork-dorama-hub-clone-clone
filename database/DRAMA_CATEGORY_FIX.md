# Drama Category Field Fix

## Problem
The `drama_category` field in the `user_drama_lists` table was not being populated when dramas were added to user lists. This field is important for statistics and filtering functionality.

## Solution
Updated the application code to automatically fetch and store drama categories when dramas are added to lists.

### Changes Made

1. **Updated `useUserStore.ts`**:
   - Modified `addToList` function to fetch drama details from TMDB and extract the primary genre
   - Updated `updateProgress` function to backfill missing categories when dramas are completed
   - Categories are now automatically populated for both new and existing dramas

2. **Created Backfill System**:
   - Added tRPC procedures to backfill categories for existing records
   - Created SQL script for manual backfill if needed
   - Added statistics endpoint to monitor backfill progress

### How Categories Are Determined
- Primary genre from TMDB API is used as the drama category
- For dramas with multiple genres, the first genre is selected
- Categories are fetched automatically when:
  - Adding a drama to any list
  - Updating episode progress
  - Completing a drama

### Backfill Process

#### Automatic Backfill
The application will automatically fetch and store categories when users interact with their dramas:
- When adding dramas to lists
- When updating episode progress
- When completing dramas

#### Manual Backfill (if needed)
You can use the tRPC endpoints to backfill categories for existing records:

```typescript
// Get statistics about missing categories
const stats = await trpc.dramas.getCategoryStats.query();

// Backfill categories for up to 50 dramas
const result = await trpc.dramas.backfillCategories.mutate({ limit: 50 });
```

#### SQL Backfill (last resort)
If needed, you can run the SQL script:
```sql
-- Run the backfill script
\\i database/backfill-drama-categories.sql
```

### Monitoring Progress
Use the category stats endpoint to monitor how many records have categories:

```typescript
const stats = await trpc.dramas.getCategoryStats.query();
console.log(`${stats.completionPercentage}% of records have categories`);
console.log(`${stats.recordsMissingCategory} records still need categories`);
```

### Category Examples
Common K-drama categories include:
- Drama
- Romance
- Comedy
- Thriller
- Action & Adventure
- Crime
- Mystery
- Family
- War & Politics

### Notes
- Categories are stored in the original language from TMDB (usually English)
- The system is designed to be resilient - if TMDB API fails, the drama is still added to the list without a category
- Categories can be updated later through normal user interactions
- The backfill process includes rate limiting to avoid overwhelming the TMDB API