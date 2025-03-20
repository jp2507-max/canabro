import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Container } from '../../components/Container';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleRegister = async () => {
    // Will implement Supabase auth registration here
    console.log('Register with:', email, password, username);
  };

  return (
    <Container>
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold mb-8 text-center">CanaBro</Text>
        <Text className="text-xl font-semibold mb-6 text-center">Create Account</Text>
        
        <View className="space-y-4 mb-6">
          <TextInput
            className="bg-gray-100 p-4 rounded-lg"
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          <TextInput
            className="bg-gray-100 p-4 rounded-lg"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            className="bg-gray-100 p-4 rounded-lg"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        
        <TouchableOpacity 
          className="bg-green-600 p-4 rounded-lg mb-4"
          onPress={handleRegister}
        >
          <Text className="text-white text-center font-semibold">Register</Text>
        </TouchableOpacity>
        
        <View className="flex-row justify-center">
          <Text className="text-gray-600">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-green-600 font-semibold">Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </Container>
  );
}
