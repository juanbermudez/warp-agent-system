// src/services/auth-service.ts
import { createSupabaseAuthClient } from '../config/supabase-auth-config.js';

export class AuthService {
  private supabase = createSupabaseAuthClient();
  
  async signUp(email: string, password: string): Promise<{ user: any, error: any }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });
    
    return { 
      user: data?.user || null, 
      error 
    };
  }
  
  async signIn(email: string, password: string): Promise<{ session: any, error: any }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { 
      session: data?.session || null, 
      error 
    };
  }
  
  async signOut(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }
  
  async validateToken(token: string): Promise<boolean> {
    try {
      // Try to get the user with this token as a bearer token
      const { data, error } = await this.supabase.auth.getUser(token);
      
      return !error && data?.user !== null;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }
}
