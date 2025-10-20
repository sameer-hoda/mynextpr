# Detailed Migration Guide: From Supabase to Local SQLite Database

## Table of Contents
1. [Overview](#overview)
2. [Pre-Migration Setup](#pre-migration-setup)
3. [Authentication Migration](#authentication-migration)
4. [Database Schema Migration](#database-schema-migration)
5. [Data Migration](#data-migration)
6. [Frontend Code Changes](#frontend-code-changes)
7. [Testing and Verification](#testing-and-verification)
8. [Debugging Prints and Steps](#debugging-prints-and-steps)

## Overview

This document provides a comprehensive, step-by-step guide for migrating the Runna application from Supabase to a local SQLite database. This migration will involve changing the authentication system, database schema, data handling, and updating all frontend code that currently uses Supabase APIs.

## Pre-Migration Setup

### 1. Install Required Dependencies

First, install the dependencies needed for SQLite integration:

```bash
# Install SQLite for React/Vite
npm install better-sqlite3
# For browser-based SQLite solution, we'll use sql.js instead
npm install sql.js
# Or use IndexedDB-based solution
npm install idb-keyval
```

### 2. Add SQLite Wrapper Module

Create a new SQLite wrapper module to replace Supabase client:

```typescript
// File: src/integrations/sqlite/wrapper.ts

import initSqlJs, { Database } from 'sql.js';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Workout {
  id: string;
  plan_id: string;
  user_id: string;
  day: number;
  title: string;
  type: string;
  description: string;
  completed: boolean;
  scheduled_date: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  rating: number | null;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
  warmup: string | null;
  main_set: string | null;
  cooldown: string | null;
}

interface Plan {
  id: string;
  user_id: string;
  coach_persona: string;
  age: string;
  sex: string;
  fitness_level: string;
  goal_distance: string;
  goal_time: string | null;
  plan_overview: string | null;
  created_at: string;
  updated_at: string;
}

class SQLiteWrapper {
  private db: Database | null = null;
  private user_id: string | null = null;

  constructor() {
    this.initializeDB();
  }

  private async initializeDB() {
    console.debug("DEBUG: Initializing SQLite database wrapper");
    try {
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      this.db = new SQL.Database();
      
      // Create tables if they don't exist
      this.createTables();
      
      console.debug("DEBUG: SQLite database initialized successfully");
    } catch (error) {
      console.error("DEBUG: Error initializing SQLite database:", error);
      throw error;
    }
  }

  private createTables() {
    if (!this.db) {
      console.error("DEBUG: Database not initialized in createTables");
      return;
    }
    
    console.debug("DEBUG: Creating SQLite tables");
    
    // Create profiles table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        display_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create plans table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        coach_persona TEXT NOT NULL,
        age TEXT NOT NULL,
        sex TEXT NOT NULL,
        fitness_level TEXT NOT NULL,
        goal_distance TEXT NOT NULL,
        goal_time TEXT,
        plan_overview TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create workouts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        day INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        scheduled_date TEXT,
        duration_minutes REAL,
        distance_km REAL,
        rating INTEGER,
        user_notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        warmup TEXT,
        main_set TEXT,
        cooldown TEXT
      )
    `);
    
    console.debug("DEBUG: All SQLite tables created successfully");
  }

  // Authentication methods
  async setCurrentUser(userId: string) {
    console.debug("DEBUG: Setting current user ID:", userId);
    this.user_id = userId;
  }

  async getCurrentUser() {
    console.debug("DEBUG: Getting current user ID:", this.user_id);
    return this.user_id;
  }

  // Profiles methods
  async getProfile(userId: string) {
    console.debug("DEBUG: Fetching profile for user ID:", userId);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in getProfile");
      return null;
    }

    try {
      const stmt = this.db.prepare("SELECT * FROM profiles WHERE user_id = ?");
      const result = stmt.getAsObject([userId]) as Profile | null;
      stmt.free();
      
      console.debug("DEBUG: Profile fetched:", result);
      return result;
    } catch (error) {
      console.error("DEBUG: Error fetching profile:", error);
      return null;
    }
  }

  async upsertProfile(userId: string, displayName: string) {
    console.debug(`DEBUG: Upserting profile for user: ${userId}, display name: ${displayName}`);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in upsertProfile");
      return;
    }

    try {
      // Check if profile exists
      const profile = await this.getProfile(userId);
      const now = new Date().toISOString();
      
      if (profile) {
        // Update existing profile
        this.db.run(`
          UPDATE profiles 
          SET display_name = ?, updated_at = ? 
          WHERE user_id = ?
        `, [displayName, now, userId]);
        console.debug("DEBUG: Profile updated for user:", userId);
      } else {
        // Insert new profile
        this.db.run(`
          INSERT INTO profiles (id, user_id, display_name, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?)
        `, [crypto.randomUUID(), userId, displayName, now, now]);
        console.debug("DEBUG: New profile created for user:", userId);
      }
    } catch (error) {
      console.error("DEBUG: Error upserting profile:", error);
      throw error;
    }
  }

  // Plans methods
  async getPlans(userId: string) {
    console.debug("DEBUG: Fetching plans for user ID:", userId);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in getPlans");
      return [];
    }

    try {
      const stmt = this.db.prepare("SELECT * FROM plans WHERE user_id = ?");
      const result = stmt.all([userId]) as Plan[];
      stmt.free();
      
      console.debug("DEBUG: Plans fetched:", result);
      return result;
    } catch (error) {
      console.error("DEBUG: Error fetching plans:", error);
      return [];
    }
  }

  async createPlan(plan: Omit<Plan, 'id' | 'created_at' | 'updated_at'>) {
    console.debug("DEBUG: Creating plan with data:", plan);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in createPlan");
      return;
    }

    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      this.db.run(`
        INSERT INTO plans (id, user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        plan.user_id,
        plan.coach_persona,
        plan.age,
        plan.sex,
        plan.fitness_level,
        plan.goal_distance,
        plan.goal_time,
        plan.plan_overview,
        now,
        now
      ]);
      
      console.debug("DEBUG: Plan created with ID:", id);
      return { id, ...plan, created_at: now, updated_at: now };
    } catch (error) {
      console.error("DEBUG: Error creating plan:", error);
      throw error;
    }
  }

  // Workouts methods
  async getWorkouts(userId: string) {
    console.debug("DEBUG: Fetching workouts for user ID:", userId);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in getWorkouts");
      return [];
    }

    try {
      const stmt = this.db.prepare("SELECT * FROM workouts WHERE user_id = ? ORDER BY day ASC");
      const result = stmt.all([userId]) as Workout[];
      stmt.free();
      
      console.debug("DEBUG: Workouts fetched:", result);
      return result;
    } catch (error) {
      console.error("DEBUG: Error fetching workouts:", error);
      return [];
    }
  }

  async getCompletedWorkouts(userId: string) {
    console.debug("DEBUG: Fetching completed workouts for user ID:", userId);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in getCompletedWorkouts");
      return [];
    }

    try {
      const stmt = this.db.prepare("SELECT * FROM workouts WHERE user_id = ? AND completed = 1 ORDER BY scheduled_date DESC");
      const result = stmt.all([userId]) as Workout[];
      stmt.free();
      
      console.debug("DEBUG: Completed workouts fetched:", result);
      return result;
    } catch (error) {
      console.error("DEBUG: Error fetching completed workouts:", error);
      return [];
    }
  }

  async createWorkout(workout: Omit<Workout, 'id' | 'created_at' | 'updated_at'>) {
    console.debug("DEBUG: Creating workout with data:", workout);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in createWorkout");
      return;
    }

    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      this.db.run(`
        INSERT INTO workouts (id, plan_id, user_id, day, title, type, description, completed, scheduled_date, 
                             duration_minutes, distance_km, rating, user_notes, created_at, updated_at, 
                             warmup, main_set, cooldown)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        workout.plan_id,
        workout.user_id,
        workout.day,
        workout.title,
        workout.type,
        workout.description,
        workout.completed,
        workout.scheduled_date,
        workout.duration_minutes,
        workout.distance_km,
        workout.rating,
        workout.user_notes,
        now,
        now,
        workout.warmup,
        workout.main_set,
        workout.cooldown
      ]);
      
      console.debug("DEBUG: Workout created with ID:", id);
      return { id, ...workout, created_at: now, updated_at: now };
    } catch (error) {
      console.error("DEBUG: Error creating workout:", error);
      throw error;
    }
  }

  async updateWorkout(id: string, updates: Partial<Workout>) {
    console.debug("DEBUG: Updating workout with ID:", id, "with data:", updates);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in updateWorkout");
      return;
    }

    try {
      // Build dynamic update query
      const updateFields = Object.keys(updates).filter(key => key !== 'id' && key !== 'updated_at');
      const updateValues = updateFields.map(key => (updates as any)[key]);
      const updateClause = updateFields.map(key => `${key} = ?`).join(', ');
      
      updateValues.push(new Date().toISOString()); // updated_at
      updateValues.push(id); // id for WHERE clause
      
      this.db.run(`
        UPDATE workouts 
        SET ${updateClause}, updated_at = ?
        WHERE id = ?
      `, updateValues);
      
      console.debug("DEBUG: Workout updated with ID:", id);
    } catch (error) {
      console.error("DEBUG: Error updating workout:", error);
      throw error;
    }
  }
}

// Export a singleton instance of SQLiteWrapper
export const sqliteDB = new SQLiteWrapper();
```

## Authentication Migration

### 1. Create Local Authentication Service

Create a new authentication service to replace Supabase Auth:

```typescript
// File: src/integrations/auth/localAuth.ts

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export class LocalAuthService {
  private static instance: LocalAuthService;
  private currentUser: User | null = null;
  private authStateListeners: Array<(user: User | null) => void> = [];

  private constructor() {
    this.checkStoredSession();
  }

  static getInstance(): LocalAuthService {
    if (!LocalAuthService.instance) {
      LocalAuthService.instance = new LocalAuthService();
    }
    return LocalAuthService.instance;
  }

  private checkStoredSession() {
    console.debug("DEBUG: Checking for stored session");
    const storedUser = localStorage.getItem('local_auth_session');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        console.debug("DEBUG: Restored session for user:", this.currentUser.id);
      } catch (e) {
        console.error("DEBUG: Error restoring session from storage:", e);
        localStorage.removeItem('local_auth_session');
      }
    }
  }

  private notifyAuthStateChange(user: User | null) {
    console.debug("DEBUG: Notifying auth state change to", this.authStateListeners.length, "listeners");
    this.authStateListeners.forEach(listener => listener(user));
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    console.debug("DEBUG: Adding auth state listener");
    this.authStateListeners.push(callback);
    
    // Call immediately with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
      console.debug("DEBUG: Removed auth state listener");
    };
  }

  async signInWithGoogle() {
    console.debug("DEBUG: Starting Google sign in with local auth");
    try {
      // For local authentication, we'll simulate Google login
      // In a real scenario, you'd integrate with Google OAuth API
      const userId = crypto.randomUUID();
      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        user_metadata: {
          full_name: 'John Doe',
          name: 'John Doe',
          avatar_url: 'https://via.placeholder.com/150'
        }
      };

      console.debug("DEBUG: Created mock user:", mockUser);
      this.currentUser = mockUser;
      localStorage.setItem('local_auth_session', JSON.stringify(mockUser));
      
      // Update SQLite database with user profile
      const displayName = mockUser.user_metadata?.full_name || 
                         mockUser.user_metadata?.name || 
                         mockUser.email?.split('@')[0] || 
                         'User';
      
      await window.sqliteDB.upsertProfile(userId, displayName);
      console.debug("DEBUG: Created profile for user:", userId);
      
      this.notifyAuthStateChange(mockUser);
      console.debug("DEBUG: Google sign in completed successfully");
      
      return { data: { user: mockUser }, error: null };
    } catch (error) {
      console.error("DEBUG: Error during Google sign in:", error);
      return { data: null, error };
    }
  }

  async signInWithPassword(email: string, password: string) {
    console.debug("DEBUG: Starting password sign in for:", email);
    try {
      const storedUsers = JSON.parse(localStorage.getItem('local_users') || '{}');
      const user = storedUsers[email];
      
      if (user && user.password === password) {
        this.currentUser = user;
        localStorage.setItem('local_auth_session', JSON.stringify(user));
        this.notifyAuthStateChange(user);
        
        console.debug("DEBUG: Password sign in completed successfully for:", email);
        return { data: { user }, error: null };
      } else {
        console.error("DEBUG: Invalid credentials for:", email);
        return { data: null, error: { message: 'Invalid credentials' } };
      }
    } catch (error) {
      console.error("DEBUG: Error during password sign in:", error);
      return { data: null, error };
    }
  }

  async signUp(email: string, password: string) {
    console.debug("DEBUG: Starting sign up for:", email);
    try {
      let storedUsers = JSON.parse(localStorage.getItem('local_users') || '{}');
      
      if (storedUsers[email]) {
        console.error("DEBUG: User already exists:", email);
        return { data: null, error: { message: 'User already exists' } };
      }
      
      const userId = crypto.randomUUID();
      const user: User = {
        id: userId,
        email,
        user_metadata: {
          name: email.split('@')[0],
        }
      };
      
      storedUsers[email] = user;
      localStorage.setItem('local_users', JSON.stringify(storedUsers));
      
      this.currentUser = user;
      localStorage.setItem('local_auth_session', JSON.stringify(user));
      
      // Create profile
      await window.sqliteDB.upsertProfile(userId, email.split('@')[0] || 'User');
      console.debug("DEBUG: Created profile for new user:", userId);
      
      this.notifyAuthStateChange(user);
      console.debug("DEBUG: Sign up completed successfully for:", email);
      
      return { data: { user }, error: null };
    } catch (error) {
      console.error("DEBUG: Error during sign up:", error);
      return { data: null, error };
    }
  }

  async signOut() {
    console.debug("DEBUG: Starting sign out process");
    try {
      this.currentUser = null;
      localStorage.removeItem('local_auth_session');
      localStorage.removeItem('local_user_profile');
      
      this.notifyAuthStateChange(null);
      console.debug("DEBUG: Sign out completed successfully");
      
      return { error: null };
    } catch (error) {
      console.error("DEBUG: Error during sign out:", error);
      return { error };
    }
  }

  getSession() {
    console.debug("DEBUG: Getting current session");
    const session = this.currentUser ? { 
      user: this.currentUser,
      expires_at: null // No expiration for local auth
    } : null;
    
    console.debug("DEBUG: Current session:", session);
    return { data: { session }, error: null };
  }
}

export const localAuth = LocalAuthService.getInstance();
```

### 2. Update AuthContext to Use Local Authentication

Update the AuthContext to use the new local authentication system:

```typescript
// File: src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { localAuth } from '@/integrations/auth/localAuth';
import { sqliteDB } from '@/integrations/sqlite/wrapper';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.debug("DEBUG: AuthProvider mounted - initializing session");
    
    // Get initial session
    const { data: { session } } = localAuth.getSession();
    if (session) {
      console.debug("DEBUG: Found existing session, setting user:", session.user.id);
      setUser(session.user);
      
      // Set user in SQLite wrapper
      sqliteDB.setCurrentUser(session.user.id);
      
      // Fetch profile
      fetchProfile(session.user.id);
    } else {
      console.debug("DEBUG: No existing session found");
    }
    
    setLoading(false);

    // Listen for auth changes
    console.debug("DEBUG: Setting up auth state change listener");
    const unsubscribe = localAuth.onAuthStateChange(async (user) => {
      console.debug("DEBUG: Auth state changed, new user:", user?.id || null);
      if (user) {
        setUser(user);
        sqliteDB.setCurrentUser(user.id);
        await fetchProfile(user.id);
      } else {
        setUser(null);
        setProfile(null);
        sqliteDB.setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      console.debug("DEBUG: Cleaning up auth state change listener");
      unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.debug("DEBUG: Fetching profile for user:", userId);
    try {
      const profile = await sqliteDB.getProfile(userId);
      console.debug("DEBUG: Profile fetched:", profile);
      setProfile(profile || null);
    } catch (error) {
      console.error('DEBUG: Error fetching profile:', error);
    }
  };

  const signInWithGoogle = async () => {
    console.debug("DEBUG: signInWithGoogle called in AuthContext");
    try {
      const result = await localAuth.signInWithGoogle();
      if (result.error) throw result.error;
      
      console.debug("DEBUG: Google sign in completed in AuthContext");
    } catch (error: any) {
      console.error('DEBUG: Error signing in with Google in AuthContext:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.debug("DEBUG: signOut called in AuthContext");
    try {
      const result = await localAuth.signOut();
      if (result.error) throw result.error;
      
      console.debug("DEBUG: Sign out completed in AuthContext");
    } catch (error) {
      console.error('DEBUG: Error signing out in AuthContext:', error);
      // Even if there's an error, clear local state
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    console.debug("DEBUG: refreshProfile called");
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile
  };

  console.debug("DEBUG: AuthContext provider value:", value);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Database Schema Migration

### 1. Update Database Schema

The new SQLite schema will mirror the Supabase structure:

```sql
-- profiles table
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- plans table
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  coach_persona TEXT NOT NULL,
  age TEXT NOT NULL,
  sex TEXT NOT NULL,
  fitness_level TEXT NOT NULL,
  goal_distance TEXT NOT NULL,
  goal_time TEXT,
  plan_overview TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- workouts table
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day INTEGER NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  scheduled_date TEXT,
  duration_minutes REAL,
  distance_km REAL,
  rating INTEGER,
  user_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  warmup TEXT,
  main_set TEXT,
  cooldown TEXT
);
```

### 2. Create Database Migration Script

```typescript
// File: src/integrations/sqlite/migration.ts

import { sqliteDB } from './wrapper';

export class DatabaseMigration {
  static async runMigrations() {
    console.debug("DEBUG: Starting database migrations");
    
    try {
      // Create indexes for better performance
      await sqliteDB.runQuery("CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);");
      await sqliteDB.runQuery("CREATE INDEX IF NOT EXISTS idx_workouts_completed ON workouts(completed);");
      await sqliteDB.runQuery("CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);");
      await sqliteDB.runQuery("CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);");
      
      console.debug("DEBUG: Database migrations completed successfully");
    } catch (error) {
      console.error("DEBUG: Error running database migrations:", error);
      throw error;
    }
  }
}

// Helper function for running queries (add to SQLiteWrapper)
// This should be added to the SQLiteWrapper class:
/*
  async runQuery(query: string) {
    console.debug("DEBUG: Running query:", query);
    if (!this.db) {
      console.error("DEBUG: Database not initialized in runQuery");
      return;
    }
    
    try {
      return this.db.run(query);
    } catch (error) {
      console.error("DEBUG: Error running query:", query, error);
      throw error;
    }
  }
*/
```

## Data Migration

### 1. Create Data Migration Utility

```typescript
// File: src/utils/dataMigration.ts

import { sqliteDB } from '@/integrations/sqlite/wrapper';

interface SupabaseUserProfile {
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseWorkout {
  id: string;
  plan_id: string;
  user_id: string;
  day: number;
  title: string;
  type: string;
  description: string;
  completed: boolean;
  scheduled_date: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  rating: number | null;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
  warmup: string | null;
  main_set: string | null;
  cooldown: string | null;
}

interface SupabasePlan {
  id: string;
  user_id: string;
  coach_persona: string;
  age: string;
  sex: string;
  fitness_level: string;
  goal_distance: string;
  goal_time: string | null;
  plan_overview: string | null;
  created_at: string;
  updated_at: string;
}

export class DataMigration {
  static async migrateFromLocalStorage() {
    console.debug("DEBUG: Starting data migration from localStorage");
    
    try {
      // Check if there's Supabase-related data to migrate
      const supabaseData = localStorage.getItem('supabase_migration_data');
      if (!supabaseData) {
        console.debug("DEBUG: No supabase migration data found, skipping migration");
        return;
      }
      
      const parsedData = JSON.parse(supabaseData);
      const { profiles, workouts, plans } = parsedData;
      
      console.debug("DEBUG: Found data to migrate:", {
        profiles: profiles?.length || 0,
        workouts: workouts?.length || 0,
        plans: plans?.length || 0
      });
      
      // Migrate profiles
      if (profiles && Array.isArray(profiles)) {
        for (const profile of profiles) {
          console.debug("DEBUG: Migrating profile:", profile);
          await sqliteDB.upsertProfile(profile.user_id, profile.display_name || 'User');
        }
      }
      
      // Migrate plans
      if (plans && Array.isArray(plans)) {
        for (const plan of plans) {
          console.debug("DEBUG: Migrating plan:", plan);
          await sqliteDB.createPlan({
            user_id: plan.user_id,
            coach_persona: plan.coach_persona,
            age: plan.age,
            sex: plan.sex,
            fitness_level: plan.fitness_level,
            goal_distance: plan.goal_distance,
            goal_time: plan.goal_time,
            plan_overview: plan.plan_overview
          });
        }
      }
      
      // Migrate workouts
      if (workouts && Array.isArray(workouts)) {
        for (const workout of workouts) {
          console.debug("DEBUG: Migrating workout:", workout);
          await sqliteDB.createWorkout({
            plan_id: workout.plan_id,
            user_id: workout.user_id,
            day: workout.day,
            title: workout.title,
            type: workout.type,
            description: workout.description,
            completed: workout.completed,
            scheduled_date: workout.scheduled_date,
            duration_minutes: workout.duration_minutes,
            distance_km: workout.distance_km,
            rating: workout.rating,
            user_notes: workout.user_notes,
            warmup: workout.warmup,
            main_set: workout.main_set,
            cooldown: workout.cooldown
          });
        }
      }
      
      // Clear migration data after successful migration
      localStorage.removeItem('supabase_migration_data');
      console.debug("DEBUG: Data migration completed successfully");
    } catch (error) {
      console.error("DEBUG: Error during data migration:", error);
      throw error;
    }
  }
}
```

## Frontend Code Changes

### 1. Update Auth Page

```typescript
// File: src/pages/Auth.tsx (Updated)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { localAuth } from "@/integrations/auth/localAuth";
import { sqliteDB } from "@/integrations/sqlite/wrapper";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.debug("DEBUG: Auth page mounted - checking session");
    // Check if user is already logged in
    const { data: { session } } = localAuth.getSession();
    if (session) {
      console.debug("DEBUG: User already logged in, redirecting to coach-selection");
      navigate("/coach-selection");
    }

    // Listen for auth changes
    console.debug("DEBUG: Setting up auth state change listener in Auth component");
    const unsubscribe = localAuth.onAuthStateChange((user) => {
      if (user) {
        console.debug("DEBUG: User signed in in Auth component, redirecting to coach-selection");
        // Check if user is a Google user and get their display name
        const displayName = user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'User';
        
        // Create or update profile with display name
        sqliteDB.upsertProfile(user.id, displayName).then(() => {
          console.debug("DEBUG: Profile created/updated for user:", user.id);
          navigate("/coach-selection");
        }).catch(err => {
          console.error("DEBUG: Error creating profile:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create user profile",
          });
        });
      }
    });

    return () => {
      console.debug("DEBUG: Cleaning up auth state change listener in Auth component");
      unsubscribe();
    };
  }, [navigate]);

  const handleGoogleLogin = async () => {
    console.debug("DEBUG: handleGoogleLogin called");
    try {
      setLoading(true);
      
      const result = await localAuth.signInWithGoogle();
      if (result.error) throw result.error;
      
      console.debug("DEBUG: Google login successful");
    } catch (error: any) {
      console.error("DEBUG: Error in handleGoogleLogin:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign in with Google",
      });
      setLoading(false);
    }
  };

  const handleMockLogin = async () => {
    try {
      console.debug("DEBUG: handleMockLogin called");
      setLoading(true);
      
      // Create a test user with email/password
      const testEmail = 'test@runningcoach.app';
      const testPassword = 'testuser123';
      
      // Try to sign in first
      let result = await localAuth.signInWithPassword(testEmail, testPassword);
      
      // If sign in fails, try to sign up
      if (result.error) {
        console.debug("DEBUG: Sign in failed, attempting sign up");
        result = await localAuth.signUp(testEmail, testPassword);
        
        if (result.error) {
          console.error("DEBUG: Sign up failed:", result.error);
          throw result.error;
        }
        
        // Create profile for new user with default display name
        if (result.data?.user) {
          await sqliteDB.upsertProfile(result.data.user.id, 'Test User');
          console.debug("DEBUG: Created profile for test user:", result.data.user.id);
        }
      }

      if (result.data?.user) {
        console.debug("DEBUG: Test user login successful");
        toast({
          title: "Logged in as test user",
          description: "You can now test the app",
        });
      }
    } catch (error: any) {
      console.error("DEBUG: Error in handleMockLogin:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create test session",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto space-y-8 text-center">
          {/* Logo */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">AI-Powered Training</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            Welcome to Your
            <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Running Journey
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            Sign in to get your personalized training plan and start achieving your running goals.
          </p>

          {/* Auth Buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              size="lg" 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            {/* Mock Login for Testing */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or for testing</span>
              </div>
            </div>

            <Button 
              size="lg" 
              variant="outline"
              onClick={handleMockLogin} 
              disabled={loading}
              className="w-full gap-2"
            >
              Continue as Test User
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
```

### 2. Update Plan Page

```typescript
// File: src/pages/Plan.tsx (Updated)

import { useState, useEffect } from "react";
import { LogOut, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import WorkoutCard from "@/components/plan/WorkoutCard";
import WorkoutModal from "@/components/plan/WorkoutModal";
import CalendarModal from "@/components/plan/CalendarModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { sqliteDB } from "@/integrations/sqlite/wrapper";
import { generateICS, downloadICS } from "@/utils/calendarExport";
import planBg from "@/assets/plan-page-bg.jpg";

const Plan = () => {
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    console.debug("DEBUG: Plan page mounted - checking auth and fetching workouts");
    // Check if user is logged in and fetch workouts
    if (!user && !authLoading) {
      console.debug("DEBUG: User not authenticated, redirecting to auth");
      navigate("/auth");
      return;
    }

    if (user) {
      console.debug("DEBUG: User authenticated, fetching workouts for user:", user.id);
      fetchWorkouts();
    }
  }, [user, authLoading, navigate]);

  const fetchWorkouts = async () => {
    console.debug("DEBUG: fetchWorkouts called for user:", user?.id);
    try {
      setLoading(true);
      
      const workoutsData = await sqliteDB.getWorkouts(user!.id);
      console.debug("DEBUG: Raw workouts from SQLite:", workoutsData);

      // Transform data to match component expectations
      const transformedWorkouts = workoutsData.map(w => {
        const scheduledDate = w.scheduled_date ? new Date(w.scheduled_date) : null;
        
        // Calculate intensity based on type
        let intensity = 3; // default
        const typeStr = w.type.toLowerCase();
        if (typeStr.includes('rest')) intensity = 1;
        if (typeStr.includes('easy') || typeStr.includes('recovery')) intensity = 2;
        if (typeStr.includes('tempo') || typeStr.includes('threshold')) intensity = 4;
        if (typeStr.includes('intervals') || typeStr.includes('speed')) intensity = 5;
        
        // Generate 5-7 word description from workout type
        let shortDesc = w.description;
        if (shortDesc.length > 50) {
          const words = shortDesc.split(' ').slice(0, 7).join(' ');
          shortDesc = words + '...';
        }
        
        return {
          id: w.id,
          title: w.title,
          type: w.type,
          description: shortDesc,
          fullDescription: w.description,
          duration: w.duration_minutes,
          distance: w.distance_km,
          scheduledDate,
          status: w.completed ? 'completed' : 'upcoming',
          day: w.day,
          intensity,
          completed: w.completed,
          warmup: w.warmup,
          mainSet: w.main_set,
          cooldown: w.cooldown,
          userNotes: w.user_notes,
          rating: w.rating,
        };
      });

      console.debug("DEBUG: Transformed workouts:", transformedWorkouts);
      setWorkouts(transformedWorkouts);
    } catch (error) {
      console.error('DEBUG: Error fetching workouts:', error);
      toast({
        variant: "destructive",
        title: "Error loading workouts",
        description: "Please try refreshing the page",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = () => {
    console.debug("DEBUG: handleEditPlan called");
    navigate("/coach-selection");
  };

  const handleExportToCalendar = () => {
    console.debug("DEBUG: handleExportToCalendar called with", workouts.length, "workouts");
    try {
      const calendarEvents = workouts.map(w => ({
        title: w.title,
        description: w.description || w.fullDescription || '',
        duration: w.duration || 30,
        distance: w.distance,
        scheduledDate: w.scheduledDate instanceof Date 
          ? w.scheduledDate.toISOString().split('T')[0]
          : w.scheduledDate ? new Date(w.scheduledDate).toISOString().split('T')[0] : '',
        type: w.type,
        intensity: w.intensity,
      }));

      const icsContent = generateICS(calendarEvents);
      downloadICS(icsContent);

      toast({
        title: "Calendar exported! 🗓️",
        description: "Your workouts have been downloaded. Import the file to your calendar app.",
      });
    } catch (error) {
      console.error('DEBUG: Error exporting calendar:', error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not export calendar. Please try again.",
      });
    }
  };

  const { signOut } = useAuth();

  const handleLogout = async () => {
    console.debug("DEBUG: handleLogout called");
    await signOut();
    navigate("/");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div 
      className="min-h-screen h-screen relative bg-cover bg-center bg-fixed overflow-hidden"
      style={{ backgroundImage: `url(${planBg})` }}
    >
      {/* Overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80 backdrop-blur-[2px]" />

      {/* Content Container - Scrollable */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Minimal Header - Fixed at top with blur */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-5 backdrop-blur-md bg-black/20">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCalendarModal(true)}
            className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 hover:border-blue-400/40 transition-all"
          >
            <CalendarPlus className="w-4 h-4 text-blue-400" />
            Add to Calendar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEditPlan}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            Edit Plan
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Workout List - Scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 space-y-5 max-w-3xl pb-10">
            {loading ? (
              <div className="text-center py-12 text-white/80">Loading workouts...</div>
            ) : workouts.length === 0 ? (
              <div className="text-center py-12 text-white/80">No workouts found</div>
            ) : (
              workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onClick={async () => {
                    console.debug("DEBUG: Workout card clicked, fetching details for:", workout.id);
                    const workoutDetails = await sqliteDB.getWorkouts(user!.id);
                    const workoutDetail = workoutDetails.find(w => w.id === workout.id);

                    if (workoutDetail) {
                      console.debug("DEBUG: Workout detail found:", workoutDetail);
                      setSelectedWorkout(workoutDetail);
                    } else {
                      // Fallback to card data mapped to modal shape
                      const fallbackDate = workout.scheduledDate instanceof Date
                        ? workout.scheduledDate.toISOString().slice(0,10)
                        : undefined;
                      console.debug("DEBUG: Workout detail not found, using fallback:", fallbackDate);
                      setSelectedWorkout({
                        id: workout.id,
                        title: workout.title,
                        type: workout.type,
                        description: workout.fullDescription || workout.description || '',
                        warmup: workout.warmup,
                        main_set: workout.mainSet,
                        cooldown: workout.cooldown,
                        duration_minutes: workout.duration,
                        distance_km: workout.distance,
                        scheduled_date: fallbackDate,
                        completed: !!workout.completed,
                        rating: workout.rating ?? null,
                        user_notes: workout.userNotes ?? null,
                      });
                    }
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Workout Modal */}
      {selectedWorkout && (
        <WorkoutModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onUpdate={fetchWorkouts}
        />
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <CalendarModal
          onClose={() => setShowCalendarModal(false)}
          onExportICS={handleExportToCalendar}
          workoutCount={workouts.length}
        />
      )}
    </div>
  );
};

export default Plan;
```

### 3. Update Journal Page

```typescript
// File: src/pages/Journal.tsx (Updated)

import { useState, useEffect } from "react";
import { Calendar, Book, TrendingUp, Clock, MapPin, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sqliteDB } from "@/integrations/sqlite/wrapper";
import { format } from "date-fns";

const tabs = ["7 days", "30 days", "All", "Custom"];

const stats = [
  { label: "Total Workouts", value: "12", change: "+10%", icon: Calendar },
  { label: "Total Distance", value: "56.6 km", change: "+5%", icon: MapPin },
  { label: "Total Time", value: "4h 15m", change: "+8%", icon: Clock },
  { label: "Avg. Effort", value: "3.2", change: "+2%", icon: Star },
];

const Journal = () => {
  const [activeTab, setActiveTab] = useState("7 days");
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    console.debug("DEBUG: Journal page mounted - checking auth and fetching completed workouts");
    // Check if user is logged in and fetch workouts
    if (!user && !authLoading) {
      console.debug("DEBUG: User not authenticated, redirecting to auth");
      navigate("/auth");
      return;
    }

    if (user) {
      console.debug("DEBUG: User authenticated, fetching completed workouts for user:", user.id);
      fetchCompletedWorkouts();
    }
  }, [user, authLoading, navigate]);

  const fetchCompletedWorkouts = async () => {
    console.debug("DEBUG: fetchCompletedWorkouts called for user:", user?.id);
    try {
      setLoading(true);
      const completedWorkoutsData = await sqliteDB.getCompletedWorkouts(user!.id);
      console.debug("DEBUG: Completed workouts from SQLite:", completedWorkoutsData);

      // Transform data to match component expectations
      const transformedWorkouts = completedWorkoutsData.map(w => ({
        ...w,
        scheduledDate: w.scheduled_date ? new Date(w.scheduled_date) : null,
        scheduledDateStr: w.scheduled_date ? format(new Date(w.scheduled_date), 'MMM d, yyyy') : 'Unknown Date'
      }));

      console.debug("DEBUG: Transformed completed workouts:", transformedWorkouts);
      setCompletedWorkouts(transformedWorkouts);
    } catch (error) {
      console.error('DEBUG: Error fetching completed workouts:', error);
      toast({
        variant: "destructive",
        title: "Error loading completed workouts",
        description: "Please try refreshing the page",
      });
    } finally {
      setLoading(false);
    }
  };

  const { signOut } = useAuth();

  const handleLogout = async () => {
    console.debug("DEBUG: handleLogout called");
    await signOut();
    navigate("/");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-display font-bold">Your Training Journal</h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="whitespace-nowrap rounded-full"
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card rounded-lg p-4 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-2xl font-display font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-success" />
                  <span className="text-xs text-success font-medium">{stat.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed Workouts */}
        <div className="space-y-3">
          <h2 className="text-lg font-display font-semibold">Completed Workouts</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : completedWorkouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed workouts yet. Complete your first workout to see it here!
            </div>
          ) : (
            completedWorkouts.map((workout) => {
              const getEmoji = (type: string) => {
                if (type === 'easy_run') return '🏃';
                if (type === 'tempo_run') return '⚡';
                if (type === 'intervals') return '🔥';
                if (type === 'long_run') return '🏃‍♀️';
                if (type === 'strength') return '💪';
                return '🏃';
              };

              const pace = workout.distance_km && workout.duration_minutes
                ? (workout.duration_minutes / workout.distance_km).toFixed(2)
                : null;

              return (
                <div key={workout.id} className="bg-card rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)
                    }
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{getEmoji(workout.type)}</div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          {workout.scheduledDateStr?.toUpperCase()}
                        </p>
                        <h3 className="font-display font-semibold">{workout.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {workout.distance_km && <span>{workout.distance_km} km</span>}
                          {workout.duration_minutes && (
                            <>
                              {workout.distance_km && <span>·</span>}
                              <span>{workout.duration_minutes} min</span>
                            </>
                          )}
                          {pace && (
                            <>
                              <span>·</span>
                              <span>{pace} /km</span>
                            </>
                          )}
                        </div>
                        {workout.rating && (
                          <div className="mt-2">
                            <span className="text-xs font-semibold text-primary">
                              Effort: {workout.rating === 1 ? 'Easy' : 
                                      workout.rating === 2 ? 'Light' : 
                                      workout.rating === 3 ? 'Moderate' : 
                                      workout.rating === 4 ? 'Hard' : 'Very Hard'}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-2xl">
                        {expandedWorkout === workout.id ? "−" : "+"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedWorkout === workout.id && workout.user_notes && (
                    <div className="px-4 pb-4 pt-2 border-t animate-fade-in">
                      <p className="text-sm text-muted-foreground italic">{workout.user_notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 py-4">
            <Link to="/plan">
              <Button variant="ghost" className="flex-col gap-1 h-auto w-full">
                <Calendar className="w-6 h-6" />
                <span className="text-xs font-medium">Plan</span>
              </Button>
            </Link>
            <Button variant="ghost" className="flex-col gap-1 h-auto">
              <Book className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-primary">Journal</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Journal;
```

## Testing and Verification

### 1. Testing Checklist

#### Authentication
- [ ] Google login button works and creates/updates profile
- [ ] Mock test user login works
- [ ] User is redirected to `/coach-selection` after login
- [ ] Logout button works and redirects to home page
- [ ] Non-authenticated users are redirected to `/auth` when accessing protected pages

#### Database Operations
- [ ] Profiles are created/updated in SQLite database
- [ ] Workouts are stored and retrieved from SQLite database
- [ ] Plans are stored and retrieved from SQLite database
- [ ] Data persists across page refreshes using localStorage

#### Functionality
- [ ] Plan page loads and displays workouts
- [ ] Workout cards display correctly
- [ ] Journal page loads and displays completed workouts
- [ ] Calendar export works correctly

### 2. Debugging and Verification Code

Add these debugging utilities to your application:

```typescript
// File: src/utils/debugUtils.ts

export class DebugUtils {
  static logAuthStateChange(user: any) {
    console.group("=== AUTH STATE CHANGE ===");
    console.log("New user state:", user ? user.id : null);
    console.log("Timestamp:", new Date().toISOString());
    console.groupEnd();
  }

  static logDatabaseOperation(operation: string, details: any) {
    console.group(`=== DB OPERATION: ${operation} ===`);
    console.log("Details:", details);
    console.log("Timestamp:", new Date().toISOString());
    console.groupEnd();
  }

  static logAPICall(endpoint: string, method: string, data?: any) {
    console.group(`=== API CALL: ${method} ${endpoint} ===`);
    if (data) console.log("Data sent:", data);
    console.log("Timestamp:", new Date().toISOString());
    console.groupEnd();
  }

  static logUserData(userId: string, action: string) {
    console.group(`=== USER DATA: ${action} for userId ${userId} ===`);
    console.log("Action:", action);
    console.log("Timestamp:", new Date().toISOString());
    console.groupEnd();
  }
}
```

## Debugging Prints and Steps

### 1. Migration Steps with Debugging

**Step 1: Update package.json**
```bash
# Add SQLite dependencies
npm install sql.js
npm install --save-dev @types/sql.js
```

**Step 2: Create SQLite wrapper with debugging**
- The wrapper logs all operations to console for debugging
- Each method provides detailed status information
- Error handling includes detailed error messages

**Step 3: Update authentication system**
- Local authentication service with detailed logging
- Session management with localStorage
- Profile creation and updating with debugging output

**Step 4: Update all database operations**
- Replace every `supabase` call with `sqliteDB` calls
- Add debugging logs to each database operation
- Maintain same interface but with SQLite implementation

**Step 5: Test each page**
- Verify authentication flow works
- Check that data is properly stored and retrieved
- Confirm that all features work as expected

### 2. Key Debugging Print Locations

Add these console.log statements at key points in your code:

```typescript
// In AuthContext
console.debug("DEBUG: AuthProvider mounted - initializing session");

// In database operations
console.debug("DEBUG: Fetching workouts for user ID:", userId);

// In authentication functions
console.debug("DEBUG: Google sign in completed successfully");

// In data transformations
console.debug("DEBUG: Transformed workouts:", transformedWorkouts);

// In navigation logic
console.debug("DEBUG: User not authenticated, redirecting to auth");
```

### 3. Verification Steps

To verify the migration is successful:

1. **Clean start**: Clear all browser storage before testing
2. **Create new user**: Test the sign-up/sign-in flow
3. **Create data**: Add workouts and verify they're stored
4. **Page navigation**: Navigate between pages and ensure data persists
5. **Logout/login**: Log out and log back in to verify session handling
6. **Data integrity**: Check that all fields are properly stored and retrieved

This migration guide provides a comprehensive approach to replacing Supabase with a local SQLite database while maintaining all functionality and adding detailed debugging information to help track the application's behavior during and after the migration.