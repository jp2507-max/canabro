import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import * as z from 'zod';

import AnimatedButton from '@/components/buttons/AnimatedButton';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import ThemedText from '@/components/ui/ThemedText';
import ThemedView from '@/components/ui/ThemedView';
import { useAuth } from '@/lib/contexts/AuthProvider';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/utils/haptics';
import { EnhancedKeyboardWrapper } from '@/components/keyboard/EnhancedKeyboardWrapper';

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'auth.register.passwordTooShort'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.register.passwordsDoNotMatch',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { updateUserPassword } = useAuth();
  const { error: errorParam } = useLocalSearchParams<{ error: string }>();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (errorParam) {
      Alert.alert(t('auth.resetPassword.errorTitle'), errorParam);
    }
  }, [errorParam, t]);

  const onSubmit = async (data: ResetPasswordForm) => {
    const { error } = await updateUserPassword(data.password);

    if (error) {
      impactAsync(ImpactFeedbackStyle.Heavy);
      Alert.alert(t('auth.resetPassword.errorTitle'), error.message);
    } else {
      impactAsync(ImpactFeedbackStyle.Light);
      Alert.alert(
        t('auth.resetPassword.successTitle'),
        t('auth.resetPassword.successMessage')
      );
      router.replace('/(auth)/login');
    }
  };

  return (
    <EnhancedKeyboardWrapper>
      <ThemedView className="flex-1 justify-center p-6">
        <ThemedText variant="heading" className="text-center mb-8">{t('auth.resetPassword.title')}</ThemedText>
        
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <EnhancedTextInput
              placeholder={t('auth.register.passwordPlaceholder')}
              leftIcon="lock-closed"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password ? t(errors.password.message as string) : undefined}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <EnhancedTextInput
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              leftIcon="lock-closed"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword ? t(errors.confirmPassword.message as string) : undefined}
            />
          )}
        />

        <AnimatedButton
          title={t('auth.resetPassword.button')}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          icon="checkmark" // Replace the invalid 'save' icon with 'checkmark'
        />
      </ThemedView>
    </EnhancedKeyboardWrapper>
  );
}
