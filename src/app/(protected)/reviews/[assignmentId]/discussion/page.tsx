'use client';

import { useParams } from 'next/navigation';
import { CommentDiscussion } from '@/components/reviews/CommentDiscussion';
import { EmptyState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { decodeRouteParam } from '@/lib/routeParams';

export default function DiscussionPage() {
  const assignmentId = decodeRouteParam(useParams<{ assignmentId: string }>().assignmentId);
  const auth = useAuth();
  if (auth.status !== 'authenticated') return <LoadingState />;
  if (auth.user.role === 'viewer') return <EmptyState title="Diskusi tidak tersedia untuk peran Anda." />;
  return <CommentDiscussion key={assignmentId} assignmentId={assignmentId} />;
}
