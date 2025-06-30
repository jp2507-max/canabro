# Cleanup Failed Registration Edge Function

## Purpose

This edge function securely handles cleanup of failed user registrations when the auth user was created but the profile creation failed. It provides a secure server-side way to delete auth users using the service role key, which cannot be exposed to the client.

## Security Model

- **Authentication Required**: Function requires a valid user authentication token
- **Authorization**: Users can only cleanup their own failed registrations
- **Service Role Protection**: Admin operations are performed server-side only
- **Validation**: Checks if profile exists before attempting cleanup

## Request Format

```typescript
POST /functions/v1/cleanup-failed-registration
Authorization: Bearer <user-jwt-token>
Content-Type: application/json

{
  "userId": "user-uuid-to-cleanup"
}
```

## Response Format

### Success (Profile exists, no cleanup needed)
```json
{
  "success": true,
  "message": "Profile exists, no cleanup needed"
}
```

### Success (Failed registration cleaned up)
```json
{
  "success": true,
  "message": "Failed registration cleaned up successfully"
}
```

### Error Responses
```json
{
  "error": "Missing authorization header"
}
// Status: 401

{
  "error": "Unauthorized: Can only cleanup your own registration"
}
// Status: 403

{
  "error": "Failed to cleanup registration"
}
// Status: 500
```

## Environment Variables Required

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations)
- `SUPABASE_ANON_KEY`: Anonymous key (for user verification)

## Deployment

Deploy this function using the Supabase CLI:

```bash
# Deploy the function
supabase functions deploy cleanup-failed-registration

# Set environment variables (if not already set globally)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage in Client Code

```typescript
const { data, error } = await supabase.functions.invoke('cleanup-failed-registration', {
  body: { userId: user.id }
});

if (error) {
  console.error('Cleanup failed:', error);
  return false;
}

if (data?.success) {
  console.log('Cleanup successful');
  return true;
}

return false;
```

## Error Handling

The function gracefully handles various error scenarios:
- Invalid authentication
- Missing profile (successful cleanup)
- Existing profile (no cleanup needed)  
- Database errors
- Admin API failures

## Security Considerations

- Never expose the service role key to the client
- Function validates user can only cleanup their own registration
- Only attempts deletion if profile doesn't exist
- Proper CORS handling for web applications
- Comprehensive error logging for debugging 