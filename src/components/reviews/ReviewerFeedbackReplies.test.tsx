import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeCaseReview, makeSlot, makeVerdictView } from '@/test/reviewFixtures';
import { ReviewerFeedback } from './ReviewerFeedback';

describe('K-03 comment discussions', () => {
  it('links each visible reviewer comment to its own discussion', () => {
    render(<ReviewerFeedback review={makeCaseReview({ reviewers: [makeSlot({
      assignment_id: 'comment-owner', verdict: makeVerdictView({ comment: 'Mohon perjelas rujukan.' }),
    })] })} />);
    const link = screen.getByRole('link', { name: 'Lihat dan balas komentar' });
    expect(link).toHaveAttribute('href', '/reviews/comment-owner/discussion');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([null, makeVerdictView({ comment: null })])('does not offer replies without a visible comment (%s)', (verdict) => {
    render(<ReviewerFeedback review={makeCaseReview({ reviewers: [makeSlot({ verdict })] })} />);
    expect(screen.queryByRole('link', { name: 'Lihat dan balas komentar' })).not.toBeInTheDocument();
  });
});
