/**
 * @license
 * Copyright (C)2025 Robin L. M. Cheung, MBA. All rights reserved.
 * Namespace: mba.robin.hkm.visualresearch
*/

import { GoogleGenAI } from "@google/genai";
import { ComplexityLevel, VisualStyle, ResearchResult, SearchResultItem, Language, UploadedFile, MediaType } from "../types";

// Model Provider Interface
export interface ModelProvider {
  id: 'local' | 'openrouter' | 'gemini';
  name: string;
  models: ModelConfig[];
  isActive: boolean;
  apiKey?: string;
  endpoint?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'edit';
  provider: ModelProvider['id'];
  vramRequired?: number;
  costPerToken?: number;
  costPerImage?: number;
  maxTokens?: number;
  maxOutputLength?: number;
  capabilities: string[];
  quality: 'high' | 'medium' | 'low';
  speed: 'fast' | 'medium' | 'slow';
}

export interface GenerationRequest {
  model: ModelConfig;
  prompt: string;
  context?: {
    file?: UploadedFile;
    complexity?: ComplexityLevel;
    style?: VisualStyle;
    language?: Language;
    format?: MediaType;
  };
}

// Local Provider (Ollama + ComfyUI)
class LocalProvider {
  private ollamaEndpoint: string;
  private comfyUIEndpoint: string;

  constructor(ollamaEndpoint = 'http://localhost:11434', comfyUIEndpoint = 'http://localhost:8188') {
    this.ollamaEndpoint = ollamaEndpoint;
    this.comfyUIEndpoint = comfyUIEndpoint;
  }

  async generateText(request: GenerationRequest): Promise<string> {
    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model.id,
        prompt: request.prompt,
        options: {
          temperature: 0.7,
          num_predict: request.model.maxTokens || 4000,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      })
    });

    const data = await response.json();
    return data.response;
  }

  async generateImage(request: GenerationRequest): Promise<string> {
    // Implementation for ComfyUI
    const workflow = this.createComfyUIWorkflow(request);
    const response = await fetch(`${this.comfyUIEndpoint}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    });

    const data = await response.json();
    // Poll for completion and return image data
    return await this.waitForComfyUICompletion(data.prompt_id);
  }

  private createComfyUIWorkflow(request: GenerationRequest): any {
    // Create ComfyUI workflow JSON based on model
    return {
      "1": {
        "inputs": {
          "text": request.prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "ckpt_name": request.model.id
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "6": {
        "inputs": {
          "text": "",
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["1", 0],
          "negative": ["6", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "5": {
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "8": {
        "inputs": {
          "samples": ["7", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "infographic",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }

  private async waitForComfyUICompletion(promptId: string): Promise<string> {
    // Poll ComfyUI for completion
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.comfyUIEndpoint}/history/${promptId}`);
      const data = await response.json();

      if (data[promptId] && data[promptId].outputs) {
        // Extract image data from response
        const outputs = data[promptId].outputs;
        if (outputs['9'] && outputs['9'].images) {
          const image = outputs['9'].images[0];
          const imageResponse = await fetch(`${this.comfyUIEndpoint}/view?filename=${image.filename}`);
          const blob = await imageResponse.blob();
          return URL.createObjectURL(blob);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Image generation timeout');
  }

  async checkModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
      const data = await response.json();
      return data.models.map((m: any) => m.name);
    } catch {
      return [];
    }
  }
}

// OpenRouter Provider
class OpenRouterProvider {
  private apiKey: string;
  private endpoint = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(request: GenerationRequest): Promise<string> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hkm.visualresearch.ai',
        'X-Title': 'Hybrid Knowledge Mesh'
      },
      body: JSON.stringify({
        model: request.model.id,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: 0.7,
        max_tokens: request.model.maxTokens || 4000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateImage(request: GenerationRequest): Promise<string> {
    const response = await fetch(`${this.endpoint}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model.id,
        prompt: request.prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url"
      })
    });

    const data = await response.json();
    return data.data[0].url;
  }

  async listModels(): Promise<ModelConfig[]> {
    const response = await fetch(`${this.endpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name,
      type: this.inferModelType(model.id),
      provider: 'openrouter' as const,
      costPerToken: model.pricing?.prompt || 0,
      capabilities: this.inferCapabilities(model.id),
      quality: this.inferQuality(model.id),
      speed: this.inferSpeed(model.id)
    }));
  }

  private inferModelType(modelId: string): ModelConfig['type'] {
    if (modelId.includes('image') || modelId.includes('dall') || modelId.includes('midjourney')) {
      return 'image';
    }
    if (modelId.includes('video') || modelId.includes('runway') || modelId.includes('pika')) {
      return 'video';
    }
    return 'text';
  }

  private inferCapabilities(modelId: string): string[] {
    const caps = ['text'];
    if (modelId.includes('vision') || modelId.includes('claude-3')) {
      caps.push('vision');
    }
    if (modelId.includes('image')) {
      caps.push('image-generation');
    }
    if (modelId.includes('tool') || modelId.includes('function')) {
      caps.push('function-calling');
    }
    return caps;
  }

  private inferQuality(modelId: string): ModelConfig['quality'] {
    if (modelId.includes('claude-3-opus') || modelId.includes('gpt-4')) return 'high';
    if (modelId.includes('claude-3-sonnet') || modelId.includes('gpt-3.5')) return 'medium';
    return 'low';
  }

  private inferSpeed(modelId: string): ModelConfig['speed'] {
    if (modelId.includes('turbo') || modelId.includes('flash')) return 'fast';
    if (modelId.includes('sonnet') || modelId.includes('gpt-3.5')) return 'medium';
    return 'slow';
  }
}

// Gemini Provider (existing implementation)
class GeminiProvider {
  private client: GoogleGenAI;
  private textModel = 'gemini-3-pro-preview';
  private imageModel = 'gemini-3-pro-image-preview';
  private videoModel = 'veo-3.1-fast-generate-preview';

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateText(request: GenerationRequest): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.textModel,
      contents: {
        parts: [{ text: request.prompt }]
      }
    });

    return response.text || '';
  }

  async generateImage(request: GenerationRequest): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.imageModel,
      contents: {
        parts: [{ text: request.prompt }]
      },
      config: {
        responseModalities: [Modality.IMAGE]
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to generate image");
  }

  async generateVideo(request: GenerationRequest): Promise<string> {
    let operation = await this.client.models.generateVideos({
      model: this.videoModel,
      prompt: request.prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      operation = await this.client.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Failed to generate video: No download link returned.");
    }

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}

// Main Model Manager
export class ModelManager {
  private providers: Map<string, ModelProvider> = new Map();
  private localProvider = new LocalProvider();
  private geminiProvider = new GeminiProvider(process.env.GEMINI_API_KEY || '');
  private openRouterProvider: OpenRouterProvider | null = null;

  constructor() {
    this.initializeProviders();
  }

  private async initializeProviders() {
    // Initialize Gemini provider
    this.providers.set('gemini', {
      id: 'gemini',
      name: 'Google Gemini',
      models: await this.getGeminiModels(),
      isActive: true,
      apiKey: process.env.GEMINI_API_KEY
    });

    // Initialize local provider
    const localModels = await this.localProvider.checkModels();
    this.providers.set('local', {
      id: 'local',
      name: 'Local Models',
      models: this.getLocalModelConfigs(localModels),
      isActive: localModels.length > 0
    });

    // Initialize OpenRouter if API key provided
    if (process.env.OPENROUTER_API_KEY) {
      this.openRouterProvider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY);
      const openRouterModels = await this.openRouterProvider.listModels();
      this.providers.set('openrouter', {
        id: 'openrouter',
        name: 'OpenRouter',
        models: openRouterModels,
        isActive: true,
        apiKey: process.env.OPENROUTER_API_KEY,
        endpoint: 'https://openrouter.ai'
      });
    }
  }

  private async getGeminiModels(): Promise<ModelConfig[]> {
    return [
      {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro (Text)',
        type: 'text',
        provider: 'gemini',
        maxTokens: 8192,
        capabilities: ['text', 'search', 'reasoning'],
        quality: 'high',
        speed: 'medium'
      },
      {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro (Image)',
        type: 'image',
        provider: 'gemini',
        maxOutputLength: 1024,
        capabilities: ['image-generation', 'image-edit'],
        quality: 'high',
        speed: 'medium'
      },
      {
        id: 'veo-3.1-fast-generate-preview',
        name: 'Veo 3.1 (Video)',
        type: 'video',
        provider: 'gemini',
        capabilities: ['video-generation'],
        quality: 'high',
        speed: 'slow'
      }
    ];
  }

  private getLocalModelConfigs(models: string[]): ModelConfig[] {
    return models.map(model => ({
      id: model,
      name: model.split(':')[0],
      type: this.inferLocalModelType(model),
      provider: 'local',
      capabilities: this.inferLocalCapabilities(model),
      quality: 'high',
      speed: model.includes('-turbo') ? 'fast' : model.includes('-large') ? 'slow' : 'medium'
    }));
  }

  private inferLocalModelType(model: string): ModelConfig['type'] {
    if (model.includes('text-') || model.includes('llama') || model.includes('mixtral') || model.includes('deepseek')) {
      return 'text';
    }
    if (model.includes('image-') || model.includes('stable-diffusion') || model.includes('flux')) {
      return 'image';
    }
    if (model.includes('video-') || model.includes('animate')) {
      return 'video';
    }
    return 'text'; // Default
  }

  private inferLocalCapabilities(model: string): string[] {
    const caps = ['text'];
    if (model.includes('vision')) caps.push('vision');
    if (model.includes('image')) caps.push('image-generation');
    if (model.includes('tool') || model.includes('function')) caps.push('function-calling');
    if (model.includes('multimodal')) caps.push('multimodal');
    return caps;
  }

  async generateContent(request: GenerationRequest): Promise<string> {
    try {
      switch (request.model.provider) {
        case 'local':
          if (request.model.type === 'text') {
            return await this.localProvider.generateText(request);
          } else if (request.model.type === 'image') {
            return await this.localProvider.generateImage(request);
          }
          throw new Error(`Local generation not supported for type: ${request.model.type}`);

        case 'openrouter':
          if (!this.openRouterProvider) {
            throw new Error('OpenRouter provider not initialized');
          }
          if (request.model.type === 'text') {
            return await this.openRouterProvider.generateText(request);
          } else if (request.model.type === 'image') {
            return await this.openRouterProvider.generateImage(request);
          }
          throw new Error(`OpenRouter generation not supported for type: ${request.model.type}`);

        case 'gemini':
          if (request.model.type === 'text') {
            return await this.geminiProvider.generateText(request);
          } else if (request.model.type === 'image') {
            return await this.geminiProvider.generateImage(request);
          } else if (request.model.type === 'video') {
            return await this.geminiProvider.generateVideo(request);
          }
          throw new Error(`Gemini generation not supported for type: ${request.model.type}`);

        default:
          throw new Error(`Unknown provider: ${request.model.provider}`);
      }
    } catch (error) {
      console.error(`Generation failed with ${request.model.provider}:`, error);

      // Implement fallback strategy
      if (request.model.provider !== 'gemini') {
        console.log('Falling back to Gemini provider');
        const fallbackModel = this.providers.get('gemini')?.models.find(m => m.type === request.model.type);
        if (fallbackModel) {
          request.model = fallbackModel;
          return await this.generateContent(request);
        }
      }

      throw error;
    }
  }

  async researchTopic(
    topic: string,
    level: ComplexityLevel,
    style: VisualStyle,
    language: Language,
    format: MediaType,
    file?: UploadedFile | null,
    preferredProvider?: ModelProvider['id']
  ): Promise<ResearchResult> {
    // Select best model for research
    const researchModel = await this.selectBestModel('text', ['search', 'reasoning'], preferredProvider);

    const levelInstr = this.getLevelInstruction(level);
    const styleInstr = this.getStyleInstruction(style);
    const promptLabel = format === 'video' ? 'VIDEO_PROMPT' : 'IMAGE_PROMPT';

    const systemPrompt = `
      You are an expert visual researcher and data analyst.

      Your goal is to research the topic: "${topic}" and create a plan for ${format === 'video' ? 'an explainer video' : 'an infographic'}.

      ${file ? `[ATTACHED FILE: ${file.name}]` : ''}

      ${file ?
        "**PRIMARY DIRECTIVE: A source file has been provided. You MUST analyze the content of this file (image, document, or text) deeply and use it as the foundation for your research facts and visual prompt. Use Google Search ONLY to verify details or define terms found in the file. Do not ignore the file.**" :
        "**IMPORTANT: Use available search tools to find the most accurate, up-to-date information about this topic.**"
      }

      Context:
      ${levelInstr}
      ${styleInstr}
      Language: ${language}

      Please provide your response in the following format EXACTLY:

      FACTS:
      - [Fact 1 (Extracted from file or verified search)]
      - [Fact 2]
      - [Fact 3]

      ${promptLabel}:
      [${format === 'video'
        ? 'A concise, cinematic prompt for a video generation model. Describe the motion, camera angle, and subject matter clearly. E.g. "Cinematic drone shot of...". Keep it under 60 words.'
        : 'A highly detailed image generation prompt describing the visual composition, colors, and layout for the infographic. Do not include citations in the prompt. If a file was provided, describe specifically how its contents should be visually represented.'}]
    `;

    const parts: any[] = [];

    if (file) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    }

    parts.push({ text: systemPrompt });

    const request: GenerationRequest = {
      model: researchModel,
      prompt: JSON.stringify(parts),
      context: {
        file,
        complexity: level,
        style,
        language,
        format
      }
    };

    const response = await this.generateContent(request);

    // Parse response (simplified - actual parsing would depend on model output format)
    const factsMatch = response.match(/FACTS:\s*([\s\S]*?)(?=VIDEO_PROMPT:|IMAGE_PROMPT:|$)/i);
    const factsRaw = factsMatch ? factsMatch[1].trim() : "";
    const facts = factsRaw.split('\n')
      .map(f => f.replace(/^-\s*/, '').trim())
      .filter(f => f.length > 0)
      .slice(0, 5);

    const promptMatch = response.match(/(VIDEO_PROMPT|IMAGE_PROMPT):\s*([\s\S]*?)$/i);
    const visualPrompt = promptMatch ? promptMatch[2].trim() : `Create a detailed ${format} about ${topic}`;

    return {
      visualPrompt,
      facts,
      searchResults: [] // Would need to extract from model response or maintain search functionality separately
    };
  }

  private async selectBestModel(
    type: ModelConfig['type'],
    requiredCapabilities: string[],
    preferredProvider?: ModelProvider['id']
  ): Promise<ModelConfig> {
    const availableModels = Array.from(this.providers.values())
      .filter(p => preferredProvider ? p.id === preferredProvider : p.isActive)
      .flatMap(p => p.models)
      .filter(m => m.type === type)
      .filter(m => requiredCapabilities.every(cap => m.capabilities.includes(cap)));

    if (availableModels.length === 0) {
      // Fallback to any model of the correct type
      const fallbackModel = Array.from(this.providers.values())
        .find(p => p.id === 'gemini')?.models
        .find(m => m.type === type);

      if (!fallbackModel) {
        throw new Error(`No available model for type: ${type}`);
      }

      return fallbackModel;
    }

    // Select best model based on quality, speed, and provider preference
    return availableModels.sort((a, b) => {
      if (preferredProvider && a.provider !== b.provider) {
        return a.provider === preferredProvider ? -1 : 1;
      }
      const qualityScore = { high: 3, medium: 2, low: 1 };
      return qualityScore[b.quality] - qualityScore[a.quality];
    })[0];
  }

  private getLevelInstruction(level: ComplexityLevel): string {
    switch (level) {
      case 'Elementary':
        return "Target Audience: Elementary School (Ages 6-10). Style: Bright, simple, fun. Use large clear icons and very minimal text labels.";
      case 'High School':
        return "Target Audience: High School. Style: Standard Textbook. Clean lines, clear labels, accurate maps or diagrams. Avoid cartoony elements.";
      case 'College':
        return "Target Audience: University. Style: Academic Journal. High detail, data-rich, precise cross-sections or complex schematics.";
      case 'Expert':
        return "Target Audience: Industry Expert. Style: Technical Blueprint/Schematic. Extremely dense detail, monochrome or technical coloring, precise annotations.";
      default:
        return "Target Audience: General Public. Style: Clear and engaging.";
    }
  }

  private getStyleInstruction(style: VisualStyle): string {
    switch (style) {
      case 'Minimalist': return "Aesthetic: Bauhaus Minimalist. Flat vector art, limited color palette (2-3 colors), reliance on negative space and simple geometric shapes.";
      case 'Realistic': return "Aesthetic: Photorealistic Composite. Cinematic lighting, 8k resolution, highly detailed textures. Looks like a photograph.";
      case 'Cartoon': return "Aesthetic: Educational Comic. Vibrant colors, thick outlines, expressive cel-shaded style.";
      case 'Vintage': return "Aesthetic: 19th Century Scientific Lithograph. Engraving style, sepia tones, textured paper background, fine hatch lines.";
      case 'Futuristic': return "Aesthetic: Cyberpunk HUD. Glowing neon blue/cyan lines on dark background, holographic data visualization, 3D wireframes.";
      case '3D Render': return "Aesthetic: 3D Isometric Render. Claymorphism or high-gloss plastic texture, studio lighting, soft shadows, looks like a physical model.";
      case 'Sketch': return "Aesthetic: Da Vinci Notebook. Ink on parchment sketch, handwritten annotations style, rough but accurate lines.";
      default: return "Aesthetic: High-quality digital scientific illustration. Clean, modern, highly detailed.";
    }
  }

  getAvailableProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  getModelsByType(type: ModelConfig['type']): ModelConfig[] {
    return Array.from(this.providers.values())
      .filter(p => p.isActive)
      .flatMap(p => p.models)
      .filter(m => m.type === type);
  }
}

// Create singleton instance
export const modelManager = new ModelManager();