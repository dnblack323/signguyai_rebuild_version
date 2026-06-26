# Community, AI Suite, and Shared Systems Transfer Notes

## Source reviewed

- Original repo `frontend/src/pages/CommunityHub.js`
- Original repo `frontend/src/pages/AITools.js`
- Original repo `AI_FEATURE_INVENTORY.csv`
- Original repo `BUBBLE_AI_TOOLS_CONFIG.md`
- Original repo `frontend/src/components/orders/SharedContextPanel.js`

## Implemented in rebuild

### Help -> Community

Added a rebuild-native Community Hub with:

- Community message list
- Bug reports
- Feature requests
- Questions
- Feedback
- Search and filters
- Upvotes
- Replies
- Official-answer support
- Local preview fallback if Mongo/API is unavailable

Backend routes:

- `GET /api/community/posts`
- `POST /api/community/posts`
- `PUT /api/community/posts/{post_id}`
- `POST /api/community/posts/{post_id}/reply`
- `POST /api/community/posts/{post_id}/upvote`
- `GET /api/community/stats`

### Team -> Notes

Added shared notes with:

- Internal notes
- Scope filtering
- Status open/closed
- Priority
- Tags
- Local preview fallback
- Shared order context pattern from the original app:
  - order/project title
  - due date
  - production notes
  - color/brand notes
  - install/location notes
  - design notes

Backend routes:

- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/{note_id}`

### Tools -> AI Suite / Assistant

Added a rebuild-native AI Suite page using the original AI feature inventory as the source. It includes:

- Tool catalog
- Categories
- Compute-intensity labels
- Assistant-only view
- AI preview workbench
- Response persistence route
- Local preview fallback if backend is unavailable

Backend routes:

- `GET /api/ai/tools`
- `POST /api/ai/generate`

## Not fully connected yet

These are intentionally noted for later confirmation instead of guessing:

- Production OpenAI/Emergent provider wiring.
- AI credit/cost tracking.
- Real image generation endpoints for high-compute visual tools.
- User identity/role enforcement for official community replies, pinning, and status changes.
- Deep linking notes to real quote/order/invoice records once those modules have concrete data models.
- Whether Community should remain under Help only, or also appear as a notification/support drawer.
