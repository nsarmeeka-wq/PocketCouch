import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/primitives';

export function NotFound() {
  return (
    <div className="py-16">
      <EmptyState
        icon={<Compass size={22} />}
        title="Page not found"
        body="That screen does not exist. Head back to your dashboard to keep training."
        action={
          <Link to="/dashboard" className="btn-primary">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
