import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { session } from '@/test/authMock';
import DiscussionPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ assignmentId: 'a%2Fb' }) }));
vi.mock('@/hooks/useAuth', async () => await import('@/test/authMock'));
vi.mock('@/components/reviews/CommentDiscussion', () => ({ CommentDiscussion: ({ assignmentId }: { assignmentId: string }) => <p>Discussion {assignmentId}</p> }));
beforeEach(() => { session.role = 'author'; });
describe('discussion route access', () => {
  it('waits for authentication before mounting the discussion', () => {
    session.role = null;
    render(<DiscussionPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(/Discussion/)).not.toBeInTheDocument();
  });
  it('does not mount or request a discussion for viewers', () => {
    session.role = 'viewer';
    render(<DiscussionPage />);
    expect(screen.getByText('Diskusi tidak tersedia untuk peran Anda.')).toBeInTheDocument();
    expect(screen.queryByText(/Discussion/)).not.toBeInTheDocument();
  });
  it.each(['author', 'reviewer', 'admin'] as const)('lets %s reach the server-checked discussion', (role) => {
    session.role = role;
    render(<DiscussionPage />);
    expect(screen.getByText('Discussion a/b')).toBeInTheDocument();
  });
});
