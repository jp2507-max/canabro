/**
 * Environmental Dashboard Error Boundary
 * 
 * Catches errors in the EnvironmentalDashboard component and provides
 * a user-friendly fallback UI.
 */




import React, { ReactNode, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { log } from '@/lib/utils/logger';
import { ErrorBoundary } from 'react-error-boundary';


interface EnvironmentalDashboardErrorBoundaryProps {
	children: ReactNode;
	onRetry?: () => void;
}

function FallbackComponent({ error, resetErrorBoundary, onRetry }: { error: Error; resetErrorBoundary: () => void; onRetry?: () => void }) {
	const { t } = useTranslation();
	const handleRetry = () => {
		if (onRetry) onRetry();
		resetErrorBoundary();
	};
	return (
		<ThemedView className="flex-1 items-center justify-center p-6">
			<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
				<OptimizedIcon name="warning" size={48} className="text-error mb-4" />
				<ThemedText className="text-lg font-bold mb-2 text-center">
					{t('environmentalDashboard.errorTitle', 'Something went wrong')}
				</ThemedText>
				<ThemedText className="mb-4 text-center opacity-80">
					{t('environmentalDashboard.errorMessage', 'An unexpected error occurred while loading the dashboard.')}
				</ThemedText>
				<ThemedText className="mb-4 text-center text-xs opacity-60">
					{error.message}
				</ThemedText>
				<TouchableOpacity
					className="bg-primary px-6 py-2 rounded-lg"
					accessibilityRole="button"
					accessibilityLabel={t('environmentalDashboard.retry', 'Retry')}
					onPress={handleRetry}
				>
					<ThemedText className="text-white font-semibold">
						{t('environmentalDashboard.retry', 'Retry')}
					</ThemedText>
				</TouchableOpacity>
			</ScrollView>
		</ThemedView>
	);
}



export const EnvironmentalDashboardErrorBoundary = ({ children, onRetry }: EnvironmentalDashboardErrorBoundaryProps) => {
	const handleError = useCallback((error: Error, info: { componentStack?: string | null }) => {
		log.error('EnvironmentalDashboardErrorBoundary', error, {
			componentStack: info.componentStack ?? ''
		});
	}, []);
	// Wrap FallbackComponent to inject onRetry
	const Fallback = (props: { error: Error; resetErrorBoundary: () => void }) => (
		<FallbackComponent {...props} onRetry={onRetry} />
	);
	return (
		<ErrorBoundary FallbackComponent={Fallback} onError={handleError}>
			{children}
		</ErrorBoundary>
	);
};
