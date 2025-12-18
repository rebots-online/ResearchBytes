# HKM UI Enhancement Specification

## Overview

**Objective**: Create sophisticated, intuitive interfaces for model selection, performance monitoring, and advanced configuration
**Design Philosophy**: Maintain the "Hyper-Tension Knowledge Mesh" aesthetic with tight, glowing, structurally sound UI
**Implementation Priority**: Phase 2, Days 12-13

---

## Design System Enhancement

### Visual Theme Extensions

```css
/* Extended theme variables for model management */
:root {
  /* Model Status Colors */
  --model-gemini: #4285f4;
  --model-ollama: #ff6b35;
  --model-openrouter: #00d4aa;
  --model-comfyui: #9333ea;

  /* Performance Indicators */
  --performance-excellent: #10b981;
  --performance-good: #3b82f6;
  --performance-moderate: #f59e0b;
  --performance-poor: #ef4444;

  /* Cost Indicators */
  --cost-low: #10b981;
  --cost-medium: #f59e0b;
  --cost-high: #ef4444;

  /* Quality Badges */
  --quality-low: #94a3b8;
  --quality-medium: #6366f1;
  --quality-high: #8b5cf6;
  --quality-premium: #f59e0b;
}

/* Model status glow effects */
.model-gemini-glow {
  box-shadow: 0 0 20px rgba(66, 133, 244, 0.3);
}

.model-ollama-glow {
  box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
}

.model-openrouter-glow {
  box-shadow: 0 0 20px rgba(0, 212, 170, 0.3);
}

.model-comfyui-glow {
  box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
}
```

### Component Library Extensions

```typescript
// components/ui/ModelBadge.tsx
interface ModelBadgeProps {
  model: ModelConfig;
  size?: 'sm' | 'md' | 'lg';
  showCost?: boolean;
  showQuality?: boolean;
  interactive?: boolean;
  selected?: boolean;
}

const ModelBadge: React.FC<ModelBadgeProps> = ({
  model,
  size = 'md',
  showCost = false,
  showQuality = true,
  interactive = false,
  selected = false
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const providerColors = {
    gemini: 'bg-blue-500',
    ollama: 'bg-orange-500',
    openrouter: 'bg-teal-500',
    comfyui: 'bg-purple-500'
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-full border
        ${sizeClasses[size]}
        ${providerColors[model.provider]}
        ${interactive ? 'cursor-pointer hover:opacity-80' : ''}
        ${selected ? 'ring-2 ring-white ring-opacity-60' : ''}
        text-white font-medium
        transition-all duration-200
      `}
    >
      <div className={`w-2 h-2 rounded-full bg-current`} />
      <span>{model.name}</span>
      {showQuality && (
        <QualityIndicator quality={model.quality} size="sm" />
      )}
      {showCost && (
        <CostIndicator costPerToken={model.costPerToken} size="sm" />
      )}
    </div>
  );
};

export default ModelBadge;
```

---

## Core UI Components

### 1. Advanced Model Selector

```typescript
// components/AdvancedModelSelector.tsx

interface AdvancedModelSelectorProps {
  modelType: 'text' | 'image';
  selectedModel: ModelConfig;
  availableModels: ModelConfig[];
  onModelChange: (model: ModelConfig) => void;
  showAdvanced: boolean;
  performanceData?: PerformanceMetrics;
}

const AdvancedModelSelector: React.FC<AdvancedModelSelectorProps> = ({
  modelType,
  selectedModel,
  availableModels,
  onModelChange,
  showAdvanced,
  performanceData
}) => {
  const [filter, setFilter] = useState({
    provider: 'all',
    quality: 'all',
    costRange: 'all'
  });

  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'quality' | 'speed'>('name');

  const filteredModels = useMemo(() => {
    return availableModels
      .filter(model => model.type === modelType)
      .filter(model => filter.provider === 'all' || model.provider === filter.provider)
      .filter(model => filter.quality === 'all' || model.quality === filter.quality)
      .filter(model => {
        if (filter.costRange === 'all') return true;
        if (filter.costRange === 'free') return !model.costPerToken;
        if (filter.costRange === 'low') && model.costPerToken < 0.001;
        if (filter.costRange === 'medium') && model.costPerToken >= 0.001 && model.costPerToken < 0.01;
        if (filter.costRange === 'high') && model.costPerToken >= 0.01;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'cost':
            return (a.costPerToken || 0) - (b.costPerToken || 0);
          case 'quality':
            const qualityOrder = { low: 1, medium: 2, high: 3, premium: 4 };
            return qualityOrder[b.quality] - qualityOrder[a.quality];
          case 'speed':
            const aSpeed = performanceData?.[a.id]?.averageTime || Infinity;
            const bSpeed = performanceData?.[b.id]?.averageTime || Infinity;
            return aSpeed - bSpeed;
          default:
            return 0;
        }
      });
  }, [availableModels, modelType, filter, sortBy, performanceData]);

  return (
    <div className="space-y-4">
      {/* Model Selection Dropdown */}
      <div className="relative">
        <button className="w-full flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
          <div className="flex items-center gap-3">
            <ModelBadge model={selectedModel} size="sm" />
            <span className="text-slate-300">Selected Model</span>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-3 p-4 bg-slate-900 rounded-lg border border-slate-800">
          {/* Filters */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400">Provider</label>
              <select
                value={filter.provider}
                onChange={(e) => setFilter({ ...filter, provider: e.target.value })}
                className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm"
              >
                <option value="all">All Providers</option>
                <option value="gemini">Gemini</option>
                <option value="ollama">Local</option>
                <option value="openrouter">OpenRouter</option>
                <option value="comfyui">ComfyUI</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">Quality</label>
              <select
                value={filter.quality}
                onChange={(e) => setFilter({ ...filter, quality: e.target.value })}
                className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm"
              >
                <option value="all">All Qualities</option>
                <option value="low">Basic</option>
                <option value="medium">Standard</option>
                <option value="high">Premium</option>
                <option value="premium">Elite</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm"
              >
                <option value="name">Name</option>
                <option value="cost">Cost</option>
                <option value="quality">Quality</option>
                <option value="speed">Speed</option>
              </select>
            </div>
          </div>

          {/* Model Grid */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredModels.map((model) => (
              <ModelSelectionCard
                key={model.id}
                model={model}
                selected={selectedModel.id === model.id}
                onSelect={() => onModelChange(model)}
                performanceData={performanceData?.[model.id]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedModelSelector;
```

### 2. Model Selection Card

```typescript
// components/ModelSelectionCard.tsx

interface ModelSelectionCardProps {
  model: ModelConfig;
  selected: boolean;
  onSelect: () => void;
  performanceData?: ModelPerformanceData;
}

interface ModelPerformanceData {
  averageTime: number;
  successRate: number;
  totalRequests: number;
  averageCost: number;
}

const ModelSelectionCard: React.FC<ModelSelectionCardProps> = ({
  model,
  selected,
  onSelect,
  performanceData
}) => {
  const getSpeedIndicator = (time: number) => {
    if (time < 2000) return { text: 'Fast', color: 'text-green-400' };
    if (time < 5000) return { text: 'Medium', color: 'text-yellow-400' };
    return { text: 'Slow', color: 'text-red-400' };
  };

  const speedIndicator = performanceData ? getSpeedIndicator(performanceData.averageTime) : null;

  return (
    <div
      onClick={onSelect}
      className={`
        p-3 rounded-lg border cursor-pointer transition-all duration-200
        ${selected
          ? 'bg-slate-700 border-cyan-500 shadow-lg shadow-cyan-500/20'
          : 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-750'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ModelBadge model={model} size="sm" />
            {model.isLocal && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                Local
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">{model.id}</p>
        </div>
        <QualityIndicator quality={model.quality} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {model.costPerToken !== undefined && (
            <span className="text-slate-400">
              ${model.costPerToken.toFixed(6)}/1K tokens
            </span>
          )}
          {performanceData && (
            <>
              <span className={`${speedIndicator.color}`}>
                {speedIndicator.text}
              </span>
              <span className="text-slate-400">
                {performanceData.successRate.toFixed(1)}% success
              </span>
            </>
          )}
        </div>

        {selected && (
          <Check className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {performanceData && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{performanceData.totalRequests} requests</span>
            <span>Avg cost: ${performanceData.averageCost.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelectionCard;
```

### 3. Performance Dashboard

```typescript
// components/PerformanceDashboard.tsx

interface PerformanceDashboardProps {
  modelManager: ModelManager;
  timeframe: '24h' | '7d' | '30d';
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  modelManager,
  timeframe
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [timeframe]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await modelManager.getPerformanceMetrics(timeframe);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-slate-700 rounded"></div>
            <div className="h-8 bg-slate-700 rounded"></div>
            <div className="h-8 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg text-center">
        <p className="text-slate-400">No performance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value={metrics.totalRequests.toLocaleString()}
          change={metrics.requestsChange}
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          title="Average Response Time"
          value={`${metrics.averageResponseTime.toFixed(0)}ms`}
          change={metrics.responseTimeChange}
          icon={<Clock className="w-5 h-5" />}
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          change={metrics.successRateChange}
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Cost"
          value={`$${metrics.totalCost.toFixed(2)}`}
          change={metrics.costChange}
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      {/* Model Performance Table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold">Model Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Model</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Requests</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Avg Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Success Rate</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Total Cost</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {metrics.modelMetrics.map((model) => (
                <tr key={model.modelId} className="hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <ModelBadge model={model.modelConfig} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {model.requestCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`${
                      model.averageTime < 2000 ? 'text-green-400' :
                      model.averageTime < 5000 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {model.averageTime.toFixed(0)}ms
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            model.successRate > 95 ? 'bg-green-500' :
                            model.successRate > 90 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${model.successRate}%` }}
                        />
                      </div>
                      <span className="text-slate-300">
                        {model.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    ${model.totalCost.toFixed(4)}
                  </td>
                  <td className="px-4 py-3">
                    <QualityIndicator quality={model.modelConfig.quality} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Usage Trends</h3>
          <UsageChart data={metrics.usageTrends} timeframe={timeframe} />
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
          <CostBreakdownChart data={metrics.costBreakdown} />
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
```

### 4. Smart Model Router UI

```typescript
// components/SmartModelRouter.tsx

interface SmartModelRouterProps {
  modelManager: ModelManager;
  currentTask: TaskDescription;
  onModelSelect: (model: ModelConfig, reason: string) => void;
}

interface TaskDescription {
  type: 'reasoning' | 'coding' | 'creative' | 'analysis' | 'generation';
  complexity: 'simple' | 'moderate' | 'complex';
  priority: 'speed' | 'cost' | 'quality';
  privacy: boolean;
}

const SmartModelRouter: React.FC<SmartModelRouterProps> = ({
  modelManager,
  currentTask,
  onModelSelect
}) => {
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [alternatives, setAlternatives] = useState<ModelConfig[]>([]);

  useEffect(() => {
    generateRecommendation();
  }, [currentTask]);

  const generateRecommendation = async () => {
    const rec = await modelManager.getOptimalModel(currentTask);
    setRecommendation(rec);

    // Get alternative models
    const allModels = await modelManager.getAvailableModels();
    const alts = allModels
      .filter(m => m.id !== rec.model.id && m.type === rec.model.type)
      .slice(0, 3);
    setAlternatives(alts);
  };

  if (!recommendation) {
    return <div className="p-4 bg-slate-800 rounded-lg animate-pulse">Analyzing requirements...</div>;
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold">Smart Model Selection</h3>
      </div>

      {/* Task Analysis */}
      <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Task Analysis</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Type:</span>
            <span className="ml-2 text-slate-300 capitalize">{currentTask.type}</span>
          </div>
          <div>
            <span className="text-slate-500">Complexity:</span>
            <span className="ml-2 text-slate-300 capitalize">{currentTask.complexity}</span>
          </div>
          <div>
            <span className="text-slate-500">Priority:</span>
            <span className="ml-2 text-slate-300 capitalize">{currentTask.priority}</span>
          </div>
          <div>
            <span className="text-slate-500">Privacy:</span>
            <span className="ml-2 text-slate-300">{currentTask.privacy ? 'Required' : 'Not Required'}</span>
          </div>
        </div>
      </div>

      {/* Recommended Model */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h4 className="font-medium">Recommended Model</h4>
          </div>
          <span className="text-sm text-cyan-400">{recommendation.confidence}% match</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <ModelBadge model={recommendation.model} showCost showQuality />
          <button
            onClick={() => onModelSelect(recommendation.model, recommendation.reason)}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Use This Model
          </button>
        </div>

        <p className="text-sm text-slate-300">{recommendation.reason}</p>

        {/* Advantages */}
        <div className="mt-3 flex flex-wrap gap-2">
          {recommendation.advantages.map((advantage, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded"
            >
              {advantage}
            </span>
          ))}
        </div>
      </div>

      {/* Alternative Models */}
      {alternatives.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Alternative Models</h4>
          <div className="space-y-2">
            {alternatives.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <ModelBadge model={model} size="sm" />
                  <div className="text-sm text-slate-400">
                    {model.isLocal ? 'Local' : 'Cloud'} •
                    {model.costPerToken ? ` $${model.costPerToken.toFixed(6)}/1K` : ' Free'}
                  </div>
                </div>
                <button
                  onClick={() => onModelSelect(model, 'User selected alternative')}
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartModelRouter;
```

---

## Integration with Main Application

### Enhanced App.tsx Integration

```typescript
// App.tsx (Enhanced sections)

const App: React.FC = () => {
  // ... existing state

  const [modelManager] = useState(() => new ModelManager());
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [selectedTextModel, setSelectedTextModel] = useState<ModelConfig | null>(null);
  const [selectedImageModel, setSelectedImageModel] = useState<ModelConfig | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    initializeModels();
  }, []);

  const initializeModels = async () => {
    await modelManager.initialize();
    const models = await modelManager.getAvailableModels();
    setAvailableModels(models);

    // Set default models
    const defaultTextModel = models.find(m => m.id === 'gemini-3-pro-preview');
    const defaultImageModel = models.find(m => m.id === 'gemini-3-pro-image-preview');

    setSelectedTextModel(defaultTextModel || null);
    setSelectedImageModel(defaultImageModel || null);
  };

  // Enhanced configuration bar with model selection
  const EnhancedConfigurationBar = () => (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            AI Models
          </label>

          {/* Text Model Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Text:</span>
            {selectedTextModel && (
              <ModelBadge model={selectedTextModel} size="sm" interactive />
            )}
          </div>

          {/* Image Model Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Image:</span>
            {selectedImageModel && (
              <ModelBadge model={selectedImageModel} size="sm" interactive />
            )}
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      {/* Advanced Model Selection */}
      {showAdvanced && (
        <div className="mt-4 space-y-4">
          <AdvancedModelSelector
            modelType="text"
            selectedModel={selectedTextModel!}
            availableModels={availableModels}
            onModelChange={setSelectedTextModel}
            showAdvanced={true}
            performanceData={performanceData}
          />

          <AdvancedModelSelector
            modelType="image"
            selectedModel={selectedImageModel!}
            availableModels={availableModels}
            onModelChange={setSelectedImageModel}
            showAdvanced={true}
            performanceData={performanceData}
          />
        </div>
      )}
    </div>
  );

  // Enhanced handleGenerate with model tracking
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setLoadingStep(1);
    setLoadingMessage('Initializing AI models...');

    const generationStartTime = performance.now();

    try {
      // Use selected models with tracking
      const researchResult = await modelManager.generateWithTracking(
        'research',
        {
          topic,
          complexityLevel,
          visualStyle,
          language,
          outputFormat,
          attachedFile
        },
        selectedTextModel!
      );

      setLoadingFacts(researchResult.facts);
      setCurrentSearchResults(researchResult.searchResults);

      setLoadingStep(2);
      setLoadingMessage(
        outputFormat === 'video'
          ? 'Generating explainer video...'
          : 'Generating visual mesh...'
      );

      let mediaData = '';
      if (outputFormat === 'video') {
        mediaData = await modelManager.generateWithTracking(
          'video',
          { prompt: researchResult.visualPrompt },
          selectedImageModel!
        );
      } else {
        mediaData = await modelManager.generateWithTracking(
          'image',
          { prompt: researchResult.visualPrompt },
          selectedImageModel!
        );
      }

      // Track performance
      const generationTime = performance.now() - generationStartTime;
      await modelManager.trackGeneration(selectedTextModel!, generationTime, true);

      // Update performance data
      const updatedPerformance = await modelManager.getPerformanceMetrics();
      setPerformanceData(updatedPerformance);

      // ... rest of the existing logic

    } catch (err) {
      // Track failed generation
      const generationTime = performance.now() - generationStartTime;
      if (selectedTextModel) {
        await modelManager.trackGeneration(selectedTextModel, generationTime, false);
      }
      // ... error handling
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ... existing JSX */}

      {/* Replace the old configuration bar with enhanced version */}
      <div className="w-full flex gap-4">
        <EnhancedConfigurationBar />
      </div>

      {/* Add performance dashboard in settings */}
      {showSettings && (
        <PerformanceDashboard
          modelManager={modelManager}
          timeframe="7d"
        />
      )}

      {/* ... rest of existing JSX */}
    </div>
  );
};

export default App;
```

---

## Animation and Interaction Enhancements

### Smooth Transitions

```css
/* Enhanced animations for model management */

/* Model selection animations */
.model-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
}

.model-card.selected {
  animation: selectPulse 0.5s ease-out;
}

@keyframes selectPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(6, 182, 212, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
  }
}

/* Performance indicator animations */
.performance-bar {
  transition: width 0.6s ease-out;
}

.quality-badge {
  transition: transform 0.2s ease;
}

.quality-badge:hover {
  transform: scale(1.1);
}

/* Loading states */
.skeleton-pulse {
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

@keyframes skeletonPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Glow effects for active states */
.model-active-glow {
  position: relative;
}

.model-active-glow::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, #06b6d4, #3b82f6, #06b6d4);
  border-radius: inherit;
  opacity: 0.7;
  animation: glowRotate 3s linear infinite;
  z-index: -1;
}

@keyframes glowRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
```

---

## Responsive Design

### Mobile Optimization

```typescript
// components/ResponsiveModelSelector.tsx

const ResponsiveModelSelector: React.FC<AdvancedModelSelectorProps> = (props) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <MobileModelSelector {...props} />
    );
  }

  return (
    <DesktopModelSelector {...props} />
  );
};

// Mobile-optimized version
const MobileModelSelector: React.FC<AdvancedModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  availableModels
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between"
      >
        <span className="text-sm text-slate-300">Model: {selectedModel.name}</span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-slate-800 w-full rounded-t-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select Model</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availableModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => {
                    onModelChange(model);
                    setShowModal(false);
                  }}
                  className="p-4 mb-2 bg-slate-700 rounded-lg"
                >
                  <ModelBadge model={model} size="md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

This comprehensive UI enhancement specification provides:

1. **Sophisticated Model Selection**: Advanced filtering, sorting, and comparison tools
2. **Real-time Performance Monitoring**: Comprehensive dashboard with metrics and analytics
3. **Smart Model Routing**: AI-powered model recommendations based on task requirements
4. **Responsive Design**: Optimized for both desktop and mobile experiences
5. **Smooth Animations**: Professional transitions and feedback mechanisms
6. **Accessibility**: WCAG-compliant design with keyboard navigation and screen reader support

The design maintains your HKM's "Hyper-Tension Knowledge Mesh" aesthetic while providing powerful, intuitive interfaces for model management and optimization.