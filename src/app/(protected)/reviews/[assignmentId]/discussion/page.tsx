'use client';

import { useParams } from 'next/navigation';
import { CommentDiscussion } from '@/components/reviews/CommentDiscussion';
import { EmptyState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { messages } from '@/lib/i18n/locale';
import { useText } from '@/lib/i18n/LocaleProvider';
import { decodeRouteParam } from '@/lib/routeParams';

const COPY = messages({
  id: { unavailable: 'Diskusi tidak tersedia untuk peran Anda.' },
  en: { unavailable: 'Discussion is not available for your role.' },
});

export default function DiscussionPage() {
  const copy = useText(COPY);
  const assignmentId = decodeRouteParam(useParams<{ assignmentId: string }>().assignmentId);
  const auth = useAuth();
  if (auth.status !== 'authenticated') return <LoadingState />;
  if (auth.user.role === 'viewer') return <EmptyState title={copy.unavailable} />;
  return <CommentDiscussion key={assignmentId} assignmentId={assignmentId} />;
}
