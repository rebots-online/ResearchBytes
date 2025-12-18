# Local WAN Model Running Guide & OpenRouter Kimi Integration

## Quick Update: Kimi on OpenRouter ✅

Yes, **Kimi IS available on OpenRouter**! Here are the current models:

| Kimi Model | OpenRouter ID | Context Window | Pricing | Use Cases |
|-----------|---------------|---------------|---------|----------|
| **Kimi 8K** | `moonshot-v1-8k` | 8,192 tokens | $0.004/1K | Medium documents, code analysis |
| **Kimi 32K** | `moonshot-v1-32k` | 32,768 tokens | $0.012/1K | Long research papers, books |
| **Kimi 128K** | Not on OR | 128,000 tokens | Direct API needed | Ultra-long documents (use K2K when available) |

## Local WAN Model Implementation

### WAN Model Availability for RTX 3090

Yes! You can run WAN models locally. Here's what's available:

#### 1. Official Alibaba WAN Community Release

```bash
# WAN 2.2 Community Model
# GitHub: https://github.com/alibaba/WAN
# HuggingFace: https://huggingface.co/alibaba/Wan2.2

# Clone the repository
git clone https://github.com/alibaba/WAN.git
cd WAN

# Install dependencies
pip install -r requirements.txt

# Download WAN 2.2 weights (~7GB for base model)
# Check the repo for specific checkpoint downloads
```

#### 2. ComfyUI Integration (Recommended)

ComfyUI supports WAN models through custom nodes:

```bash
# Install ComfyUI if not already installed
cd ComfyUI

# Install WAN support
pip install transformers diffusers accelerate

# Place WAN model in ComfyUI/models/diffusers
# Create custom node for WAN generation
```

#### 3. VRAM Requirements for WAN Models

| Configuration | Single RTX 3090 | Dual RTX 3090 | Notes |
|---------------|----------------|---------------|-------|
| **WAN 2.2 Base** | ~12GB | - | 720p, 2s video |
| **WAN 2.2 XL** | ~20GB | - | 1080p, 5s video |
| **WAN 2.2 + ControlNet** | ~18GB | - | For camera control |
| **Batch Processing** | Not recommended | ~24GB total | Process multiple videos |

### WAN Model Implementation in HKM

#### 1. Update Model Manager

```typescript
// services/WANLocalProvider.ts
export class WANLocalProvider {
  private comfyUIEndpoint: string;
  private modelLoaded = false;

  constructor(comfyUIEndpoint = 'http://localhost:8188') {
    this.comfyUIEndpoint = comfyUIEndpoint;
  }

  async checkModelAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.comfyUIEndpoint}/system_stats`);
      const stats = await response.json();

      // Check if WAN model is loaded
      const models = stats.models || [];
      this.modelLoaded = models.some((m: any) =>
        m.model_name.toLowerCase().includes('wan') ||
        m.model_name.toLowerCase().includes('alibaba')
      );

      return this.modelLoaded;
    } catch {
      return false;
    }
  }

  async generateVideoLocally(
    prompt: string,
    duration: '2s' | '5s' = '5s',
    resolution: '720p' | '1080p' = '720p',
    cameraControl?: string
  ): Promise<string> {
    if (!this.modelLoaded) {
      throw new Error('WAN model not loaded in ComfyUI');
    }

    // Create WAN-specific workflow
    const workflow = this.createWANWorkflow(prompt, duration, resolution, cameraControl);

    const response = await fetch(`${this.comfyUIEndpoint}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    });

    const data = await response.json();

    // Poll for completion
    return await this.waitForWANCompletion(data.prompt_id);
  }

  private createWANWorkflow(
    prompt: string,
    duration: string,
    resolution: string,
    cameraControl?: string
  ): any {
    const frames = duration === '5s' ? 120 : 48; // 24fps

    return {
      "1": {
        "inputs": {
          "text": `Generate a ${duration} video: ${prompt}\n${cameraControl ? `Camera: ${cameraControl}` : ''}`,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "2": {
        "inputs": {
          "text": "",
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "3": {
        "inputs": {
          "width": resolution === '1080p' ? 1920 : 1280,
          "height": resolution === '1080p' ? 1080 : 720,
          "batch_size": 1
        },
        "class_type": "EmptyLatentVideo"
      },
      "4": {
        "inputs": {
          "ckpt_name": "wan2.2.safetensors",
          "lora_name": "wan2.2_controlnet.safetensors"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 30,
          "cfg": 7.5,
          "sampler_name": "dpmpp_2m_sde",
          "scheduler": "karras",
          "denoise": 1.0,
          "model": ["4", 0],
          "positive": ["1", 0],
          "negative": ["2", 0],
          "latent_video": ["3", 0],
          "frames": frames
        },
        "class_type": "WAN_Video_Sampler"
      },
      "6": {
        "inputs": {
          "fps": 24,
          "frames": frames,
          "latent_video": ["5", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecodeVideo"
      },
      "7": {
        "inputs": {
          "frame_rate": 24,
          "motion_bucket_id": 127,
          "frames": ["6", 0],
          "audio_optimization_mode": "fps",
          "fps_id": 8
        },
        "class_type": "VHS_VideoCombine"
      },
      "8": {
        "inputs": {
          "filename_prefix": "WAN_video",
          "frames": ["7", 0]
        },
        "class_type": "SaveAnimatedWEBP"
      }
    };
  }

  private async waitForWANCompletion(promptId: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes timeout

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.comfyUIEndpoint}/history/${promptId}`);
      const data = await response.json();

      if (data[promptId] && data[promptId].outputs) {
        const outputs = data[promptId].outputs;
        if (outputs['8'] && outputs['8'].gifs) {
          const video = outputs['8'].gifs[0];
          const videoUrl = `${this.comfyUIEndpoint}/view?filename=${video.filename}`;

          // Convert to blob URL
          const blobResponse = await fetch(videoUrl);
          const blob = await blobResponse.blob();
          return URL.createObjectURL(blob);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Video generation timeout');
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    modelLoaded: boolean;
    vramUsage: number;
    generationTime: number;
    successRate: number;
  }> {
    const stats = await fetch(`${this.comfyUIEndpoint}/system_stats`).then(r => r.json());
    const metrics = JSON.parse(localStorage.getItem('hkm_wan_metrics') || '{}');

    return {
      modelLoaded: this.modelLoaded,
      vramUsage: stats.system_stats.vram?.used_mb || 0,
      generationTime: metrics.avgGenerationTime || 0,
      successRate: metrics.successRate || 100
    };
  }
}
```

#### 2. Enhanced Model Selection

```typescript
// Updated ModelManager with local WAN support
export class EnhancedModelManager {
  private wanLocalProvider: WANLocalProvider;

  constructor() {
    this.wanLocalProvider = new WANLocalProvider();
  }

  async generateVideoWithOptimalProvider(
    prompt: string,
    requirements: {
      quality: 'standard' | 'high' | 'ultra';
      speed: 'fast' | 'normal' | 'slow';
      budget?: number;
    }
  ): Promise<string> {
    // Check if local WAN is available and suitable
    const localAvailable = await this.wanLocalProvider.checkModelAvailability();

    if (localAvailable) {
      // Use local WAN for speed and cost savings
      if (requirements.speed === 'fast' || requirements.budget) {
        try {
          console.log('Using local WAN model for video generation');
          return await this.wanLocalProvider.generateVideoLocally(
            prompt,
            requirements.quality === 'ultra' ? '2s' : '5s',
            requirements.quality === 'ultra' ? '1080p' : '720p'
          );
        } catch (error) {
          console.warn('Local WAN generation failed, falling back to API:', error);
        }
      }
    }

    // Fallback to OpenRouter WAN
    const wanModels = this.models.filter(m => m.type === 'video' && m.provider === 'openrouter');
    if (wanModels.length > 0) {
      return await this.generateVideoViaOpenRouter(prompt, wanModels[0]);
    }

    // Final fallback to Gemini Veo
    return await this.generateVideoViaGemini(prompt);
  }

  private async generateVideoViaOpenRouter(prompt: string, model: ModelConfig): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{
          role: 'user',
          content: `Generate a video: ${prompt}\n\nProvide the video URL or download link.`
        }]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

### Setup Guide for Local WAN Models

#### Step 1: Install ComfyUI

```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install transformers diffusers accelerate
```

#### Step 2: Download WAN Model

```bash
# Download from HuggingFace
git lfs install
git clone https://huggingface.co/alibaba/Wan2.2

# Place model in correct directory
mv Wan2.2/ ComfyUI/models/diffusers/

# Or download directly (faster)
wget https://huggingface.co/alibaba/Wan2.2/resolve/main/wan2.2.safetensors
```

#### Step 3: Add WAN Custom Node

Create `custom_nodes/wan_video.py` in ComfyUI:

```python
import torch
from diffusers import WanPipeline
import comfy.model_management as mm

class WAN_Video_Sampler:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "model": ("MODEL",),
            "positive": ("CONDITIONING",),
            "negative": ("CONDITIONING",),
            "latent_video": ("LATENT",),
            "frames": ("INT", {"default": 120}),
            "steps": ("INT", {"default": 30}),
            "cfg": ("FLOAT", {"default": 7.5}),
            "seed": ("INT", {"default": 42}),
        }

    CATEGORY = "video"

    def __init__(self, model, positive, negative, latent_video, frames, steps, cfg, seed):
        self.model = model
        self.positive = positive
        self.negative = negative
        self.latent_video = latent_video
        self.frames = frames
        self.steps = steps
        self.cfg = cfg
        self.seed = seed

    @classmethod
    def VALIDATE_INPUTS(cls, input_types):
        return True

    def load_model(self):
        pipe = WanPipeline.from_pretrained("alibaba/Wan2.2", torch_dtype=torch.float16)
        pipe = pipe.to("cuda")
        return pipe

    def generate(self):
        pipe = self.load_model()

        with torch.no_grad():
            video = pipe(
                prompt=self.positive,
                negative_prompt=self.negative,
                num_frames=self.frames,
                num_inference_steps=self.steps,
                guidance_scale=self.cfg,
                generator=torch.manual_seed(self.seed),
                latents=self.latent_video
            ).frames

        return (video,)
```

#### Step 4: Update HKM Configuration

```typescript
// types.ts - Add new model configurations
export interface LocalModelConfig {
  provider: 'wan-local';
  modelPath: string;
  vramRequired: number;
  capabilities: string[];
  quality: 'standard' | 'high' | 'ultra';
}

// .env - Add local model settings
WAN_LOCAL_ENABLED=true
WAN_MODEL_PATH=/path/to/WAN2.2
WAN_MAX_FRAMES=120
```

## Kimi Integration via OpenRouter

### Kimi Model Selection in HKM

```typescript
// services/KimiProvider.ts
export class KimiProvider {
  private openRouterKey: string;

  constructor(apiKey: string) {
    this.openRouterKey = apiKey;
  }

  async selectKimiModel(
    documentLength: number,
    complexity: 'simple' | 'complex' | 'very-complex'
  ): Promise<string> {
    // Smart model selection based on document length
    if (documentLength < 10000) return 'moonshot-v1-8k';
    if (documentLength < 50000) return 'moonshot-v1-32k';

    // For very complex or long documents, prefer 32K
    if (complexity === 'very-complex') return 'moonshot-v1-32k';

    return 'moonshot-v1-32k'; // Default to larger model
  }

  async processWithKimi(
    documents: UploadedFile[],
    query: string,
    analysisType: 'summary' | 'comparison' | 'insights'
  ): Promise<string> {
    const totalLength = documents.reduce((sum, doc) => sum + doc.name.length + 1000, 0);
    const modelId = await this.selectKimiModel(totalLength, 'complex');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hkm.visualresearch.ai',
        'X-Title': 'Kimi Document Analysis'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user',
          content: `Analyze these documents and provide ${analysisType}:

          Documents: ${documents.map(d => d.name).join(', ')}

          Question: ${query}

          Please provide comprehensive analysis based on the document content.`
        }],
        temperature: 0.3,
        max_tokens: modelId.includes('32k') ? 8000 : 4000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

### Kimi-Specific Prompt Optimization

```typescript
// services/KimiPromptAdapter.ts
export class KimiPromptAdapter {
  static adaptForLongDocument(
    documentType: 'research' | 'legal' | 'technical' | 'report',
    question: string,
    documentCount: number
  ): string {
    const typeInstructions = {
      research: "Identify research gaps, methodologies, and future directions",
      legal: "Extract key legal provisions, obligations, and risk factors",
      technical: "Analyze technical architecture, dependencies, and implementation details",
      report: "Summarize findings, recommendations, and action items"
    };

    return `
    Please analyze ${documentCount} document(s) (${documentType} type) and provide insights on: ${question}

    Focus on: ${typeInstructions[documentType]}

    Instructions:
    1. Provide structured analysis with clear sections
    2. Include specific quotes or references when relevant
    3. Highlight contradictions or ambiguities
    4. Suggest follow-up questions or areas needing clarification

    Kimi excels at comprehensive document analysis - utilize its full potential.
    `;
  }

  static adaptForBilingualComparison(
    documents: UploadedFile[],
    comparisonCriteria: string[]
  ): string {
    return `
    Compare and contrast the following documents from multiple perspectives:

    Documents: ${documents.map((d, i) => `${i + 1}. ${d.name}`).join('\n')}

    Comparison Criteria:
    ${comparisonCriteria.join('\n')}

    For each criterion, please:
    1. Identify similarities and differences
    2. Provide specific examples from the documents
    3. Assess relative strengths and weaknesses
    4. Highlight unique insights or contradictions

    Present findings in a structured comparison table format.
    `;
  }
}
```

## Performance Optimization

### VRAM Management

```typescript
// services/VRAMManager.ts
export class VRAMManager {
  static async optimizeForWAN(): Promise<string[]> {
    const nvidiaSMI = await this.getNvidiaSMIOutput();
    const vramUsed = this.parseVRAM(nvidiaSMI);
    const totalVRAM = 24000; // RTX 3090

    // Optimize based on VRAM usage
    if (vramUsed > 18000) {
      return [
        'Unload unused models from GPU',
        'Use 720p resolution instead of 1080p',
        'Reduce video length to 2 seconds',
        'Enable CPU offloading if available'
      ];
    }

    if (vramUsed > 12000) {
      return [
        'Consider 720p resolution',
        'Monitor VRAM usage during generation',
        'Prepare to offload models if needed'
      ];
    }

    return ['VRAM usage acceptable for full quality generation'];
  }

  private static async getNvidiaSMIOutput(): Promise<string> {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'system',
        prompt: 'Run nvidia-smi',
        stream: false
      })
    });

    return response.text;
  }
}
```

## Usage Recommendations

### When to Use Local WAN Models

✅ **Use Local WAN**:
- Frequent video generation
- Cost-sensitive projects
- Privacy requirements
- Faster iteration needed
- Standard quality sufficient

❌ **Use OpenRouter WAN**:
- One-off generations
- Need ultra-high quality
- Limited local storage
- Don't want to manage local setup

### When to Use Kimi via OpenRouter

✅ **Perfect Use Cases**:
- Document analysis up to 32K tokens
- Research paper summarization
- Long-form content processing
- Multi-document comparison
- Code repository analysis

### Implementation Priority

1. **Week 1**: Set up OpenRouter Kimi integration (immediate benefit)
2. **Week 2**: Install ComfyUI and WAN model (local video generation)
3. **Week 3**: Optimize VRAM usage and batch processing
4. **Week 4**: Add performance monitoring and optimization

The combination of local WAN models and OpenRouter Kimi provides the best of both worlds: cost-effective local processing and powerful cloud-based long-context analysis.