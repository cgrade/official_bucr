import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Import after mocking
import { menuApi, galleryApi, reviewsApi, settingsApi, guestsApi } from '@/lib/api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('menuApi', () => {
    it('should have getItems function', () => {
      expect(menuApi.getItems).toBeDefined();
      expect(typeof menuApi.getItems).toBe('function');
    });

    it('should have createItem function', () => {
      expect(menuApi.createItem).toBeDefined();
      expect(typeof menuApi.createItem).toBe('function');
    });

    it('should have updateItem function', () => {
      expect(menuApi.updateItem).toBeDefined();
      expect(typeof menuApi.updateItem).toBe('function');
    });

    it('should have deleteItem function', () => {
      expect(menuApi.deleteItem).toBeDefined();
      expect(typeof menuApi.deleteItem).toBe('function');
    });
  });

  describe('galleryApi', () => {
    it('should have getAll function', () => {
      expect(galleryApi.getAll).toBeDefined();
      expect(typeof galleryApi.getAll).toBe('function');
    });

    it('should have upload function', () => {
      expect(galleryApi.upload).toBeDefined();
      expect(typeof galleryApi.upload).toBe('function');
    });

    it('should have update function', () => {
      expect(galleryApi.update).toBeDefined();
      expect(typeof galleryApi.update).toBe('function');
    });

    it('should have delete function', () => {
      expect(galleryApi.delete).toBeDefined();
      expect(typeof galleryApi.delete).toBe('function');
    });

    it('should have setFeatured function', () => {
      expect(galleryApi.setFeatured).toBeDefined();
      expect(typeof galleryApi.setFeatured).toBe('function');
    });
  });

  describe('reviewsApi', () => {
    it('should have getAll function', () => {
      expect(reviewsApi.getAll).toBeDefined();
      expect(typeof reviewsApi.getAll).toBe('function');
    });

    it('should have getStats function', () => {
      expect(reviewsApi.getStats).toBeDefined();
      expect(typeof reviewsApi.getStats).toBe('function');
    });

    it('should have respond function', () => {
      expect(reviewsApi.respond).toBeDefined();
      expect(typeof reviewsApi.respond).toBe('function');
    });

    it('should have report function', () => {
      expect(reviewsApi.report).toBeDefined();
      expect(typeof reviewsApi.report).toBe('function');
    });
  });

  describe('settingsApi', () => {
    it('should have getProfile function', () => {
      expect(settingsApi.getProfile).toBeDefined();
      expect(typeof settingsApi.getProfile).toBe('function');
    });

    it('should have updateProfile function', () => {
      expect(settingsApi.updateProfile).toBeDefined();
      expect(typeof settingsApi.updateProfile).toBe('function');
    });

    it('should have updateLogo function', () => {
      expect(settingsApi.updateLogo).toBeDefined();
      expect(typeof settingsApi.updateLogo).toBe('function');
    });

    it('should have getHours function', () => {
      expect(settingsApi.getHours).toBeDefined();
      expect(typeof settingsApi.getHours).toBe('function');
    });

    it('should have updateHours function', () => {
      expect(settingsApi.updateHours).toBeDefined();
      expect(typeof settingsApi.updateHours).toBe('function');
    });

    it('should have getNotifications function', () => {
      expect(settingsApi.getNotifications).toBeDefined();
      expect(typeof settingsApi.getNotifications).toBe('function');
    });

    it('should have updateNotifications function', () => {
      expect(settingsApi.updateNotifications).toBeDefined();
      expect(typeof settingsApi.updateNotifications).toBe('function');
    });

    it('should have changePassword function', () => {
      expect(settingsApi.changePassword).toBeDefined();
      expect(typeof settingsApi.changePassword).toBe('function');
    });
  });

  describe('guestsApi', () => {
    it('should have getAll function', () => {
      expect(guestsApi.getAll).toBeDefined();
      expect(typeof guestsApi.getAll).toBe('function');
    });

    it('should have getById function', () => {
      expect(guestsApi.getById).toBeDefined();
      expect(typeof guestsApi.getById).toBe('function');
    });

    it('should have updateNotes function', () => {
      expect(guestsApi.updateNotes).toBeDefined();
      expect(typeof guestsApi.updateNotes).toBe('function');
    });
  });
});
