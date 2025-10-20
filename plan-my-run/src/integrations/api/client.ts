// src/integrations/api/client.ts

import { Preferences } from '@capacitor/preferences';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class ApiClient {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const { value } = await Preferences.get({ key: 'authToken' });
    const token = value || localStorage.getItem('authToken');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  // Profiles API
  async getProfile(userId: string) {
    console.debug("DEBUG: Fetching profile for user ID:", userId);
    return this.request(`/api/profiles/${userId}`);
  }

  async createOrUpdateProfile(userId: string, displayName: string) {
    console.debug(`DEBUG: Creating/updating profile for user: ${userId}, display name: ${displayName}`);
    return this.request('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, display_name: displayName }),
    });
  }

  // Plans API
  async getPlans(userId: string) {
    console.debug("DEBUG: Fetching plans for user ID:", userId);
    return this.request(`/api/plans/${userId}`);
  }

  async hasPlan(userId: string): Promise<{ hasPlan: boolean }> {
    console.debug("DEBUG: Checking if plan exists for user ID:", userId);
    return this.request(`/api/plans/exists/${userId}`);
  }

  async createPlan(planData: any) {
    console.debug("DEBUG: Creating plan with data:", planData);
    return this.request('/api/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  // Workouts API
  async getWorkouts(userId: string) {
    console.debug("DEBUG: Fetching workouts for user ID:", userId);
    return this.request(`/api/workouts/${userId}`);
  }

  async getCompletedWorkouts(userId: string) {
    console.debug("DEBUG: Fetching completed workouts for user ID:", userId);
    return this.request(`/api/workouts/completed/${userId}`);
  }

  async createWorkout(workoutData: any) {
    console.debug("DEBUG: Creating workout with data:", workoutData);
    return this.request('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(workoutData),
    });
  }

  async updateWorkout(workoutId: string, updates: any) {
    console.debug("DEBUG: Updating workout with ID:", workoutId, "with data:", updates);
    return this.request(`/api/workouts/${workoutId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // AI Plan Generation API
  async generatePlanWithAI(userData: any) {
    console.debug("DEBUG: Generating plan with AI using data:", userData);
    return this.request('/api/generate-plan', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Reset User Data API
  async resetUserData() {
    console.debug("DEBUG: Resetting user data");
    return this.request('/api/reset-user-data', {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();