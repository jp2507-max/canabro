import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import StrainsContainer from '../../screens/strains/StrainsContainer';

export default function StrainsScreenRoute() {
  return (
    <ErrorBoundary>
      <StrainsContainer />
    </ErrorBoundary>
  );
}
