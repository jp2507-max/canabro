import { Redirect } from 'expo-router';

export default function Index() {
  // For now, redirect to auth/login
  // Later, this will check if the user is authenticated
  // and redirect accordingly
  return <Redirect href="/(auth)/login" />;
}
