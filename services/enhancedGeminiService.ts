/**
 * @license
 * Copyright (C)2025 Robin L. M. Cheung, MBA. All rights reserved.
 * Namespace: mba.robin.hkm.visualresearch
*/

import { GoogleGenAI, Modality } from "@google/genai";
import { ComplexityLevel, VisualStyle, ResearchResult, SearchResultItem, Language, UploadedFile, MediaType } from "../types";
import { modelManager } from "./ModelManager";

// Maintain backward compatibility while adding new capabilities
export class EnhancedGeminiService {
  private fallbackGemini: GoogleGenAI;

  constructor() {
    // Keep original implementation as fallback
    this.fallbackGemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  }

  // Enhanced research function with model selection
  export const researchTopicForPrompt = async (
    topic: string,
    level: ComplexityLevel,
    style: VisualStyle,
    language: Language,
    format: MediaType,
    file?: UploadedFile | null,
    preferredProvider?: 'local' | 'openrouter' | 'gemini'
  ): Promise<ResearchResult> => {
    try {
      // Try with ModelManager first
      return await modelManager.researchTopic(
        topic,
        level,
        style,
        language,
        format,
        file,
        preferredProvider
      );
    } catch (error) {
      console.warn('ModelManager failed, falling back to original implementation:', error);
      // Fall back to original implementation
      return researchTopicForPromptOriginal(topic, level, style, language, format, file);
    }
  };

  // Original implementation as fallback
  const researchTopicForPromptOriginal = async (
    topic: string,
    level: ComplexityLevel,
    style: VisualStyle,
    language: Language,
    format: MediaType,
    file?: UploadedFile | null
  ): Promise<ResearchResult> => {

    const levelInstr = getLevelInstruction(level);
    const styleInstr = getStyleInstruction(style);

    const promptLabel = format === 'video' ? 'VIDEO_PROMPT' : 'IMAGE_PROMPT';

    // Conditional instruction to ensure file priority
    const searchInstruction = file
        ? "**PRIMARY DIRECTIVE: A source file has been provided. You MUST analyze the content of this file (image, document, or text) deeply and use it as the foundation for your research facts and visual prompt. Use Google Search ONLY to verify details or define terms found in the file. Do not ignore the file.**"
        : "**IMPORTANT: Use the Google Search tool to find the most accurate, up-to-date information about this topic to augment what is provided or fill in gaps.**";

    const systemPrompt = `
      You are an expert visual researcher and data analyst.

      Your goal is to research the topic: "${topic}" and create a plan for ${format === 'video' ? 'an explainer video' : 'an infographic'}.

      ${file ? `[ATTACHED FILE: ${file.name}]` : ''}

      ${searchInstruction}

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

    // Place the file FIRST in the parts array so the model sees it as the primary context
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

    const response = await this.fallbackGemini.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: parts
      },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";

    // Parse Facts
    const factsMatch = text.match(new RegExp(`FACTS:\\s*([\\s\\S]*?)(?=${promptLabel}:|$)`, 'i'));
    const factsRaw = factsMatch ? factsMatch[1].trim() : "";
    const facts = factsRaw.split('\n')
      .map(f => f.replace(/^-\s*/, '').trim())
      .filter(f => f.length > 0)
      .slice(0, 5);

    // Parse Prompt
    const promptMatch = text.match(new RegExp(`${promptLabel}:\\s*([\\s\\S]*?)$`, 'i'));
    const visualPrompt = promptMatch ? promptMatch[1].trim() : `Create a detailed ${format} about ${topic}. ${levelInstr} ${styleInstr}`;

    // Extract Grounding (Search Results)
    const searchResults: SearchResultItem[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks) {
      chunks.forEach(chunk => {
        if (chunk.web?.uri && chunk.web?.title) {
          searchResults.push({
            title: chunk.web.title,
            url: chunk.web.uri
          });
        }
      });
    }

    // Remove duplicates based on URL
    const uniqueResults = Array.from(new Map(searchResults.map(item => [item.url, item])).values());

    return {
      visualPrompt: visualPrompt,
      facts: facts,
      searchResults: uniqueResults
    };
  };

  // Enhanced image generation with model selection
  export const generateInfographicImage = async (
    prompt: string,
    preferredProvider?: 'local' | 'openrouter' | 'gemini'
  ): Promise<string> => {
    try {
      const imageModels = modelManager.getModelsByType('image');

      if (preferredProvider) {
        const preferredModel = imageModels.find(m => m.provider === preferredProvider);
        if (preferredModel) {
          return await modelManager.generateContent({
            model: preferredModel,
            prompt
          });
        }
      }

      // Try local first, then API
      const localModel = imageModels.find(m => m.provider === 'local');
      if (localModel) {
        try {
          return await modelManager.generateContent({
            model: localModel,
            prompt
          });
        } catch (error) {
          console.warn('Local image generation failed, trying API:', error);
        }
      }

      // Fall back to OpenRouter
      const apiModel = imageModels.find(m => m.provider === 'openrouter');
      if (apiModel) {
        return await modelManager.generateContent({
          model: apiModel,
          prompt
        });
      }

      // Finally fall back to Gemini
      return await generateInfographicImageOriginal(prompt);
    } catch (error) {
      console.warn('Enhanced image generation failed, falling back to original:', error);
      return generateInfographicImageOriginal(prompt);
    }
  };

  // Original image generation
  const generateInfographicImageOriginal = async (prompt: string): Promise<string> => {
    const response = await this.fallbackGemini.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to generate image");
  };

  // Enhanced video generation
  export const generateExplainerVideo = async (
    prompt: string,
    preferredProvider?: 'local' | 'openrouter' | 'gemini'
  ): Promise<string> => {
    try {
      const videoModels = modelManager.getModelsByType('video');

      // For now, Gemini/Google is the only viable option for video
      // But we prepare the architecture for future video models
      const geminiModel = videoModels.find(m => m.provider === 'gemini');
      if (geminiModel && (preferredProvider === 'gemini' || !preferredProvider)) {
        return await generateExplainerVideoOriginal(prompt);
      }

      // When local/API video models become available, they would be tried here
      console.warn('No suitable video model found, falling back to Gemini');
      return generateExplainerVideoOriginal(prompt);
    } catch (error) {
      console.warn('Enhanced video generation failed, falling back to original:', error);
      return generateExplainerVideoOriginal(prompt);
    }
  };

  // Original video generation
  const generateExplainerVideoOriginal = async (prompt: string): Promise<string> => {
    let operation = await this.fallbackGemini.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds
      operation = await this.fallbackGemini.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error("Failed to generate video: No download link returned.");
    }

    // Fetch the video content using the API key
    const response = await fetch(`${downloadLink}&key=${process.env.GEMINI_API_KEY || process.env.API_KEY}`);
    if (!response.ok) {
       throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  // Enhanced image editing
  export const editInfographicImage = async (
    currentImageBase64: string,
    editInstruction: string,
    preferredProvider?: 'local' | 'openrouter' | 'gemini'
  ): Promise<string> => {
    try {
      const editModels = modelManager.getModelsByType('edit');

      // Prefer local models for editing (faster iterations)
      if (preferredProvider === 'local' || !preferredProvider) {
        const localModel = editModels.find(m => m.provider === 'local');
        if (localModel) {
          return await modelManager.generateContent({
            model: localModel,
            prompt: `Edit this image: ${editInstruction}`,
            context: {
              file: {
                mimeType: 'image/jpeg',
                data: currentImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''),
                name: 'current-image'
              }
            }
          });
        }
      }

      // Fall back to Gemini
      return await editInfographicImageOriginal(currentImageBase64, editInstruction);
    } catch (error) {
      console.warn('Enhanced image editing failed, falling back to original:', error);
      return editInfographicImageOriginal(currentImageBase64, editInstruction);
    }
  };

  // Original image editing
  const editInfographicImageOriginal = async (currentImageBase64: string, editInstruction: string): Promise<string> => {
    const cleanBase64 = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await this.fallbackGemini.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
           { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
           { text: editInstruction }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
    });

     const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to edit image");
  };

  // Helper functions from original service
  const getLevelInstruction = (level: ComplexityLevel): string => {
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
  };

  const getStyleInstruction = (style: VisualStyle): string => {
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
  };

  // Export model utilities for UI
  export const getAvailableModels = () => {
    return {
      providers: modelManager.getAvailableProviders(),
      textModels: modelManager.getModelsByType('text'),
      imageModels: modelManager.getModelsByType('image'),
      videoModels: modelManager.getModelsByType('video')
    };
  };

  // Performance monitoring
  export const trackModelPerformance = (modelId: string, type: string, duration: number, success: boolean) => {
    // Store performance metrics
    const metrics = JSON.parse(localStorage.getItem('hkm_model_metrics') || '{}');
    if (!metrics[modelId]) {
      metrics[modelId] = { type, avgDuration: 0, successCount: 0, totalCount: 0 };
    }

    metrics[modelId].totalCount++;
    if (success) metrics[modelId].successCount++;

    // Update average duration
    const totalDuration = (metrics[modelId].avgDuration * (metrics[modelId].totalCount - 1)) + duration;
    metrics[modelId].avgDuration = totalDuration / metrics[modelId].totalCount;

    localStorage.setItem('hkm_model_metrics', JSON.stringify(metrics));
  };

  // Cost estimation
  export const estimateCost = (modelId: string, inputTokens: number, outputTokens?: number): number => {
    const models = modelManager.getModelsByType('text');
    const model = models.find(m => m.id === modelId);

    if (!model || !model.costPerToken) return 0;

    const totalTokens = inputTokens + (outputTokens || 0);
    return totalTokens * model.costPerToken;
  };
}

// Export both enhanced and backward-compatible functions
export const {
  researchTopicForPrompt,
  generateInfographicImage,
  generateExplainerVideo,
  editInfographicImage,
  getAvailableModels,
  trackModelPerformance,
  estimateCost
} = new EnhancedGeminiService();