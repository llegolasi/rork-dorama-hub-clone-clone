# Personal Info Setup Guide

This guide explains how to set up the personal information feature (gender and birth date) in your Dorama Hub application.

## Overview

The personal info feature adds a new step to the onboarding process where users can:
- Select their gender (Male, Female, Non-binary, or Prefer not to say)
- Choose their birth date using a date picker
- Have their age automatically calculated and validated

## Database Changes

### 1. Run the SQL Migration

Execute the SQL script in your Supabase SQL editor:

```sql
-- File: database/personal-info-schema.sql
```

This will:
- Add `gender`, `birth_date`, and `age` columns to the `users` table
- Create indexes for performance
- Add a trigger to automatically calculate age from birth date
- Update the `handle_new_user` function to handle personal info
- Update the user profiles view

### 2. Database Schema Changes

The following columns are added to the `public.users` table:

- `gender` (VARCHAR(20)): Stores user's gender with constraint validation
- `birth_date` (DATE): Stores user's birth date
- `age` (INTEGER): Automatically calculated from birth_date

## Application Changes

### 1. New Onboarding Step

A new step `PERSONAL_INFO` has been added between `CREDENTIALS` and `PROFILE`:

1. **Login** → 2. **Credentials** → 3. **Personal Info** → 4. **Profile** → 5. **Preferences**

### 2. Components Added

- `components/onboarding/PersonalInfoStep.tsx`: New component for gender and birth date selection
- Updated `constants/onboarding.ts` with gender options and new step

### 3. Type Updates

- Updated `OnboardingData` interface in `types/user.ts` to include:
  - `gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say'`
  - `birthDate?: string`
  - `age?: number`

### 4. Dependencies

Added `@react-native-community/datetimepicker` for date selection functionality.

## Features

### Gender Selection
- 4 options with emoji icons: Male 👨, Female 👩, Non-binary 🧑, Prefer not to say 🤐
- Grid layout with visual selection feedback
- Required field validation

### Birth Date Selection
- Native date picker for each platform
- Age validation (minimum 13 years, maximum 120 years)
- Automatic age calculation and display
- Date formatting in Brazilian Portuguese (DD/MM/YYYY)

### Data Handling
- Personal info is stored in onboarding data during the flow
- Saved to database when onboarding is completed
- Age is automatically calculated and kept in sync with birth_date via database trigger

## Privacy & Security

- Personal information is marked as private and secure in the UI
- Data is stored securely in the database with proper RLS policies
- Users can choose "Prefer not to say" for gender
- Birth date is optional (though the UI currently requires it)

## Platform Compatibility

- **iOS**: Spinner-style date picker
- **Android**: Default system date picker
- **Web**: Browser-native date input (fallback)

## Validation Rules

1. **Age Validation**:
   - Minimum age: 13 years
   - Maximum age: 120 years
   - Calculated from birth date

2. **Gender Validation**:
   - Must select one of the 4 provided options
   - Stored as enum in database for data integrity

3. **Required Fields**:
   - Both gender and birth date are currently required
   - Can be made optional by modifying the `canProceed()` function

## Testing

### Development Mode
- Works without Supabase configuration
- Personal info is stored in AsyncStorage during onboarding
- Mock data can be used for testing

### Production Mode
- Requires Supabase database with the migration applied
- Personal info is saved to the `users` table
- Age is automatically calculated via database trigger

## Customization

### Making Fields Optional
To make gender or birth date optional, modify the `canProceed()` function in `PersonalInfoStep.tsx`:

```typescript
const canProceed = (): boolean => {
  // Make both optional
  return true;
  
  // Make only gender required
  return selectedGender !== null;
  
  // Make only birth date required
  return birthDate !== null;
};
```

### Adding More Gender Options
Add new options to `GENDER_OPTIONS` in `constants/onboarding.ts` and update the database constraint:

```sql
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_gender_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_gender_check 
CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say', 'other'));
```

### Changing Age Limits
Modify the age validation in `PersonalInfoStep.tsx`:

```typescript
if (age < 16) { // Change minimum age
  Alert.alert('Idade mínima', 'Você deve ter pelo menos 16 anos...');
  return;
}
```

## Troubleshooting

### Date Picker Not Showing
- Ensure `@react-native-community/datetimepicker` is properly installed
- Check platform-specific implementations
- Verify import statements

### Database Errors
- Ensure the migration SQL has been run
- Check that the `users` table has the new columns
- Verify RLS policies allow updates to the new fields

### Age Calculation Issues
- Check that the database trigger is created
- Verify the `calculate_age_from_birth_date()` function exists
- Ensure birth_date is in correct DATE format

## Future Enhancements

Potential improvements for the personal info feature:

1. **Additional Demographics**: Location, occupation, interests
2. **Privacy Controls**: Allow users to hide personal info from profile
3. **Age-based Features**: Content filtering, recommendations
4. **Analytics**: Demographic insights for app improvement
5. **Localization**: Support for different date formats and languages

## Support

If you encounter issues with the personal info feature:

1. Check the database migration was applied correctly
2. Verify all dependencies are installed
3. Review the console logs for error messages
4. Ensure proper TypeScript types are imported
5. Test in both development and production modes