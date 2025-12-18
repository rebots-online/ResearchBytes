/**
 * @license
 * Copyright (C)2025 Robin L. M. Cheung, MBA. All rights reserved.
 * Namespace: mba.robin.hkm.visualresearch
*/

import { GoogleGenAI, Modality } from "@google/genai";
import { ComplexityLevel, VisualStyle, ResearchResult, SearchResultItem, Language, UploadedFile, MediaType } from "../types";

// Extended interfaces for advanced models
export interface AdvancedModelConfig {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'edit' | 'audio';
  provider: 'openrouter' | 'gemini' | 'local' | 'kimi' | 'minimax' | 'wan';
  costPerToken?: number;
  costPerImage?: number;
  costPerGeneration?: number;
  costPerSecond?: number;
  maxTokens?: number;
  maxOutputLength?: number;
  contextWindow?: number;
  capabilities: string[];
  quality: 'high' | 'medium' | 'low' | 'very-high';
  speed: 'fast' | 'medium' | 'slow' | 'very-slow';

  // Provider-specific capabilities
  glmCapabilities?: {
    chineseLevel: 'native' | 'fluent' | 'basic';
    codeGeneration: boolean;
    multimodal: boolean;
  };

  kimiCapabilities?: {
    contextWindow: number;
    fileHandling: boolean;
    longDocumentSupport: boolean;
  };

  minimaxCapabilities?: {
    musicGeneration: boolean;
    voiceSynthesis: boolean;
    costOptimization: boolean;
  };

  wanCapabilities?: {
    videoLength: string;
    resolution: string;
    cameraControl: boolean;
  };
}

export interface BilingualContent {
  chinese: string;
  english: string;
  combined: string;
}

export interface MusicInfographic {
  musicUrl: string;
  infographicData: string;
  synchronization: Array<{ timestamp: number, visual: string, note: string }>;
}

// Enhanced provider implementations
class GLMProvider {
  private apiKey: string;
  private endpoint = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(request: any): Promise<string> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hkm.visualresearch.ai',
        'X-Title': 'HKM GLM Integration'
      },
      body: JSON.stringify({
        model: request.model.id,
        messages: request.messages || [{ role: 'user', content: request.prompt }],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateImage(request: any): Promise<string> {
    // GLM-4.6v vision analysis for image editing/generation
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'zhipuai/glm-4-v',
        messages: request.messages,
        response_format: { type: 'image_url' }
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

class KimiProvider {
  private apiKey: string;
  private endpoint = 'https://api.moonshot.cn/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(request: any): Promise<string> {
    // Support for ultra-long context documents
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model.id === 'kimi-k2k' ? 'moonshot-v1-128k' : request.model.id,
        messages: request.messages,
        temperature: request.temperature || 0.3,
        max_tokens: request.maxTokens || 4000,
        stream: false
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async processLongDocument(documents: UploadedFile[], query: string): Promise<string> {
    // Special handling for 200K context window
    const combinedContent = documents.map(doc =>
      `Document: ${doc.name}\n${doc.data}`
    ).join('\n\n');

    return await this.generateText({
      model: { id: 'kimi-k2k' },
      messages: [{
        role: 'user',
        content: `Analyze these documents and answer: ${query}\n\n${combinedContent}`
      }],
      maxTokens: 8000
    });
  }
}

class MiniMaxProvider {
  private apiKey: string;
  private endpoint = 'https://api.minimax.chat/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(request: any): Promise<string> {
    const response = await fetch(`${this.endpoint}/text/chatcompletion_pro`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4000
      })
    });

    const data = await response.json();
    return data.choices[0].text;
  }

  async generateMusic(prompt: string, style: string, duration: number): Promise<string> {
    const response = await fetch(`${this.endpoint}/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'speech-01-turbo',
        text: prompt,
        voice_setting: {
          voice_id: 'presentation-female-soft'
        },
        speed: 1.0
      })
    });

    const data = await response.json();
    return data.audio_url;
  }

  async generateVoice(text: string, emotion: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'speech-01-turbo',
        text: text,
        voice_setting: {
          voice_id: 'presentation-male-soft',
          emotion: emotion
        }
      })
    });

    const data = await response.json();
    return data.audio_url;
  }
}

class WANProvider {
  private apiKey: string;
  private endpoint = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateVideo(request: any): Promise<string> {
    // Enhanced video generation with camera controls
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hkm.visualresearch.ai',
        'X-Title': 'WAN Video Generation'
      },
      body: JSON.stringify({
        model: 'alibaba/wan-2.2',
        messages: [{
          role: 'user',
          content: `Generate a video: ${request.prompt}\n\nCamera: ${request.camera || 'medium shot'}\nDuration: ${request.duration || '5s'}\nStyle: ${request.style || 'professional'}`
        }],
        response_format: { type: 'video_url' },
        max_tokens: 1000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Main Advanced Model Manager
export class AdvancedModelManager {
  private providers: Map<string, any> = new Map();
  private models: Map<string, AdvancedModelConfig> = new Map();
  private fallbackManager: any; // Reference to original ModelManager

  constructor() {
    this.initializeProviders();
    this.loadModelConfigurations();
  }

  private async initializeProviders() {
    // Initialize GLM provider
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('glm', new GLMProvider(process.env.OPENROUTER_API_KEY));
    }

    // Initialize Kimi provider
    if (process.env.KIMI_API_KEY) {
      this.providers.set('kimi', new KimiProvider(process.env.KIMI_API_KEY));
    }

    // Initialize MiniMax provider
    if (process.env.MINIMAX_API_KEY) {
      this.providers.set('minimax', new MiniMaxProvider(process.env.MINIMAX_API_KEY));
    }

    // Initialize WAN provider
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('wan', new WANProvider(process.env.OPENROUTER_API_KEY));
    }
  }

  private loadModelConfigurations() {
    // GLM Models
    this.models.set('glm-4.6', {
      id: 'zhipuai/glm-4',
      name: 'GLM-4.6',
      type: 'text',
      provider: 'openrouter',
      costPerToken: 0.003,
      maxTokens: 8192,
      capabilities: ['text', 'reasoning', 'multilingual', 'code', 'chinese'],
      quality: 'high',
      speed: 'medium',
      glmCapabilities: {
        chineseLevel: 'native',
        codeGeneration: true,
        multimodal: false
      }
    });

    this.models.set('glm-4.6v', {
      id: 'zhipuai/glm-4-v',
      name: 'GLM-4.6v (Vision)',
      type: 'image',
      provider: 'openrouter',
      costPerToken: 0.015,
      maxTokens: 4096,
      capabilities: ['text', 'vision', 'image-analysis', 'multimodal', 'chinese'],
      quality: 'high',
      speed: 'medium',
      glmCapabilities: {
        chineseLevel: 'native',
        codeGeneration: true,
        multimodal: true
      }
    });

    // Kimi Models
    this.models.set('kimi-8k', {
      id: 'moonshot-v1-8k',
      name: 'Kimi 8K',
      type: 'text',
      provider: 'openrouter',
      costPerToken: 0.004,
      maxTokens: 8000,
      capabilities: ['text', 'long-context', 'document-analysis'],
      quality: 'high',
      speed: 'medium',
      kimiCapabilities: {
        contextWindow: 8000,
        fileHandling: false,
        longDocumentSupport: true
      }
    });

    this.models.set('kimi-k2k', {
      id: 'moonshot-v1-128k',
      name: 'Kimi K2K (128K)',
      type: 'text',
      provider: 'kimi',
      costPerToken: 0.03,
      maxTokens: 128000,
      capabilities: ['text', 'ultra-long-context', 'file-handling', 'document-analysis'],
      quality: 'high',
      speed: 'slow',
      kimiCapabilities: {
        contextWindow: 128000,
        fileHandling: true,
        longDocumentSupport: true
      }
    });

    // MiniMax Models
    this.models.set('minimax-text', {
      id: 'minimax-text-01',
      name: 'MiniMax Text',
      type: 'text',
      provider: 'minimax',
      costPerToken: 0.002,
      maxTokens: 8192,
      capabilities: ['text', 'chinese', 'fast-generation', 'cost-effective'],
      quality: 'medium',
      speed: 'fast',
      minimaxCapabilities: {
        musicGeneration: false,
        voiceSynthesis: true,
        costOptimization: true
      }
    });

    this.models.set('minimax-music', {
      id: 'minimax-music-01',
      name: 'MiniMax Music',
      type: 'audio',
      provider: 'minimax',
      costPerGeneration: 0.01,
      capabilities: ['music-generation', 'audio', 'emotion-control'],
      quality: 'high',
      speed: 'medium',
      minimaxCapabilities: {
        musicGeneration: true,
        voiceSynthesis: false,
        costOptimization: true
      }
    });

    // WAN Models
    this.models.set('wan-2.2', {
      id: 'alibaba/wan-2.2',
      name: 'WAN 2.2',
      type: 'video',
      provider: 'openrouter',
      costPerGeneration: 0.12,
      capabilities: ['video-generation', 'text-to-video', 'camera-control'],
      quality: 'high',
      speed: 'slow',
      wanCapabilities: {
        videoLength: '5s',
        resolution: '720p',
        cameraControl: false
      }
    });

    this.models.set('wan-2.2-hd', {
      id: 'alibaba/wan-2.2-hd',
      name: 'WAN 2.2 HD',
      type: 'video',
      provider: 'openrouter',
      costPerGeneration: 0.25,
      capabilities: ['video-generation', 'text-to-video', 'camera-control', 'high-quality'],
      quality: 'very-high',
      speed: 'very-slow',
      wanCapabilities: {
        videoLength: '2s',
        resolution: '1080p',
        cameraControl: true
      }
    });
  }

  // Bilingual content generation using GLM-4.6
  async generateBilingualContent(topic: string, level: ComplexityLevel): Promise<BilingualContent> {
    const glmProvider = this.providers.get('glm');
    const model = this.models.get('glm-4.6');

    const prompt = `Generate comprehensive content about "${topic}" at ${level} level.
    Provide both English and Chinese versions, maintaining accuracy and cultural appropriateness.

    Structure your response as:
    ENGLISH:
    [English content here]

    CHINESE:
    [Chinese content here]

    COMBINED_INSIGHTS:
    [Key takeaways and cross-cultural perspectives]`;

    const response = await glmProvider.generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    // Parse response to extract bilingual content
    const englishMatch = response.match(/ENGLISH:\s*([\s\S]*?)CHINESE:/i);
    const chineseMatch = response.match(/CHINESE:\s*([\s\S]*?)COMBINED_INSIGHTS:/i);
    const combinedMatch = response.match(/COMBINED_INSIGHTS:\s*([\s\S]*)/i);

    return {
      chinese: chineseMatch?.[1]?.trim() || '',
      english: englishMatch?.[1]?.trim() || '',
      combined: combinedMatch?.[1]?.trim() || response
    };
  }

  // Music-enhanced infographic generation
  async generateMusicInfographic(
    topic: string,
    style: VisualStyle,
    musicStyle: string
  ): Promise<MusicInfographic> {
    // Generate music with MiniMax
    const minimaxProvider = this.providers.get('minimax');
    const musicPrompt = `Create a ${musicStyle} music track for an infographic about "${topic}".
    The music should be engaging, educational, and loopable.`;

    const musicUrl = await minimaxProvider.generateMusic(musicPrompt, musicStyle, 30);

    // Generate infographic with GLM
    const glmProvider = this.providers.get('glm');
    const visualPrompt = `Create detailed visual specifications for an infographic about "${topic}" in ${style} style.
    Include specific suggestions for how visual elements could synchronize with background music.
    Provide timestamps for key visual transitions that would match musical phrases.`;

    const infographicData = await glmProvider.generateText({
      model: this.models.get('glm-4.6'),
      messages: [{ role: 'user', content: visualPrompt }],
      temperature: 0.8
    });

    // Parse synchronization points
    const syncPoints = this.parseSyncPoints(infographicData);

    return {
      musicUrl,
      infographicData,
      synchronization: syncPoints
    };
  }

  // Ultra-long document analysis with Kimi K2K
  async analyzeLongDocument(
    documents: UploadedFile[],
    analysisType: 'summary' | 'comparison' | 'insights'
  ): Promise<string> {
    const kimiProvider = this.providers.get('kimi');
    const model = this.models.get('kimi-k2k');

    const analysisPrompts = {
      summary: 'Provide a comprehensive summary of these documents, highlighting key findings and conclusions.',
      comparison: 'Compare and contrast these documents, identifying similarities, differences, and unique insights.',
      insights: 'Extract deep insights from these documents, identifying patterns, trends, and implications.'
    };

    return await kimiProvider.processLongDocument(
      documents,
      analysisPrompts[analysisType]
    );
  }

  // Advanced video generation with WAN 2.2
  async generateAdvancedExplainer(
    script: string,
    visualStyle: string,
    cameraInstructions: string
  ): Promise<string> {
    const wanProvider = this.providers.get('wan');
    const model = this.models.get('wan-2.2-hd');

    const prompt = `Create a professional explainer video with:

    Script: ${script}
    Visual Style: ${visualStyle}
    Camera Instructions: ${cameraInstructions}

    Ensure smooth transitions, clear visualization of concepts, and professional production quality.`;

    return await wanProvider.generateVideo({
      model,
      prompt,
      camera: cameraInstructions,
      duration: '5s',
      style: visualStyle
    });
  }

  private parseSyncPoints(content: string): Array<{ timestamp: number, visual: string, note: string }> {
    const syncPoints: Array<{ timestamp: number, visual: string, note: string }> = [];

    // Parse timestamp patterns like "0:00 - [visual] - [note]"
    const pattern = /(\d+:\d+)\s*-\s*\[([^\]]+)\]\s*-\s*\[([^\]]+)\]/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const [_, timestamp, visual, note] = match;
      const [minutes, seconds] = timestamp.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;

      syncPoints.push({
        timestamp: totalSeconds,
        visual: visual.trim(),
        note: note.trim()
      });
    }

    return syncPoints;
  }

  // Get optimal model for specific requirements
  getOptimalModel(requirements: {
    taskType: string;
    hasChinese?: boolean;
    hasImages?: boolean;
    longContext?: boolean;
    needsVideo?: boolean;
    needsMusic?: boolean;
    budget?: number;
    qualityLevel?: 'good' | 'better' | 'best';
  }): AdvancedModelConfig | null {
    let candidates = Array.from(this.models.values());

    // Filter by task type
    if (requirements.taskType === 'video') {
      candidates = candidates.filter(m => m.type === 'video');
    } else if (requirements.taskType === 'audio') {
      candidates = candidates.filter(m => m.type === 'audio');
    } else if (requirements.taskType === 'text') {
      candidates = candidates.filter(m => m.type === 'text');
    }

    // Filter by Chinese requirement
    if (requirements.hasChinese) {
      candidates = candidates.filter(m =>
        m.capabilities.includes('chinese') ||
        m.provider === 'glm' ||
        m.provider === 'minimax'
      );
    }

    // Filter by long context
    if (requirements.longContext) {
      candidates = candidates.filter(m =>
        m.kimiCapabilities?.contextWindow && m.kimiCapabilities.contextWindow > 30000
      );
    }

    // Filter by budget
    if (requirements.budget) {
      candidates = candidates.filter(m => {
        const cost = m.costPerToken || m.costPerGeneration || 0;
        return cost * 1000 <= requirements.budget;
      });
    }

    // Sort by quality then speed
    candidates.sort((a, b) => {
      const qualityScore = { 'very-high': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const speedScore = { 'fast': 3, 'medium': 2, 'slow': 1, 'very-slow': 0 };

      if (requirements.qualityLevel === 'best') {
        return qualityScore[b.quality] - qualityScore[a.quality];
      }

      // Balance quality and cost
      const aScore = qualityScore[a.quality] * 10 - (a.costPerToken || 0) * 1000;
      const bScore = qualityScore[b.quality] * 10 - (b.costPerToken || 0) * 1000;

      return bScore - aScore;
    });

    return candidates[0] || null;
  }

  // Get all available models with extended information
  getAvailableAdvancedModels(): {
    providers: string[];
    models: AdvancedModelConfig[];
    statistics: {
      totalModels: number;
      byProvider: Record<string, number>;
      byType: Record<string, number>;
      byQuality: Record<string, number>;
    };
  } {
    const models = Array.from(this.models.values());
    const providers = Array.from(new Set(models.map(m => m.provider)));

    return {
      providers,
      models,
      statistics: {
        totalModels: models.length,
        byProvider: models.reduce((acc, m) => {
          acc[m.provider] = (acc[m.provider] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byType: models.reduce((acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byQuality: models.reduce((acc, m) => {
          acc[m.quality] = (acc[m.quality] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }
}

// Export singleton instance
export const advancedModelManager = new AdvancedModelManager();