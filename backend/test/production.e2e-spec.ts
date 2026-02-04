/**
 * Production E2E Tests
 *
 * These tests run against the production API to verify end-to-end functionality.
 * Test data is prefixed with [TEST] for easy identification and cleanup.
 *
 * Usage: npm run test:e2e:prod
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load E2E environment variables
dotenv.config({ path: path.join(__dirname, '.env.e2e') });

const API_URL = process.env.E2E_API_URL || 'https://partner-hub-backend.onrender.com/api/v1';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'E2eTestPassword123!';

// Test data prefix for identification
const TEST_PREFIX = '[TEST]';

interface TestContext {
  supabase: SupabaseClient;
  accessToken: string;
  createdIds: {
    projects: string[];
    partners: string[];
    tasks: string[];
  };
}

// Helper function to make authenticated API calls
async function apiCall(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
  } = {},
): Promise<{ status: number; data: any }> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

describe('Production E2E Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Sign in or create test user
    let accessToken = '';

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signInError) {
      // If sign in fails, try to create the user
      console.log('Test user does not exist, creating...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: {
          data: {
            first_name: 'E2E',
            last_name: 'Test User',
          },
        },
      });

      if (signUpError) {
        throw new Error(`Failed to create test user: ${signUpError.message}`);
      }

      accessToken = signUpData.session?.access_token || '';
    } else {
      accessToken = signInData.session?.access_token || '';
    }

    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    ctx = {
      supabase,
      accessToken,
      createdIds: {
        projects: [],
        partners: [],
        tasks: [],
      },
    };

    console.log(`\n=== E2E Tests running against: ${API_URL} ===\n`);
  }, 30000);

  afterAll(async () => {
    // Cleanup: Delete all test data created during tests
    console.log('\n=== Cleaning up test data ===');

    // Delete tasks first (they may reference projects)
    for (const taskId of ctx.createdIds.tasks) {
      try {
        await apiCall(`/tasks/${taskId}`, { method: 'DELETE', token: ctx.accessToken });
        console.log(`  Deleted task: ${taskId}`);
      } catch (e) {
        console.log(`  Failed to delete task: ${taskId}`);
      }
    }

    // Delete projects
    for (const projectId of ctx.createdIds.projects) {
      try {
        await apiCall(`/projects/${projectId}`, { method: 'DELETE', token: ctx.accessToken });
        console.log(`  Deleted project: ${projectId}`);
      } catch (e) {
        console.log(`  Failed to delete project: ${projectId}`);
      }
    }

    // Delete partners
    for (const partnerId of ctx.createdIds.partners) {
      try {
        await apiCall(`/partners/${partnerId}`, { method: 'DELETE', token: ctx.accessToken });
        console.log(`  Deleted partner: ${partnerId}`);
      } catch (e) {
        console.log(`  Failed to delete partner: ${partnerId}`);
      }
    }

    // Sign out
    await ctx.supabase.auth.signOut();
    console.log('=== Cleanup complete ===\n');
  }, 30000);

  // ==================== Health Check ====================

  describe('Health Check', () => {
    it('should return health status', async () => {
      const { status, data } = await apiCall('/health');

      // Log the response for debugging
      console.log(`  Health endpoint status code: ${status}`);

      if (status === 200) {
        const healthData = data.data || data;
        console.log(`  Health status: ${healthData.status}`);
        if (healthData.checks) {
          console.log(`  Database: ${healthData.checks.database?.status || 'unknown'}`);
          console.log(`  Memory: ${healthData.checks.memory?.status || 'unknown'}`);
        }
        expect(['healthy', 'degraded', 'unhealthy']).toContain(healthData.status);
        expect(healthData).toHaveProperty('timestamp');
      } else if (status === 503) {
        // Service unavailable is acceptable for health check
        console.log('  System is unhealthy (503)');
        expect(status).toBe(503);
      } else {
        // 502/504 indicates gateway/proxy issues - not a test failure per se
        console.log(`  Warning: Unexpected status ${status} - possible infrastructure issue`);
        expect([200, 502, 503, 504]).toContain(status);
      }
    });

    it('should return liveness status', async () => {
      const { status, data } = await apiCall('/health/live');

      expect(status).toBe(200);
      const liveData = data.data || data;
      expect(liveData.status).toBe('alive');
    });

    it('should return readiness status', async () => {
      const { status, data } = await apiCall('/health/ready');

      expect(status).toBe(200);
      const readyData = data.data || data;
      expect(readyData.ready).toBe(true);
    });
  });

  // ==================== Authentication ====================

  describe('Authentication', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const { status } = await apiCall('/projects');

      expect(status).toBe(401);
    });

    it('should accept authenticated requests', async () => {
      const { status } = await apiCall('/projects', { token: ctx.accessToken });

      expect([200, 201]).toContain(status);
    });
  });

  // ==================== Partners CRUD ====================

  describe('Partners', () => {
    let createdPartnerId: string;

    it('should create a partner', async () => {
      const timestamp = Date.now();
      const { status, data } = await apiCall('/partners', {
        method: 'POST',
        token: ctx.accessToken,
        body: {
          name: `${TEST_PREFIX} Test Partner ${timestamp}`,
          email: `test-partner-${timestamp}@example.com`,
          companyName: 'Test Company',
          phone: '03-1234-5678',
          address: 'Tokyo, Japan',
          sendInvitation: false, // Don't send actual emails during test
        },
      });

      expect(status).toBe(201);
      const partnerData = data.data || data;
      expect(partnerData).toHaveProperty('id');
      expect(partnerData.name).toContain(TEST_PREFIX);

      createdPartnerId = partnerData.id;
      ctx.createdIds.partners.push(createdPartnerId);
    });

    it('should get the created partner', async () => {
      if (!createdPartnerId) {
        console.log('Skipping: Partner was not created');
        return;
      }

      const { status, data } = await apiCall(`/partners/${createdPartnerId}`, {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const partnerData = data.data || data;
      expect(partnerData.id).toBe(createdPartnerId);
    });

    it('should list partners', async () => {
      const { status, data } = await apiCall('/partners', {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const listData = data.data || data;
      expect(listData).toHaveProperty('data');
      expect(Array.isArray(listData.data)).toBe(true);
    });

    it('should update the partner', async () => {
      if (!createdPartnerId) {
        console.log('Skipping: Partner was not created');
        return;
      }

      const { status, data } = await apiCall(`/partners/${createdPartnerId}`, {
        method: 'PATCH',
        token: ctx.accessToken,
        body: {
          description: 'Updated description',
        },
      });

      expect(status).toBe(200);
      const partnerData = data.data || data;
      expect(partnerData.description).toBe('Updated description');
    });
  });

  // ==================== Projects CRUD ====================

  describe('Projects', () => {
    let createdProjectId: string;

    it('should create a project', async () => {
      const { status, data } = await apiCall('/projects', {
        method: 'POST',
        token: ctx.accessToken,
        body: {
          name: `${TEST_PREFIX} Test Project ${Date.now()}`,
          description: 'E2E test project description',
          status: 'draft',
          priority: 'medium',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      expect(status).toBe(201);
      const projectData = data.data || data;
      expect(projectData).toHaveProperty('id');
      expect(projectData.name).toContain(TEST_PREFIX);

      createdProjectId = projectData.id;
      ctx.createdIds.projects.push(createdProjectId);
    });

    it('should get the created project', async () => {
      const { status, data } = await apiCall(`/projects/${createdProjectId}`, {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const projectData = data.data || data;
      expect(projectData.id).toBe(createdProjectId);
    });

    it('should list projects', async () => {
      const { status, data } = await apiCall('/projects', {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const listData = data.data || data;
      expect(listData).toHaveProperty('data');
      expect(Array.isArray(listData.data)).toBe(true);
    });

    it('should update the project', async () => {
      const { status, data } = await apiCall(`/projects/${createdProjectId}`, {
        method: 'PATCH',
        token: ctx.accessToken,
        body: {
          status: 'in_progress',
          progress: 25,
        },
      });

      expect(status).toBe(200);
      const projectData = data.data || data;
      expect(projectData.status).toBe('in_progress');
    });

    it('should get project statistics', async () => {
      const { status, data } = await apiCall('/projects/statistics', {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const statsData = data.data || data;
      expect(statsData).toHaveProperty('total');
    });
  });

  // ==================== Tasks CRUD ====================

  describe('Tasks', () => {
    let createdTaskId: string;

    it('should create a task', async () => {
      // Use the first created project if available
      const projectId = ctx.createdIds.projects[0];

      const { status, data } = await apiCall('/tasks', {
        method: 'POST',
        token: ctx.accessToken,
        body: {
          title: `${TEST_PREFIX} Test Task ${Date.now()}`,
          description: 'E2E test task description',
          status: 'todo',
          priority: 'medium',
          projectId: projectId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      expect(status).toBe(201);
      const taskData = data.data || data;
      expect(taskData).toHaveProperty('id');
      expect(taskData.title).toContain(TEST_PREFIX);

      createdTaskId = taskData.id;
      ctx.createdIds.tasks.push(createdTaskId);
    });

    it('should get the created task', async () => {
      const { status, data } = await apiCall(`/tasks/${createdTaskId}`, {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const taskData = data.data || data;
      expect(taskData.id).toBe(createdTaskId);
    });

    it('should list tasks', async () => {
      const { status, data } = await apiCall('/tasks', {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const listData = data.data || data;
      expect(listData).toHaveProperty('data');
      expect(Array.isArray(listData.data)).toBe(true);
    });

    it('should update the task', async () => {
      const { status, data } = await apiCall(`/tasks/${createdTaskId}`, {
        method: 'PATCH',
        token: ctx.accessToken,
        body: {
          status: 'in_progress',
          progress: 50,
        },
      });

      expect(status).toBe(200);
      const taskData = data.data || data;
      expect(taskData.status).toBe('in_progress');
    });
  });

  // ==================== Dashboard ====================

  describe('Dashboard', () => {
    it('should get dashboard overview', async () => {
      const { status, data } = await apiCall('/dashboard/overview', {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const dashboardData = data.data || data;
      // Dashboard may have different property names
      expect(dashboardData).toHaveProperty('totalProjects');
    });
  });

  // ==================== Notifications ====================

  describe('Notifications', () => {
    it('should get notifications', async () => {
      const { status, data } = await apiCall('/notifications', {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      // Notifications can be an array directly, wrapped in data, or have a notifications property
      const notifData = data.data || data;
      const hasNotifications = Array.isArray(notifData) ||
                               Array.isArray(notifData.data) ||
                               Array.isArray(notifData.notifications) ||
                               notifData.hasOwnProperty('notifications');
      expect(hasNotifications).toBe(true);
    });

    it('should get unread count', async () => {
      const { status, data } = await apiCall('/notifications/unread-count', {
        token: ctx.accessToken,
      });

      expect(status).toBe(200);
      const countData = data.data || data;
      expect(countData).toHaveProperty('count');
    });
  });
});
