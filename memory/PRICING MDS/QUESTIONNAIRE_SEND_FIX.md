# Questionnaire Send Email Bug Fix

## Issue
Questionnaires were failing to send to customers via email. Users would click the "Send" button, enter an email address, but the email would never be sent.

## Root Cause
**JavaScript Reference Error** in `/app/frontend/src/pages/Questionnaires.js`

The `handleSendEmail` function (line 255-269) was using an undefined variable `api`:

```javascript
// ❌ BROKEN CODE
await api.post(`/questionnaires/${sendDialog.id}/send-email`, {
  email: sendEmail,
  public_url: window.location.origin,
});
```

The `api` variable was never imported or defined in the file. This would cause a JavaScript error when the user tried to send a questionnaire, preventing the API request from being made.

## The Fix

Changed the function to use `axios` directly (which is imported at the top of the file) with the full API URL and proper authorization headers:

```javascript
// ✅ FIXED CODE
await axios.post(`${API_URL}/api/questionnaires/${sendDialog.id}/send-email`, {
  email: sendEmail,
  public_url: window.location.origin,
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

This matches the pattern used by all other API calls in the same file (fetchQuestionnaires, createFromTemplate, updateQuestionnaire, etc.).

## Changes Made

### File: `/app/frontend/src/pages/Questionnaires.js`
**Lines 255-269** - Updated `handleSendEmail` function:
- Changed `api.post` to `axios.post`
- Added full API URL: `${API_URL}/api/questionnaires/${sendDialog.id}/send-email`
- Added authentication headers: `{ headers: { Authorization: \`Bearer ${token}\` } }`

## Testing

### Before Fix:
- Click Send button on a questionnaire
- Enter customer email
- Click "Send Questionnaire"
- **Result:** Silent failure (JavaScript error in console, no email sent)

### After Fix:
- Click Send button on a questionnaire
- Enter customer email
- Click "Send Questionnaire"
- **Result:** ✅ Email successfully sent, green toast notification appears

### Code Quality:
```
✅ JavaScript linting passed
✅ No syntax errors
✅ Consistent with rest of codebase
✅ Hot reload applied automatically
```

## Backend Email Endpoint (Already Working)

The backend endpoint at `/app/backend/routes/questionnaires.py` was already correctly implemented:

**POST `/api/questionnaires/{questionnaire_id}/send-email`**
- Accepts: `{ email, customer_name, public_url, message }`
- Validates questionnaire is active
- Builds professional HTML email with link
- Uses SendGrid email service
- Returns success/error response

The backend was never the issue - it was the frontend not properly calling it.

## Email Requirements

For emails to actually deliver, the tenant must have:
1. **SendGrid API key** configured in their settings
2. **Sender email verified** with SendGrid
3. **Recipient email valid** and accepting emails

If SendGrid is not configured, the API will return:
```json
{
  "detail": "Failed to send email. Check that SendGrid is configured."
}
```

## User Impact

**Before:** Questionnaires could not be sent to customers at all. Feature was completely broken.

**After:** Questionnaires send successfully. Customers receive professional email with link to complete the form.

## Related Files
- `/app/frontend/src/pages/Questionnaires.js` (Fixed)
- `/app/backend/routes/questionnaires.py` (No changes needed)
- `/app/backend/services/email_service.py` (No changes needed)

## Additional Notes

This was a simple but critical bug that completely blocked a key feature. The fix was straightforward once identified:
- Missing variable definition
- Should have used existing `axios` instance
- Should have followed the pattern used elsewhere in the file

The hot reload system automatically applied the fix, so no restart was needed.
