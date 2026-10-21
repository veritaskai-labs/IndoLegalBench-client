import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeCaseReview, makeSlot, makeVerdictView } from '@/test/reviewFixtures';
import { ReviewerFeedback } from './ReviewerFeedback';

vi.mock('@/lib/reviews/discussionApi', async (original) => ({
  ...await original<typeof import('@/lib/reviews/discussionApi')>(),
  getDiscussion: vi.fn().mockResolvedValue({ assignment_id:'comment-owner',case_id:'c1',reviewer_name:'Reviewer A',comment:'Mohon perjelas rujukan.',can_reply:true,replies:[],round_no:3,viewer_id:'author',commented_at:null }),
}));

describe('K-03 visible comment actions', () => {
  it('opens a labelled discussion drawer for a third-round comment without navigating away', async () => {
    const user = userEvent.setup();
    render(<ReviewerFeedback review={makeCaseReview({ round_no:3, reviewers: [makeSlot({
      assignment_id: 'comment-owner', verdict: makeVerdictView({ comment: 'Mohon perjelas rujukan.' }),
    })] })} />);
    await user.click(screen.getByRole('button', { name: 'Balas komentar' }));
    expect(await screen.findByRole('dialog', { name: 'Diskusi komentar peninjau' })).toBeInTheDocument();
    expect(screen.getByText('Putaran 3')).toBeInTheDocument();
  });

  it.each([null, makeVerdictView({ comment: null })])('does not offer a discussion without a visible comment (%s)', (verdict) => {
    render(<ReviewerFeedback review={makeCaseReview({ reviewers: [makeSlot({ verdict })] })} />);
    expect(screen.queryByRole('button', { name: 'Balas komentar' })).not.toBeInTheDocument();
  });
});
