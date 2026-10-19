import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import Pagination from '../components/Pagination.jsx';
import ComplaintCard from '../components/ComplaintCard.jsx';
import BarChart from '../components/BarChart.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import CommentThread from '../components/CommentThread.jsx';

describe('Badges', () => {
  it('shows a readable status with the matching class', () => {
    render(<StatusBadge status="in-progress" />);
    const badge = screen.getByText('In progress');
    expect(badge).toHaveClass('tag', 's-in-progress');
  });

  it('labels the priority', () => {
    render(<PriorityBadge priority="urgent" />);
    expect(screen.getByText('Urgent priority')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} pages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables Previous on the first page and moves forward on Next', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pages={3} total={25} onChange={onChange} />);

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('ComplaintCard', () => {
  const complaint = {
    _id: 'abc123',
    title: 'Leaking tap',
    description: 'The tap in the bathroom drips all night',
    category: 'plumbing',
    priority: 'high',
    status: 'open',
    roomNumber: 'B-12',
    createdAt: new Date().toISOString(),
    property: { name: 'Sunrise Hostel' },
    resident: { name: 'Nimal' },
    assignedTo: null,
  };

  it('links the title to the details page and shows key facts', () => {
    render(
      <MemoryRouter>
        <ComplaintCard complaint={complaint} showResident />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Leaking tap' })).toHaveAttribute('href', '/complaints/abc123');
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText(/Sunrise Hostel/)).toHaveTextContent('room B-12');
    expect(screen.getByText(/by Nimal/)).toBeInTheDocument();
    expect(screen.getByText('Not assigned yet')).toBeInTheDocument();
  });
});

describe('BarChart', () => {
  it('renders one bar per key with its value', () => {
    render(<BarChart title="By status" data={{ open: 3, resolved: 1 }} />);
    expect(screen.getByText('By status')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows an empty message when every value is zero', () => {
    render(<BarChart title="Empty" data={{ open: 0 }} />);
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});

describe('StatusTimeline', () => {
  it('lists each status change with its note', () => {
    render(
      <StatusTimeline
        history={[
          { status: 'open', note: 'Complaint submitted', at: '2026-01-01T10:00:00Z', changedBy: { name: 'Nimal' } },
          { status: 'resolved', note: 'Tap replaced', at: '2026-01-02T10:00:00Z' },
        ]}
      />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Tap replaced')).toBeInTheDocument();
    expect(screen.getByText(/by Nimal/)).toBeInTheDocument();
  });
});

describe('CommentThread', () => {
  it('validates empty messages and submits text', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<CommentThread comments={[]} currentUserId="u1" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByText(/write a message first/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Message'), 'Any update?');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSubmit).toHaveBeenCalledWith('Any update?');
  });
});
