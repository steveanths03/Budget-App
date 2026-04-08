// app/auth.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { DarkColors } from '../constants/theme';

export default function AuthScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [isLogin, setIsLogin]   = useState(true);
  const c = DarkColors;

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) Alert.alert('Login failed', error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) Alert.alert('Sign up failed', error.message);
        else Alert.alert('Check your email', 'Confirm your account then log in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.container, { backgroundColor: c.bg }]}>
      <Text style={[s.title, { color: c.textBright }]}>💰 Budget Tracker</Text>
      <Text style={[s.sub, { color: c.textDim }]}>{isLogin ? 'Sign in to your account' : 'Create a new account'}</Text>

      <TextInput style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
        placeholder="Email" placeholderTextColor={c.textDim}
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" />

      <TextInput style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
        placeholder="Password" placeholderTextColor={c.textDim}
        value={password} onChangeText={setPassword}
        secureTextEntry />

      <TouchableOpacity style={[s.btn, { backgroundColor: c.accent, opacity: loading ? 0.6 : 1 }]}
        onPress={handleAuth} disabled={loading}>
        <Text style={[s.btnText, { color: c.bg }]}>{loading ? 'Loading…' : isLogin ? 'Sign In' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(v => !v)} style={{ marginTop: 16 }}>
        <Text style={{ color: c.accent, fontWeight: '700', textAlign: 'center' }}>
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 12 },
  btn: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { fontWeight: '800', fontSize: 16 },
});