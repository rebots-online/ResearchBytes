# Local Model Integration Guide for HKM

## Executive Summary

This guide provides comprehensive integration for local model providers (Ollama, ComfyUI, n8n) alongside OpenRouter cloud models, creating a hybrid architecture that maximizes flexibility while maintaining cost efficiency.

## Local Model Ecosystem Overview

### Supported Local Providers

| Provider | Type | Models | VRAM Required | Use Cases | Setup Complexity |
|---------|------|--------|-----------|----------------|
| **Ollama** | Text LLM | 2-24GB | Chat, reasoning | ⭐⭐ |
| **ComfyUI** | Diffusion/Video | 6-24GB | Image/Video | ⭐⭐⭐ |
| **n8n** | Workflow/Automation | 1-4GB | Automation | ⭐ |
| **Automatic1111** | Diffusion | 4-20GB | Image | ⭐⭐⭐ |
| **LM Studio** | Text LLM | 4-24GB | Chat, reasoning | ⭐⭐ |
| **Kandinsky** | Diffusion | 6-12GB | Artistic | ⭐⭐⭐ |

## Enhanced Architecture

### Hybrid Model Management System

```typescript
// services/HybridModelManager.ts
export class HybridModelManager {
  private localProviders: Map<string, LocalProvider> = new Map();
  private cloudProvider: OpenRouterProvider;
  private strategy: ModelSelectionStrategy;

  constructor() {
    this.initializeLocalProviders();
    this.initializeCloudProvider();
    this.setupModelStrategy();
  }

  private async initializeLocalProviders() {
    // Ollama Provider
    this.localProviders.set('ollama', new OllamaProvider({
      endpoint: 'http://localhost:11434',
      models: await this.detectOllamaModels()
    }));

    // ComfyUI Provider
    this.localProviders.set('comfyui', new ComfyUIProvider({
      endpoint: 'http://localhost:8188',
      models: await this.detectComfyUIModels()
    }));

    // n8n Provider
    this.localProviders.set('n8n', new N8nProvider({
      endpoint: 'http://localhost:5678',
      workflows: await this.loadN8nWorkflows()
    }));

    // LM Studio (if needed)
    try {
      const lmStudioModels = await this.detectLMStudioModels();
      if (lmStudioModels.length > 0) {
        this.localProviders.set('lmstudio', new LMStudioProvider(lmStudioModels));
      }
    } catch {
      console.log('LM Studio not detected');
    }
  }

  private async detectOllamaModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      return data.models.map((m: any) => m.name);
    } catch {
      console.warn('Ollama not running');
      return [];
    }
  }

  private async detectComfyUIModels(): Promise<string[]> {
    // Check for common diffusion models
    const commonModels = [
      'flux.1-dev',
      'flux.1-schnell',
      'flux.2-dev',
      'stable-diffusion-3.5',
      'wan2.2',
      'sd3.5-large'
    ];

    const models: string[] = [];
    for (const model of commonModels) {
      try {
        const response = await fetch(`http://localhost:8188/object_info?keyname=${model}`);
        if (response.ok) {
          models.push(model);
        }
      } catch {
        // Model not loaded
      }
    }
    return models;
  }

  async loadN8nWorkflows(): Promise<N8nWorkflow[]> {
    // Load n8n workflows from .n8n directory
    const workflowDir = '.n8n/workflows';
    try {
      const files = await this.readDirectory(workflowDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch {
      return [];
    }
  }

  async detectLMStudioModels(): Promise<string[]> {
    // Check for LM Studio models
    try {
      const response = await fetch('http://localhost:1234/v1/models');
      return response.json().models.map((m: any) => m.id);
    } catch {
      return [];
    }
  }

  async getAllAvailableModels(): Promise<AllModelsInfo> {
    const cloudModels = await this.cloudProvider.getAllModels();
    const localModels = await this.getAllLocalModels();

    return {
      cloud: cloudModels.providers,
      local: localModels,
      combined: [...cloudModels.models, ...localModels],
      statistics: {
        totalModels: cloudModels.models.length + localModels.length,
        cloudModels: cloudModels.models.length,
        localModels: localModels.length,
        localProviders: Array.from(this.localProviders.keys())
      }
    };
  }

  async getAllLocalModels(): Promise<LocalModelConfig[]> {
    const allModels: LocalModelConfig[] = [];

    for (const [providerId, provider] of this.localProviders) {
      try {
        const models = await provider.getAvailableModels();
        const configs = models.map(model => ({
          id: `${providerId}:${model.id}`,
          name: model.name,
          provider: providerId,
          type: model.type,
          vramRequired: model.vramRequired || 0,
          capabilities: model.capabilities || [],
          quality: model.quality || 'medium',
          speed: model.speed || 'medium',
          isLocal: true,
          endpoint: provider.endpoint
        }));
        allModels.push(...configs);
      } catch (error) {
        console.warn(`Failed to get models from ${providerId}:`, error);
      }
    }

    return allModels;
  }

  async selectOptimalModel(
    task: TaskRequirement,
    userPreferences: UserPreferences
  ): Promise<ModelSelectionStrategy> {
    const allModels = await this.getAllAvailableModels();
    let candidates = this.filterModelsByTask(allModels.combined, task);

    // Filter by local/cloud preference
    if (userPreferences.preferLocal !== undefined) {
      candidates = userPreferences.preferLocal
        ? candidates.filter(m => m.isLocal)
        : candidates.filter(m => !m.isLocal);
    }

    // Filter by budget (free models first if applicable)
    if (task.budgetConstraint && task.budgetConstraint < 5) {
      const freeModels = candidates.filter(m => m.isFree || m.costPerToken === 0);
      if (freeModels.length > 0) {
        candidates = freeModels;
      }
    }

    // Apply quality and speed requirements
    candidates = this.applyQualityFilters(candidates, task);

    // Sort by optimization criteria
    candidates = this.sortModelsByCriteria(candidates, task, userPreferences);

    return {
      primary: candidates[0],
      fallbacks: candidates.slice(1, 3),
      autoOptimize: true,
      preferences: userPreferences
    };
  }

  async executeWithOptimalRouting(
    taskType: string,
    request: GenerationRequest,
    options?: {
      preferLocal?: boolean;
      preferCloud?: boolean;
      maxBudget?: number;
    }
  ): Promise<any> {
    // Get optimal strategy
    const strategy = await this.selectOptimalModel(
      {
        type: taskType,
        complexity: request.context?.complexity || 'medium',
        hasImages: request.context?.hasImages,
        budgetConstraint: options?.maxBudget,
        qualityLevel: 'better'
      },
      {
        preferLocal: options?.preferLocal,
        preferCloud: options?.preferCloud
      }
    );

    try {
      // Try primary model first
      if (strategy.primary) {
        const result = await this.executeWithModel(strategy.primary, request);
        return result;
      }
    } catch (error) {
      console.warn(`Primary model failed: ${error}`);

      // Try fallbacks
      for (const fallback of strategy.fallbacks) {
        try {
          const result = await this.executeWithModel(fallback, request);
          return result;
        } catch (fallbackError) {
          console.warn(`Fallback model ${fallback.id} failed: ${fallbackError}`);
          continue;
        }
      }
    }

    throw new Error('All models failed for task type: ' + taskType);
  }

  private filterModelsByTask(models: ModelConfig[], task: TaskRequirement): ModelConfig[] {
    let filtered = models;

    // Filter by type
    switch (task.type) {
      case 'text':
        filtered = models.filter(m => m.type === 'text');
        break;
      case 'image':
        filtered = models.filter(m => m.type === 'image');
        break;
      case 'video':
        if (task.needsVideo) {
          filtered = models.filter(m => m.type === 'video');
        } else {
          filtered = []; // Default to image for visual content
        }
        break;
      case 'audio':
        filtered = models.filter(m => m.type === 'audio');
        break;
    }

    // Filter by capabilities
    if (task.hasImages) {
      filtered = filtered.filter(m => m.capabilities.includes('vision'));
    }

    if (task.realTimeData) {
      filtered = filtered.filter(m =>
        m.capabilities.includes('real-time') ||
        m.capabilities.includes('search')
      );
    }

    if (task.contextLength) {
      filtered = filtered.filter(m =>
        !m.contextWindow || m.contextWindow >= task.contextLength
      );
    }

    return filtered;
  }

  private applyQualityFilters(
    models: ModelConfig[],
    task: TaskRequirement
  ): ModelConfig[] {
    const qualityScore = {
      'good': 1,
      'better': 2,
      'best': 3,
      'SOTA': 4
    };

    const qualityRequirement = qualityScore[task.qualityLevel || 'better'];

    return models.filter(m => {
      const modelQuality = qualityScore[m.quality] || 2;
      return modelQuality >= qualityRequirement;
    });
  }

  private sortModelsByCriteria(
    models: ModelConfig[],
    task: TaskRequirement,
    preferences: UserPreferences
  ): ModelConfig[] {
    return models.sort((a, b) => {
      // Priority 1: User preferences
      if (preferences.preferLocal && a.isLocal !== b.isLocal) {
        return a.isLocal ? -1 : 1;
      }
      if (preferences.preferCloud && !a.isLocal && !b.isLocal) {
        return !b.isLocal ? -1 : 1;
      }

      // Priority 2: Budget constraints
      if (task.budgetConstraint && a.costPerToken && b.costPerToken) {
        const costAScore = (task.budgetConstraint * 0.001) / a.costPerToken;
        const costBScore = (task.budgetConstraint * 0.001) / b.costPerToken;
        return costAScore > costBScore ? 1 : -1;
      }

      // Priority 3: Quality level
      const qualityScore = {
        'good': 1, 'better': 2, 'best': 3, 'SOTA': 4
      };
      const scoreA = qualityScore[a.quality] || 2;
      const scoreB = qualityScore[b.quality] || 2;
      return scoreB - scoreA;

      // Priority 4: Speed
      const speedScore = { 'fast': 3, 'medium': 2, 'slow': 1 };
      const speedA = speedScore[a.speed] || 2;
      const speedB = speedScore[b.speed] || 2;
      return speedB - speedA;
    });
  }

  private async executeWithModel(
    model: ModelConfig,
    request: GenerationRequest
  ): Promise<any> {
    if (model.isLocal) {
      return await this.executeLocally(model, request);
    } else {
      return await this.executeViaCloud(model, request);
    }
  }

  private async executeLocally(model: ModelConfig, request: any): Promise<any> {
    const provider = this.localProviders.get(model.provider);
    if (!provider) {
      throw new Error(`Local provider not available: ${model.provider}`);
    }

    switch (model.provider) {
      case 'ollama':
        return await this.executeWithOllama(model, request);
      case 'comfyui':
        return await this.executeWithComfyUI(model, request);
      case 'n8n':
        return await this.executeWithN8n(model, request);
      case 'lmstudio':
        return await this.executeWithLMStudio(model, request);
      case 'automatic1111':
        return await this.executeWithSD(model, request);
      case 'kandinsky':
        return this.executeWithKandinsky(model, request);
      default:
        throw new Error(`Unknown local provider: ${model.provider}`);
    }
  }

  private async executeWithOllama(model: ModelConfig, request: any): Promise<any> {
    const ollamaProvider = this.localProviders.get('ollama') as OllamaProvider;
    return await ollamaProvider.generateText(model, request.prompt);
  }

  private async executeWithComfyUI(model: ModelConfig, request: any): Promise<any> {
    const comfyUIProvider = this.localProviders.get('comfyui') as ComfyUIProvider;

    if (request.type === 'image') {
      return await comfyUIProvider.generateImage(model, request);
    } else if (request.type === 'video') {
      return await comfyUIProvider.generateVideo(model, request);
    } else {
      throw new Error(`Unsupported task type for ComfyUI: ${request.type}`);
    }
  }

  private async executeWithN8n(model: ModelConfig, request: any): Promise<any> {
    const n8nProvider = this.localProviders.get('n8n') as N8nProvider;
    return await n8nProvider.executeWorkflow(model, request);
  }

  private async executeWithLMStudio(model: ModelConfig, request: any): Promise<any> {
    const lmStudioProvider = this.localProviders.get('lmstudio') as LMStudioProvider;
    return await lmStudio.generateText(model, request);
  }

  private async executeWithSD(model: ModelConfig, request: any): Promise<any> {
    // Automatic1111 setup
    return await this.setupAndExecuteSD1111(model, request);
  }

  private async executeWithKandinsky(model: ModelConfig, request: any): Promise<any> {
    // Kandinsky diffusion setup
    return await this.generateWithKandinsky(model, request);
  }

  private async executeViaCloud(model: ModelConfig, request: any): Promise<any> {
    // OpenRouter/Gemini cloud providers
    return this.cloudProvider.generateContent(model, request);
  }

  private async setupAndExecuteSD1111(model: ModelConfig, request: any): Promise<any> {
    // Setup Automatic1111 if needed
    const response = await fetch('http://127.0.0.1:7860/api/v1/models', {
      method: 'POST',
      headers: { 'Content-Type: 'application/json' },
      body: JSON.stringify({
        model: 'stability-ai/stable-diffusion-xl-1.0',
        prompt: request.prompt,
        width: 1024,
        height: 1024,
        num_inference_steps: 20
      })
    });

    return response.json();
  }

  private async generateWithKandinsky(model: ModelConfig, request: any): Promise<any> {
    // Kandinsky diffusion
    const response = await fetch('http://127.0.0.1:5000/v2/models', {
      method: 'POST',
      headers: { 'Content-Type: 'application/json' },
      body: JSON.stringify({
        model: 'kandinsky-2.2',
        prompt: request.prompt,
        width: 512,
        height: 512,
        num_inference_steps: 25
      })
    });

    return response.json();
  }
}

// Local Provider Interfaces
export interface LocalProvider {
  id: string;
  name: string;
  endpoint: string;
  models: Promise<LocalModelConfig[]>;
}

// Ollama Provider
export class OllamaProvider implements LocalProvider {
  endpoint: string;
  models: string[] = [];

  constructor(config: { endpoint?: string }) {
    this.endpoint = config.endpoint || 'http://localhost:11434';
  }

  async getAvailableModels(): Promise<LocalModelConfig[]> {
    const response = await fetch(`${this.endpoint}/api/tags`);
    const data = await response.json();

    this.models = data.models.map((model: any) => ({
      id: `ollama:${model.name}`,
      name: model.name,
      provider: 'ollama',
      type: 'text',
      vramRequired: this.estimateVRAM(model.size),
      capabilities: this.getModelCapabilities(model.name),
      quality: this.assessModelQuality(model),
      speed: 'medium',
      isLocal: true,
      endpoint: this.endpoint
    }));

    return this.models;
  }

  async generateText(model: LocalModelConfig, prompt: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type: 'application/json' },
      body: JSON.stringify({
        model: model.name.split(':')[1],
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 4096
        }
      })
    });

    const data = await response.json();
    return data.response;
  }

  private estimateVRAM(modelSize: number): number {
    // Rough VRAM estimation (1.5x model size in GB)
    return Math.ceil(modelSize * 1.5);
  }

  private getModelCapabilities(modelName: string): string[] {
    const capabilities: any = {
      'llama2': ['text', 'reasoning', 'coding'],
      'codellama': ['text', 'reasoning'],
      'mistral': ['text', 'reasoning'],
      'qwen': ['text', 'reasoning', 'chinese'],
      'deepseek': ['text', 'reasoning', 'coding'],
      'mixtral': ['text', 'reasoning', 'multilingual'],
      'gemma': ['text', 'reasoning'],
      'phi': ['text', 'reasoning', 'fast'],
      'stablelm': ['text', 'reasoning']
    };

    for (const [key, caps] of Object.entries(capabilities)) {
      if (modelName.toLowerCase().includes(key)) {
        return caps;
      }
    }
    return ['text', 'reasoning'];
  }

  private assessModelQuality(modelName: string): ModelConfig['quality'] {
    const qualityMap: any = {
      '70b': 'high',
      '34b': 'high',
      '7b': 'medium',
      '3b': 'low',
      '1b': 'low'
    };

    for (const [key, quality] of Object.entries(qualityMap)) {
      if (modelName.toLowerCase().includes(key)) {
        return quality;
      }
    }
    return 'medium';
  }
}

// ComfyUI Provider
export class ComfyUIProvider implements LocalProvider {
  endpoint: string;
  models: string[] = [];

  constructor(config: { endpoint?: string }) {
    this.endpoint = config.endpoint || 'h