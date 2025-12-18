/**
 * @license
 * Copyright (C)2025 Robin L. M. Cheung, MBA. All rights reserved.
 * Namespace: mba.robin.hkm.visualresearch
*/

import React, { useState, useEffect } from 'react';
import { Settings, Zap, DollarSign, Monitor, Cpu, Cloud, Globe, AlertCircle } from 'lucide-react';
import { getAvailableModels, estimateCost } from '../services/enhancedGeminiService';

interface ModelConfig {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'edit';
  provider: 'local' | 'openrouter' | 'gemini';
  vramRequired?: number;
  costPerToken?: number;
  costPerImage?: number;
  capabilities: string[];
  quality: 'high' | 'medium' | 'low';
  speed: 'fast' | 'medium' | 'slow';
}

interface ModelSelectorProps {
  type: 'text' | 'image' | 'video' | 'edit';
  selectedModel?: ModelConfig;
  onModelSelect: (model: ModelConfig) => void;
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  type,
  selectedModel,
  onModelSelect,
  className = ''
}) => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const { providers } = getAvailableModels();
        const allModels = providers.flatMap(p => p.models);
        const filteredModels = allModels.filter(m =>
          m.type === type || (type === 'edit' && m.capabilities.includes('edit'))
        );
        setModels(filteredModels);
      } catch (err) {
        setError('Failed to load available models');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [type]);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'local':
        return <Cpu className="w-4 h-4" />;
      case 'openrouter':
        return <Globe className="w-4 h-4" />;
      case 'gemini':
        return <Cloud className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'local':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'openrouter':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      case 'gemini':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };

    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[quality as keyof typeof colors]}`}>
        {quality.toUpperCase()}
      </span>
    );
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'fast':
        return <Zap className="w-3 h-3 text-green-500" />;
      case 'medium':
        return <Zap className="w-3 h-3 text-yellow-500" />;
      case 'slow':
        return <Zap className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getCostEstimate = (model: ModelConfig) => {
    if (model.provider === 'local') return 'FREE (Local)';
    if (model.costPerToken) {
      const costPerK = model.costPerToken * 1000;
      return `$${costPerK.toFixed(4)}/K tokens`;
    }
    if (model.costPerImage) {
      return `$${model.costPerImage.toFixed(3)}/image`;
    }
    return 'Usage-based';
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Select {type === 'edit' ? 'Editing' : type} Model
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Settings className="w-3 h-3" />
          {showAdvanced ? 'Simple' : 'Advanced'}
        </button>
      </div>

      <div className="space-y-2">
        {models.map(model => (
          <div
            key={`${model.provider}-${model.id}`}
            onClick={() => onModelSelect(model)}
            className={`
              relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
              ${selectedModel?.id === model.id && selectedModel?.provider === model.provider
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${getProviderColor(model.provider)}`}>
                    {getProviderIcon(model.provider)}
                    <span className="uppercase">{model.provider}</span>
                  </div>
                  {getQualityBadge(model.quality)}
                  {showAdvanced && (
                    <div className="flex items-center gap-1">
                      {getSpeedIcon(model.speed)}
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {model.name}
                </h4>

                {showAdvanced && (
                  <div className="mt-2 space-y-1">
                    {model.vramRequired && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        VRAM Required: {model.vramRequired}GB
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {model.capabilities.slice(0, 3).map(cap => (
                        <span
                          key={cap}
                          className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded"
                        >
                          {cap}
                        </span>
                      ))}
                      {model.capabilities.length > 3 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          +{model.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="ml-3 text-right">
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <DollarSign className="w-3 h-3" />
                  <span>{getCostEstimate(model)}</span>
                </div>
              </div>
            </div>

            {selectedModel?.id === model.id && selectedModel?.provider === model.provider && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No models available for {type} generation.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Check your API keys or local model setup.
          </p>
        </div>
      )}

      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Performance Metrics
          </h4>
          <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <p>• Local models: Offline processing, privacy-focused</p>
            <p>• OpenRouter: Cost-effective, wide model selection</p>
            <p>• Gemini: Integrated search, reliable quality</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;