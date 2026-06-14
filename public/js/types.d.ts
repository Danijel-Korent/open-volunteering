/**
 * REST API and UI domain types shared by plain JS modules under `checkJs`.
 */

/** User returned by GET /api/users and /api/users/{id}. */
interface User {
  id: number;
  name: string;
  bio?: string;
}

/** Volunteering position from GET/POST /api/positions. */
interface Position {
  id: number;
  authorId: number;
  title: string;
  description: string;
  createdAt: string;
}

/** Comment from GET/POST /api/positions/{id}/comments. */
interface Comment {
  id: number;
  positionId: number;
  authorId: number;
  content: string;
  createdAt: string;
}

/** Comment with resolved author for feed rendering. */
interface CommentWithAuthor extends Comment {
  author: { name: string };
}
