import { pbShared } from '@/lib/pb'

// Comments on classifications/discoveries (STS 3qi9bp). Per the accepted
// spec, comments on a `subjects` candidate live in the shared backend's
// `comments` collection, keyed by the candidate's own id (not the per-user
// `subject_classifications` row) — see
// ~/Navigation/backend/migrations/22_comments.go.
export type CommentRecordType = 'classification'

export interface Comment {
  id: string
  recordType: CommentRecordType
  recordId: string
  authorId: string
  authorName: string
  body: string
  created: string
}

interface CommentRecordShape {
  id: string
  record_type: CommentRecordType
  record_id: string
  author: string
  body: string
  created: string
  expand?: { author?: { id: string; name?: string; email?: string } }
}

function toComment(record: CommentRecordShape): Comment {
  const authorName = record.expand?.author?.name || record.expand?.author?.email || 'Unknown'
  return {
    id: record.id,
    recordType: record.record_type,
    recordId: record.record_id,
    authorId: record.author,
    authorName,
    body: record.body,
    created: record.created,
  }
}

export async function fetchComments(recordType: CommentRecordType, recordId: string): Promise<Comment[]> {
  const records = await pbShared.collection('comments').getFullList<CommentRecordShape>({
    filter: `record_type = "${recordType}" && record_id = "${recordId}"`,
    sort: '-created',
    expand: 'author',
  })
  return records.map(toComment)
}

export async function postComment(recordType: CommentRecordType, recordId: string, body: string): Promise<Comment> {
  const userId = pbShared.authStore.record?.id
  if (!userId) {
    throw new Error('must be signed in to comment')
  }
  const record = await pbShared.collection('comments').create<CommentRecordShape>({
    record_type: recordType,
    record_id: recordId,
    author: userId,
    body,
  })
  return toComment(record)
}
