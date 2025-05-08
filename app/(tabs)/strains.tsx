import StrainsContainer from '../../screens/strains/StrainsContainer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function StrainsScreenRoute() {
  return (
    <ErrorBoundary>
      <StrainsContainer />
    </ErrorBoundary>
  );
}
