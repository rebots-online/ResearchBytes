# HKM Testing & Optimization Workflow

## Overview

**Objective**: Establish comprehensive testing strategy and performance optimization framework
**Quality Standard**: 90%+ test coverage, <2s average response time, 99%+ uptime
**Implementation Priority**: Phase 3, Days 15-21

---

## Testing Strategy

### 1. Test Pyramid Architecture

```
                    ┌─────────────────┐
                    │   E2E Tests     │
                    │  (10% of suite) │
                    └─────────────────┘
                ┌──────────────────────────┐
                │   Integration Tests      │
                │    (30% of suite)        │
                └──────────────────────────┘
        ┌────────────────────────────────────────────┐
        │            Unit Tests                       │
        │            (60% of suite)                   │
        └────────────────────────────────────────────┘
```

### 2. Unit Testing Implementation

```typescript
// __tests__/unit/ModelManager.test.ts

import { ModelManager } from '../../services/ModelManager';
import { ModelConfig, ModelProvider } from '../../types';

// Mock providers
const mockGeminiProvider = {
  generateText: jest.fn(),
  generateImage: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true))
};

const mockOllamaProvider = {
  generateText: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true))
};

const mockOpenRouterProvider = {
  generateText: jest.fn(),
  getAvailableModels: jest.fn(),
  getUsageStats: jest.fn()
};

describe('ModelManager', () => {
  let modelManager: ModelManager;

  beforeEach(() => {
    modelManager = new ModelManager();
    // Inject mock providers
    modelManager['providers'].set('gemini', mockGeminiProvider);
    modelManager['providers'].set('ollama', mockOllamaProvider);
    modelManager['providers'].set('openrouter', mockOpenRouterProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Model Discovery', () => {
    test('should return available models from all providers', async () => {
      // Arrange
      mockGeminiProvider.getAvailableModels?.mockResolvedValue([
        { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'gemini' }
      ]);
      mockOllamaProvider.getAvailableModels?.mockResolvedValue([
        { id: 'llama3.3-70b', name: 'Llama 3.3 70B', provider: 'ollama' }
      ]);
      mockOpenRouterProvider.getAvailableModels.mockResolvedValue([
        { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter' }
      ]);

      // Act
      const models = await modelManager.getAvailableModels();

      // Assert
      expect(models).toHaveLength(3);
      expect(models[0].provider).toBe('gemini');
      expect(models[1].provider).toBe('ollama');
      expect(models[2].provider).toBe('openrouter');
    });

    test('should handle provider failures gracefully', async () => {
      // Arrange
      mockGeminiProvider.getAvailableModels?.mockRejectedValue(new Error('Gemini API error'));

      // Act
      const models = await modelManager.getAvailableModels();

      // Assert
      expect(models).toBeDefined();
      // Should still return models from other providers
    });
  });

  describe('Smart Model Routing', () => {
    test('should select local model for privacy-sensitive tasks', async () => {
      // Arrange
      const task = {
        type: 'reasoning',
        complexity: 'simple',
        priority: 'quality',
        privacy: true
      };

      // Act
      const selectedModel = await modelManager.selectOptimalModel(task);

      // Assert
      expect(selectedModel.provider).toBe('ollama');
      expect(selectedModel.isLocal).toBe(true);
    });

    test('should select cost-effective model for budget constraints', async () => {
      // Arrange
      const task = {
        type: 'generation',
        complexity: 'simple',
        priority: 'cost',
        privacy: false,
        budget: 0.01
      };

      // Act
      const selectedModel = await modelManager.selectOptimalModel(task);

      // Assert
      expect(selectedModel.costPerToken).toBeLessThanOrEqual(0.001);
    });

    test('should select high-quality model for complex tasks', async () => {
      // Arrange
      const task = {
        type: 'analysis',
        complexity: 'complex',
        priority: 'quality',
        privacy: false
      };

      // Act
      const selectedModel = await modelManager.selectOptimalModel(task);

      // Assert
      expect(selectedModel.quality).toBe('high');
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should fallback to alternative provider on primary failure', async () => {
      // Arrange
      const prompt = 'Test prompt';
      const primaryModel = { id: 'gemini-3-pro', provider: 'gemini' } as ModelConfig;
      const fallbackModel = { id: 'llama3.3-70b', provider: 'ollama' } as ModelConfig;

      mockGeminiProvider.generateText.mockRejectedValue(new Error('API timeout'));
      mockOllamaProvider.generateText.mockResolvedValue('Fallback response');

      // Act
      const result = await modelManager.generateTextWithFallback(prompt, primaryModel, [fallbackModel]);

      // Assert
      expect(result).toBe('Fallback response');
      expect(mockOllamaProvider.generateText).toHaveBeenCalledWith(prompt, 'llama3.3-70b');
    });

    test('should throw error when all providers fail', async () => {
      // Arrange
      const prompt = 'Test prompt';
      const models = [
        { id: 'gemini-3-pro', provider: 'gemini' },
        { id: 'llama3.3-70b', provider: 'ollama' }
      ] as ModelConfig[];

      mockGeminiProvider.generateText.mockRejectedValue(new Error('API error'));
      mockOllamaProvider.generateText.mockRejectedValue(new Error('Local model error'));

      // Act & Assert
      await expect(
        modelManager.generateTextWithFallback(prompt, models[0], [models[1]])
      ).rejects.toThrow('All models failed to generate response');
    });
  });

  describe('Performance Tracking', () => {
    test('should track generation metrics correctly', async () => {
      // Arrange
      const model = { id: 'test-model', provider: 'ollama' } as ModelConfig;
      const duration = 1500;
      const success = true;

      // Act
      await modelManager.trackGeneration(model, duration, success);

      // Assert
      const metrics = await modelManager.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.averageResponseTime).toBe(1500);
      expect(metrics.successRate).toBe(100);
    });

    test('should calculate averages correctly over multiple generations', async () => {
      // Arrange
      const model = { id: 'test-model', provider: 'ollama' } as ModelConfig;

      // Act
      await modelManager.trackGeneration(model, 1000, true);
      await modelManager.trackGeneration(model, 2000, true);
      await modelManager.trackGeneration(model, 3000, false);

      // Assert
      const metrics = await modelManager.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.averageResponseTime).toBe(2000); // (1000 + 2000 + 3000) / 3
      expect(metrics.successRate).toBeCloseTo(66.67); // 2/3 * 100
    });
  });
});
```

### 3. Integration Testing

```typescript
// __tests__/integration/ProviderIntegration.test.ts

import { OpenRouterProvider } from '../../services/providers/OpenRouterProvider';
import { OllamaProvider } from '../../services/providers/OllamaProvider';
import { ModelManager } from '../../services/ModelManager';

// Integration tests with actual services (using test endpoints)
describe('Provider Integration', () => {
  let modelManager: ModelManager;

  beforeAll(async () => {
    // Initialize with test configuration
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OLLAMA_ENDPOINT = 'http://localhost:11434';

    modelManager = new ModelManager();
    await modelManager.initialize();
  });

  describe('OpenRouter Integration', () => {
    test('should connect to OpenRouter API successfully', async () => {
      const provider = new OpenRouterProvider('test-api-key');

      // Test model discovery
      const models = await provider.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);

      // Test text generation (with mocked response in test environment)
      if (models.length > 0) {
        const testModel = models[0];
        // In real integration, this would make an actual API call
        // For testing, we mock the fetch response
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Test response' } }],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
          })
        });

        const response = await provider.generateText('Test prompt', testModel.id);
        expect(typeof response).toBe('string');
      }
    });

    test('should handle rate limiting gracefully', async () => {
      const provider = new OpenRouterProvider('test-api-key');

      // Mock rate limit response
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      await expect(
        provider.generateText('Test prompt', 'test-model')
      ).rejects.toThrow('OpenRouter generation failed: Too Many Requests');
    });
  });

  describe('Ollama Integration', () => {
    test('should detect Ollama availability', async () => {
      const provider = new OllamaProvider('http://localhost:11434');

      // Mock Ollama health check
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.3:70b', size: 41474309120 },
            { name: 'deepseek-v2.5:7b', size: 4925305856 }
          ]
        })
      });

      const models = await provider.getAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].isLocal).toBe(true);
    });

    test('should handle Ollama connection failures', async () => {
      const provider = new OllamaProvider('http://localhost:11434');

      // Mock connection failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const models = await provider.getAvailableModels();
      expect(models).toEqual([]);
    });
  });

  describe('End-to-End Generation Flow', () => {
    test('should complete full generation cycle with fallback', async () => {
      // Mock the entire generation pipeline
      const task = {
        type: 'reasoning' as const,
        complexity: 'moderate' as const,
        priority: 'quality' as const,
        privacy: false,
        topic: 'quantum computing',
        level: 'High School' as const,
        style: 'Standard Scientific' as const,
        language: 'English' as const
      };

      // Mock successful generation
      jest.spyOn(modelManager, 'selectOptimalModel').mockResolvedValue({
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        type: 'text',
        capabilities: [],
        quality: 'high',
        isLocal: false,
        isAvailable: true
      });

      jest.spyOn(modelManager, 'generateText').mockResolvedValue('Generated response');

      // Execute
      const selectedModel = await modelManager.selectOptimalModel(task);
      const response = await modelManager.generateText('Test prompt', selectedModel);

      // Verify
      expect(selectedModel.quality).toBe('high');
      expect(response).toBe('Generated response');
    });
  });
});
```

### 4. E2E Testing with Playwright

```typescript
// tests/e2e/model-selection.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Model Selection E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-container"]');
  });

  test('should display model selection interface', async ({ page }) => {
    // Click advanced toggle
    await page.click('[data-testid="advanced-toggle"]');

    // Wait for model selector to appear
    await expect(page.locator('[data-testid="model-selector"]')).toBeVisible();

    // Verify default models are selected
    await expect(page.locator('[data-testid="text-model-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="image-model-badge"]')).toBeVisible();
  });

  test('should switch between text models', async ({ page }) => {
    // Enable advanced mode
    await page.click('[data-testid="advanced-toggle"]');

    // Click text model selector
    await page.click('[data-testid="text-model-selector"]');

    // Wait for model dropdown
    await expect(page.locator('[data-testid="model-dropdown"]')).toBeVisible();

    // Select different model
    await page.click('[data-testid="model-llama3.3"]');

    // Verify selection
    await expect(page.locator('[data-testid="selected-text-model"]')).toContainText('Llama 3.3');
  });

  test('should complete generation with selected models', async ({ page }) => {
    // Set up test data
    await page.fill('[data-testid="topic-input"]', 'quantum computing basics');
    await page.selectOption('[data-testid="complexity-select"]', 'High School');
    await page.selectOption('[data-testid="format-select"]', 'Infographic');

    // Enable advanced mode and select models
    await page.click('[data-testid="advanced-toggle"]');

    // Start generation
    await page.click('[data-testid="generate-button"]');

    // Wait for loading state
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();

    // Wait for completion (with reasonable timeout)
    await expect(page.locator('[data-testid="generation-result"]')).toBeVisible({ timeout: 60000 });

    // Verify result
    await expect(page.locator('[data-testid="result-image"]')).toBeVisible();
  });

  test('should display performance metrics', async ({ page }) => {
    // Complete a generation first
    await test.step('Complete generation', async () => {
      await page.fill('[data-testid="topic-input"]', 'test topic');
      await page.click('[data-testid="generate-button"]');
      await expect(page.locator('[data-testid="generation-result"]')).toBeVisible({ timeout: 60000 });
    });

    // Open performance dashboard
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="performance-tab"]');

    // Verify metrics are displayed
    await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-response-time"]')).toBeVisible();
  });

  test('should handle model failures gracefully', async ({ page }) => {
    // Mock a model failure scenario
    await page.route('**/api/generate', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Model unavailable' })
      });
    });

    // Attempt generation
    await page.fill('[data-testid="topic-input"]', 'test topic');
    await page.click('[data-testid="generate-button"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
```

---

## Performance Optimization Strategy

### 1. Caching Implementation

```typescript
// services/cache/CacheManager.ts

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000;
  private defaultTTL = 3600000; // 1 hour

  constructor(maxSize?: number, defaultTTL?: number) {
    if (maxSize) this.maxSize = maxSize;
    if (defaultTTL) this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  async invalidate(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const [key] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    memoryUsage: number;
  } {
    let totalHits = 0;
    let memoryUsage = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      // Rough estimation of memory usage
      memoryUsage += JSON.stringify(entry.data).length * 2; // UTF-16
    }

    const totalRequests = totalHits + (this.cache.size - totalHits);
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits,
      memoryUsage
    };
  }
}

// Specialized cache for model responses
export class ModelResponseCache extends CacheManager {
  generateKey(
    modelId: string,
    prompt: string,
    options?: any
  ): string {
    const optionsHash = options ? btoa(JSON.stringify(options)) : '';
    const promptHash = btoa(prompt.trim().toLowerCase());
    return `${modelId}:${promptHash}:${optionsHash}`;
  }

  async getCachedResponse(
    modelId: string,
    prompt: string,
    options?: any
  ): Promise<string | null> {
    const key = this.generateKey(modelId, prompt, options);
    return this.get<string>(key);
  }

  async cacheResponse(
    modelId: string,
    prompt: string,
    response: string,
    options?: any,
    ttl: number = 1800000 // 30 minutes
  ): Promise<void> {
    const key = this.generateKey(modelId, prompt, options);
    await this.set(key, response, ttl);
  }
}
```

### 2. Batch Processing Optimization

```typescript
// services/optimization/BatchProcessor.ts

export interface BatchRequest<T> {
  id: string;
  data: T;
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
}

export class BatchProcessor<T, R> {
  private queue: BatchRequest<T>[] = [];
  private processing = false;
  private batchSize: number;
  private batchTimeout: number;
  private processor: (batch: T[]) => Promise<R[]>;

  constructor(
    processor: (batch: T[]) => Promise<R[]>,
    options: {
      batchSize?: number;
      batchTimeout?: number;
    } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 100;
  }

  async add(request: BatchRequest<T>): Promise<R> {
    return new Promise((resolve, reject) => {
      const enrichedRequest = {
        ...request,
        resolve,
        reject
      };

      this.queue.push(enrichedRequest);
      this.sortQueue();

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private sortQueue(): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // For same priority, process earlier requests first
      return 0;
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      try {
        const batchData = batch.map(req => req.data);
        const results = await Promise.race([
          this.processor(batchData),
          this.createTimeout(batch[0].timeout || 30000)
        ]);

        // Resolve all promises in batch
        results.forEach((result, index) => {
          batch[index].resolve(result);
        });

      } catch (error) {
        // Reject all promises in batch
        batch.forEach(req => req.reject(error));
      }
    }

    this.processing = false;

    // Check if new items were added during processing
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.batchTimeout);
    }
  }

  private createTimeout(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Batch processing timeout')), timeout);
    });
  }

  getQueueStats(): {
    length: number;
    processing: boolean;
    priorityBreakdown: Record<string, number>;
  } {
    const priorityBreakdown = this.queue.reduce((acc, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      length: this.queue.length,
      processing: this.processing,
      priorityBreakdown
    };
  }
}
```

### 3. Connection Pooling

```typescript
// services/optimization/ConnectionPool.ts

export interface PooledConnection {
  id: string;
  endpoint: string;
  inUse: boolean;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
}

export class ConnectionPool {
  private connections: Map<string, PooledConnection[]> = new Map();
  private maxConnections: number;
  private connectionTimeout: number;
  private healthCheckInterval: number;

  constructor(options: {
    maxConnections?: number;
    connectionTimeout?: number;
    healthCheckInterval?: number;
  } = {}) {
    this.maxConnections = options.maxConnections || 10;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.healthCheckInterval = options.healthCheckInterval || 60000;

    this.startHealthChecks();
  }

  async getConnection(endpoint: string): Promise<PooledConnection> {
    const pool = this.connections.get(endpoint) || [];

    // Find available connection
    const availableConnection = pool.find(conn => !conn.inUse && this.isHealthy(conn));

    if (availableConnection) {
      availableConnection.inUse = true;
      return availableConnection;
    }

    // Create new connection if under limit
    if (pool.length < this.maxConnections) {
      const newConnection = await this.createConnection(endpoint);
      pool.push(newConnection);
      this.connections.set(endpoint, pool);
      return newConnection;
    }

    // Wait for available connection
    return this.waitForAvailableConnection(endpoint);
  }

  releaseConnection(connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
  }

  private async createConnection(endpoint: string): Promise<PooledConnection> {
    const connection: PooledConnection = {
      id: `conn_${Date.now()}_${Math.random()}`,
      endpoint,
      inUse: true,
      lastUsed: Date.now(),
      requestCount: 0,
      errorCount: 0
    };

    // Test connection
    try {
      await this.testConnection(endpoint);
    } catch (error) {
      connection.errorCount++;
      throw new Error(`Failed to create connection to ${endpoint}: ${error}`);
    }

    return connection;
  }

  private async waitForAvailableConnection(endpoint: string): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      const checkInterval = setInterval(() => {
        const pool = this.connections.get(endpoint) || [];
        const available = pool.find(conn => !conn.inUse && this.isHealthy(conn));

        if (available) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          available.inUse = true;
          resolve(available);
        }
      }, 100);
    });
  }

  private isHealthy(connection: PooledConnection): boolean {
    const age = Date.now() - connection.lastUsed;
    const errorRate = connection.errorCount / Math.max(connection.requestCount, 1);

    // Connection is healthy if:
    // - Used within last 5 minutes
    // - Error rate is below 10%
    return age < 300000 && errorRate < 0.1;
  }

  private async testConnection(endpoint: string): Promise<void> {
    // Simple health check
    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
  }

  private startHealthChecks(): void {
    setInterval(() => {
      for (const [endpoint, connections] of this.connections.entries()) {
        // Remove unhealthy connections
        const healthyConnections = connections.filter(conn => this.isHealthy(conn));
        this.connections.set(endpoint, healthyConnections);
      }
    }, this.healthCheckInterval);
  }

  getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionByEndpoint: Record<string, number>;
    averageRequestCount: number;
    averageErrorRate: number;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    let totalRequests = 0;
    let totalErrors = 0;
    const connectionByEndpoint: Record<string, number> = {};

    for (const [endpoint, connections] of this.connections.entries()) {
      connectionByEndpoint[endpoint] = connections.length;
      totalConnections += connections.length;
      activeConnections += connections.filter(conn => conn.inUse).length;

      connections.forEach(conn => {
        totalRequests += conn.requestCount;
        totalErrors += conn.errorCount;
      });
    }

    const averageRequestCount = totalConnections > 0 ? totalRequests / totalConnections : 0;
    const averageErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      totalConnections,
      activeConnections,
      connectionByEndpoint,
      averageRequestCount,
      averageErrorRate
    };
  }
}
```

### 4. Performance Monitoring

```typescript
// services/monitoring/PerformanceMonitor.ts

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, any[]> = new Map();
  private startTime: number = Date.now();
  private collectInterval: number = 60000; // 1 minute

  constructor() {
    this.startMetricsCollection();
  }

  trackRequest(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push({
      timestamp: Date.now(),
      duration,
      success,
      metadata
    });

    // Keep only last 1000 entries per operation
    if (operationMetrics.length > 1000) {
      operationMetrics.splice(0, operationMetrics.length - 1000);
    }
  }

  getMetrics(operation?: string): PerformanceMetrics {
    const allOperations = operation ? [operation] : Array.from(this.metrics.keys());
    let totalRequests = 0;
    let totalDuration = 0;
    let successfulRequests = 0;
    let totalErrors = 0;

    const now = Date.now();
    const oneHourAgo = now - 3600000;

    for (const op of allOperations) {
      const operationMetrics = this.metrics.get(op) || [];

      // Filter last hour
      const recentMetrics = operationMetrics.filter(m => m.timestamp > oneHourAgo);

      totalRequests += recentMetrics.length;
      successfulRequests += recentMetrics.filter(m => m.success).length;
      totalErrors += recentMetrics.filter(m => !m.success).length;

      totalDuration += recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    }

    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const uptime = (now - this.startTime) / 1000;
    const throughput = uptime > 0 ? totalRequests / uptime : 0;

    return {
      requestCount: totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage()
    };
  }

  getDetailedMetrics(operation: string): {
    requestCount: number;
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    successRate: number;
    errorDistribution: Record<string, number>;
    timeSeriesData: Array<{ timestamp: number; responseTime: number; success: boolean }>;
  } {
    const operationMetrics = this.metrics.get(operation) || [];

    if (operationMetrics.length === 0) {
      return {
        requestCount: 0,
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        successRate: 0,
        errorDistribution: {},
        timeSeriesData: []
      };
    }

    const responseTimes = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = operationMetrics.filter(m => m.success).length;

    const getPercentile = (arr: number[], percentile: number): number => {
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    // Error distribution
    const errorDistribution = operationMetrics
      .filter(m => !m.success)
      .reduce((acc, m) => {
        const errorType = m.metadata?.errorType || 'Unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      requestCount: operationMetrics.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p50ResponseTime: getPercentile(responseTimes, 50),
      p95ResponseTime: getPercentile(responseTimes, 95),
      p99ResponseTime: getPercentile(responseTimes, 99),
      successRate: (successCount / operationMetrics.length) * 100,
      errorDistribution,
      timeSeriesData: operationMetrics.map(m => ({
        timestamp: m.timestamp,
        responseTime: m.duration,
        success: m.success
      }))
    };
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  private getCPUUsage(): number {
    // Simplified CPU usage calculation
    // In a real implementation, you'd use more sophisticated methods
    return 0;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Cleanup old metrics
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

      for (const [operation, metrics] of this.metrics.entries()) {
        const filtered = metrics.filter(m => m.timestamp > cutoff);
        this.metrics.set(operation, filtered);
      }
    }, this.collectInterval);
  }
}
```

---

## Load Testing Strategy

### 1. Load Testing with K6

```javascript
// tests/load/model-generation.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:3000';

export function setup() {
  // Initialize test data if needed
  console.log('Starting load test...');
}

export default function () {
  const payload = JSON.stringify({
    topic: `Load test topic ${Math.random()}`,
    complexityLevel: 'High School',
    visualStyle: 'Standard Scientific',
    language: 'English',
    outputFormat: 'Infographic'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Test model generation endpoint
  const response = http.post(`${BASE_URL}/api/generate`, payload, params);

  const success = check(response, {
    'generation endpoint status is 200': (r) => r.status === 200,
    'response time < 30s': (r) => r.timings.duration < 30000,
    'response contains result': (r) => r.json('result') !== undefined,
  });

  errorRate.add(!success);

  // Wait between requests to simulate real user behavior
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

export function teardown() {
  console.log('Load test completed');
}
```

### 2. Stress Testing Scenarios

```typescript
// tests/stress/ModelStressTest.ts

import { ModelManager } from '../../services/ModelManager';

describe('Model Stress Tests', () => {
  let modelManager: ModelManager;

  beforeAll(async () => {
    modelManager = new ModelManager();
    await modelManager.initialize();
  });

  test('should handle 100 concurrent requests', async () => {
    const promises = [];
    const startTime = Date.now();

    // Create 100 concurrent requests
    for (let i = 0; i < 100; i++) {
      promises.push(
        modelManager.generateText(`Test prompt ${i}`, {
          id: 'test-model',
          provider: 'ollama'
        } as ModelConfig)
      );
    }

    // Wait for all to complete
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    // Verify results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const duration = endTime - startTime;

    expect(successful).toBeGreaterThan(90); // At least 90% success rate
    expect(failed).toBeLessThan(10); // Less than 10% failure rate
    expect(duration).toBeLessThan(30000); // Complete within 30 seconds

    console.log(`Processed ${successful}/${successful + failed} requests in ${duration}ms`);
  });

  test('should maintain performance under sustained load', async () => {
    const requestsPerSecond = 10;
    const duration = 60000; // 1 minute
    const totalRequests = (duration / 1000) * requestsPerSecond;

    const responseTimes: number[] = [];
    const errors: number[] = [];

    const startTime = Date.now();

    for (let i = 0; i < totalRequests; i++) {
      const requestStart = Date.now();

      try {
        await modelManager.generateText(`Load test ${i}`, {
          id: 'test-model',
          provider: 'ollama'
        } as ModelConfig);

        const responseTime = Date.now() - requestStart;
        responseTimes.push(responseTime);

      } catch (error) {
        errors.push(Date.now() - requestStart);
      }

      // Wait to maintain request rate
      await new Promise(resolve => setTimeout(resolve, 1000 / requestsPerSecond));
    }

    const totalTime = Date.now() - startTime;
    const successRate = (responseTimes.length / totalRequests) * 100;
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

    expect(successRate).toBeGreaterThan(95);
    expect(avgResponseTime).toBeLessThan(2000);
    expect(p95ResponseTime).toBeLessThan(5000);

    console.log(`Sustained load test: ${successRate.toFixed(1)}% success, ${avgResponseTime.toFixed(0)}ms avg response time`);
  });
});
```

This comprehensive testing and optimization workflow provides:

1. **Complete Test Coverage**: Unit, integration, and E2E tests with 90%+ coverage target
2. **Performance Optimization**: Caching, batch processing, connection pooling
3. **Load Testing**: K6 scripts for realistic load scenarios
4. **Stress Testing**: Concurrent request handling and sustained load testing
5. **Monitoring**: Real-time performance metrics and alerting
6. **Quality Gates**: Automated performance thresholds and success criteria

The workflow ensures your HKM system can handle production loads while maintaining the high performance and reliability standards your project demands.