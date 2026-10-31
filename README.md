# Campus Help Desk

A Next.js App Router application using PostgreSQL as the permanent database and Redis for caching and page-view counting.

## Required features

- Post a request with student name and message.
- Validate required fields and maximum lengths.
- Store requests in PostgreSQL using parameterized SQL.
- Display the latest 10 requests, newest first.
- Cache the latest-request list in Redis using `help:latest` for 60 seconds.
- Display whether the latest list came from Redis or PostgreSQL.
- Invalidate `help:latest` after a successful post.
- Increment `help:views` with Redis `INCR` when the board page loads.
- Fall back to PostgreSQL if Redis is unavailable.

## Setup

1. Keep PostgreSQL running on Windows and Redis running in the Ubuntu VM.
2. Ensure the PostgreSQL database `campus_helpdesk` exists.
3. Run `database/schema.sql` in that database if the `help_requests` table does not already exist.
4. Copy `.env.local.example` to `.env.local` and fill in your actual PostgreSQL and Redis credentials. Keep `.env.local` private.
5. Install dependencies from the project root:

   ```bash
   npm install pg redis
   npm install --save-dev @types/pg
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open http://localhost:3000.

## API endpoints

### `POST /api/requests`

JSON body:

```json
{
  "student_name": "Abhi",
  "message": "How do I reset my campus Wi-Fi password?"
}
```

Success: HTTP 201 with `{ "success": true, "id": 1 }`.

Invalid empty fields: HTTP 400 with `{ "success": false, "error": "student_name and message are required" }`.

### `GET /api/requests`

- Cache hit: `{ "success": true, "source": "Redis", "requests": [...] }`
- Cache miss: queries PostgreSQL, caches the result for 60 seconds, and returns `"source": "PostgreSQL"`.

### `GET /api/views`

Increments `help:views` with Redis `INCR` and returns the updated count.

## Required demonstration

1. Open the board. The list source should initially show PostgreSQL if the cache is empty.
2. Refresh the list within 60 seconds. It should show Redis.
3. Post a new request. The `help:latest` cache is deleted.
4. Refresh the list. It should show PostgreSQL, then Redis on the next request within 60 seconds.
5. Reload the board and verify the view count increases.
6. Try submitting empty fields and verify validation.
7. Stop Redis temporarily and verify the latest-request list still loads from PostgreSQL.

## GitHub safety

- Never commit `.env.local`, passwords, or database credentials.
- Commit the source code, `database/schema.sql`, and this README.
- Do not upload `node_modules` or `.next`.
