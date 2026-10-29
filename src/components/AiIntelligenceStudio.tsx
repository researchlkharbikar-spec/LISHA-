/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA AI Intelligence & High-Thinking Studio
 * Models: gemini-4-argon (ThinkingLevel.HIGH), gemini-3.8-flash (Search Grounding),
 * gemini-3.1-flash-lite (Fast), gemini-3-pro-image (1K/2K/4K, aspect ratios), and gemini-nano-banana-2.1 (edit images).
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Brain,
  Search,
  Zap,
  Image as ImageIcon,
  Edit3,
  BookOpen,
  Send,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface AiIntelligenceStudioProps {
  initialPrompt?: string;
}

export const AiIntelligenceStudio: React.FC<AiIntelligenceStudioProps> = ({
  initialPrompt = '',
}) => {
  const [activeTab, setActiveTab] = useState<'reasoning' | 'image-gen' | 'image-edit' | 'literature'>('reasoning');

  // Text Reasoning States
  const [prompt, setPrompt] = useState(
    initialPrompt ||
      'Formulate a detailed biophysical hypothesis explaining how plant lncRNAs (e.g. ALEX1 or lncRNA-Rsm1) coordinate with stomatal aperture regulation and transpirational cooling during early fungal and bacterial pathogen invasion.'
  );
  const [modelChoice, setModelChoice] = useState<'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-4-argon');
  const [enableThinking, setEnableThinking] = useState(true);
  const [enableSearch, setEnableSearch] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);

  // Image Generation States
  const [imagePrompt, setImagePrompt] = useState(
    'High-resolution publication-quality scientific mechanism diagram of plant lncRNA sponging miRNA to derepress defense transcription factors in rice leaf mesophyll cells during Magnaporthe oryzae blast invasion, vector style, crisp biological details.'
  );
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [imageSize, setImageSize] = useState<string>('2K');
  const [imageModel, setImageModel] = useState<string>('gemini-3-pro-image');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Image Edit States
  const [editImagePrompt, setEditImagePrompt] = useState('Add clear scientific labels pointing to the lncRNA hairpin loop and the fungal appressorium');
  const [editSourceImage, setEditSourceImage] = useState<string | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  // Literature Search States
  const [litQuery, setLitQuery] = useState('plant lncRNA biotic stress pathogen defense');
  const [isSearchingLit, setIsSearchingLit] = useState(false);
  const [litArticles, setLitArticles] = useState<any[]>([]);

  // Text generation handler
  const handleGenerateText = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingText(true);
    setGeneratedText(null);
    setGroundingSources([]);

    try {
      const res = await fetch('/api/gemini/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelChoice,
          enableThinking: modelChoice === 'gemini-4-argon' ? enableThinking : false,
          enableSearch: modelChoice === 'gemini-3.8-flash' ? enableSearch : false,
          systemInstruction:
            'You are an expert computational biologist and plant pathologist at ICAR-NIBSM. Provide thorough, scientifically rigorous, publication-grade explanations with molecular details and experimental validation strategies.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate response');

      setGeneratedText(data.text);
      if (data.groundingMetadata?.groundingChunks) {
        setGroundingSources(data.groundingMetadata.groundingChunks);
      }
    } catch (err: any) {
      console.error(err);
      setGeneratedText(`Error: ${err.message}`);
    } finally {
      setIsGeneratingText(false);
    }
  };

  // Image generation handler
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio,
          imageSize,
          model: imageModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate image');
      setGeneratedImageUrl(data.imageUrl);
      setEditSourceImage(data.imageUrl); // auto-prime for edit
    } catch (err: any) {
      console.error(err);
      alert(`Image Generation Failed: ${err.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Image edit handler
  const handleEditImage = async () => {
    if (!editSourceImage || !editImagePrompt.trim()) return;
    setIsEditingImage(true);
    setEditedImageUrl(null);

    try {
      const res = await fetch('/api/gemini/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: editSourceImage,
          prompt: editImagePrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to edit image');
      setEditedImageUrl(data.imageUrl);
    } catch (err: any) {
      console.error(err);
      alert(`Image Edit Failed: ${err.message}`);
    } finally {
      setIsEditingImage(false);
    }
  };

  // Search Europe PMC literature
  const handleSearchLiterature = async () => {
    if (!litQuery.trim()) return;
    setIsSearchingLit(true);

    try {
      const res = await fetch(`/api/science/literature?q=${encodeURIComponent(litQuery)}&limit=10`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Literature search failed');
      setLitArticles(data.articles || []);
    } catch (err: any) {
      console.error(err);
      alert(`Literature search error: ${err.message}`);
    } finally {
      setIsSearchingLit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-md">
                AI Scientific Studio
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Gemini Intelligence, Deep Thinking & High-Res Diagram Generation
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Harness flagship models: gemini-4-argon with High Thinking level for complex biophysical hypotheses, gemini-3.8-flash with Google Search Grounding for real-time citations, and gemini-3-pro-image (1K/2K/4K) for publication figures.
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('reasoning')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                activeTab === 'reasoning'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Deep Thinking</span>
            </button>

            <button
              onClick={() => setActiveTab('image-gen')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                activeTab === 'image-gen'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Diagram Generator (1K-4K)</span>
            </button>

            <button
              onClick={() => setActiveTab('image-edit')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                activeTab === 'image-edit'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Diagram</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('literature');
                if (litArticles.length === 0) handleSearchLiterature();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                activeTab === 'literature'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Literature Scout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Reasoning & Intelligence */}
      {activeTab === 'reasoning' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <Brain className="w-4 h-4 text-amber-600" />
              Biophysical Hypothesis Configuration
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Model Architecture
              </label>
              <select
                value={modelChoice}
                onChange={(e) => setModelChoice(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-medium"
              >
                <option value="gemini-4-argon">gemini-4-argon (Complex Tasks & High Thinking)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (General Tasks & Google Search)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Tasks)</option>
              </select>
            </div>

            {/* High Thinking toggle */}
            {modelChoice === 'gemini-4-argon' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="highThinkingToggle"
                  checked={enableThinking}
                  onChange={(e) => setEnableThinking(e.target.checked)}
                  className="mt-0.5 accent-purple-600"
                />
                <label htmlFor="highThinkingToggle" className="text-xs text-purple-900 cursor-pointer">
                  <span className="font-bold block">Enable High Thinking (thinkingLevel: HIGH)</span>
                  <span className="text-[11px] text-purple-700">
                    Allocates deep reasoning tokens to thoroughly dissect structural, epigenetic, and physiological interactions without truncation.
                  </span>
                </label>
              </div>
            )}

            {/* Google Search Grounding toggle */}
            {modelChoice === 'gemini-3.8-flash' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="searchToggle"
                  checked={enableSearch}
                  onChange={(e) => setEnableSearch(e.target.checked)}
                  className="mt-0.5 accent-blue-600"
                />
                <label htmlFor="searchToggle" className="text-xs text-blue-900 cursor-pointer">
                  <span className="font-bold block">Google Search Grounding (googleSearch: &#123;&#125;)</span>
                  <span className="text-[11px] text-blue-700">
                    Retrieves real-time citations and the latest NCBI/EBI research papers.
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Scientific Query / Prompt
              </label>
              <textarea
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 leading-relaxed"
                placeholder="Ask a deep biophysical question..."
              />
            </div>

            {/* Quick Prompts */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Quick Prompt Suggestions:</span>
              <div className="flex flex-col gap-1 text-[11px]">
                <button
                  onClick={() =>
                    setPrompt(
                      'Contrast the molecular mechanism of lncRNA-Rsm1 in sponging miR166 against blast fungus Magnaporthe oryzae versus ALEX1 in bacterial blight Xanthomonas oryzae in rice.'
                    )
                  }
                  className="text-left text-blue-600 hover:underline truncate"
                >
                  &bull; Rice Blast vs Bacterial Blight lncRNA mechanism
                </button>
                <button
                  onClick={() =>
                    setPrompt(
                      'How do plant lncRNAs form R-loops and RNA-DNA triplex structures at chromatin promoters like AtPR1 to modulate mediator complex MED19a during PTI?'
                    )
                  }
                  className="text-left text-blue-600 hover:underline truncate"
                >
                  &bull; RNA-DNA Triplex formation at AtPR1 promoter
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateText}
              disabled={isGeneratingText}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isGeneratingText ? 'Synthesizing with Gemini...' : 'Run Intelligence Synthesis'}</span>
            </button>
          </div>

          {/* Results Output */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Synthesized Scientific Intelligence
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                  {modelChoice} {enableThinking ? '+ High Thinking' : ''} {enableSearch ? '+ Google Search' : ''}
                </span>
              </div>

              {isGeneratingText ? (
                <div className="py-20 text-center text-slate-500 text-xs space-y-2">
                  <div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-medium text-slate-700">Evaluating multi-omic pathways and biophysical literature...</p>
                  <p className="text-[11px] text-slate-400">High thinking enabled for maximum reasoning depth.</p>
                </div>
              ) : generatedText ? (
                <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed whitespace-pre-line max-h-[500px] overflow-y-auto pr-1">
                  {generatedText}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs">
                  Select your model, customize the scientific query, and click "Run Intelligence Synthesis" to receive in-depth findings.
                </div>
              )}
            </div>

            {/* Grounding Sources */}
            {groundingSources.length > 0 && (
              <div className="pt-3 border-t border-slate-100 mt-4">
                <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Search className="w-3 h-3 text-blue-600" />
                  Google Search Grounding Sources:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {groundingSources.map((chunk, idx) => (
                    <a
                      key={idx}
                      href={chunk.web?.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded border border-blue-200 hover:underline truncate max-w-xs"
                    >
                      {chunk.web?.title || chunk.web?.uri}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: High Quality Diagram Generator */}
      {activeTab === 'image-gen' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <ImageIcon className="w-4 h-4 text-amber-600" />
              Scientific Figure & Diagram Parameters
            </h3>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Image Generation Model
              </label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-medium"
              >
                <option value="gemini-3-pro-image">gemini-3-pro-image (Studio Quality)</option>
                <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (High-Resolution Configurable)</option>
              </select>
            </div>

            {/* Aspect Ratio Affordance */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 px-2 rounded border text-center font-mono ${
                      aspectRatio === ratio
                        ? 'bg-amber-600 text-white border-amber-600 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Size Affordance */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Image Resolution Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['1K', '2K', '4K'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setImageSize(size)}
                    className={`py-2 px-3 rounded-lg border text-center font-bold text-xs ${
                      imageSize === size
                        ? 'bg-amber-100 text-amber-900 border-amber-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {size} Resolution
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Figure Illustration Prompt
              </label>
              <textarea
                rows={5}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white leading-relaxed"
                placeholder="Describe the scientific mechanism diagram..."
              />
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingImage ? 'Rendering High-Resolution Figure...' : `Generate ${imageSize} Figure (${aspectRatio})`}</span>
            </button>
          </div>

          {/* Rendered Image Viewer */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-900">Rendered Scientific Output</span>
                {generatedImageUrl && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    {imageSize} • {aspectRatio}
                  </span>
                )}
              </div>

              {isGeneratingImage ? (
                <div className="py-24 text-center text-slate-500 text-xs space-y-2">
                  <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-semibold text-slate-700">Synthesizing diagram at {imageSize} resolution...</p>
                  <p className="text-[11px] text-slate-400">Model: {imageModel} • Aspect: {aspectRatio}</p>
                </div>
              ) : generatedImageUrl ? (
                <div className="space-y-3">
                  <img
                    src={generatedImageUrl}
                    alt="Generated scientific figure"
                    className="max-h-[460px] mx-auto rounded-lg shadow-sm border border-slate-200 object-contain"
                  />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500 truncate max-w-sm">
                      {imagePrompt.slice(0, 70)}...
                    </span>
                    <a
                      href={generatedImageUrl}
                      download={`LISHA_Figure_${imageSize}_${aspectRatio.replace(':', 'x')}.png`}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {imageSize}</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-slate-400 text-xs">
                  Configure aspect ratio and resolution on the left, then click Generate to create high-resolution scientific diagrams.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Edit Image */}
      {activeTab === 'image-edit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <Edit3 className="w-4 h-4 text-amber-600" />
              Edit Image with gemini-nano-banana-2.1
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Source Image (Generated or Uploaded)
              </label>
              {editSourceImage ? (
                <div className="relative">
                  <img
                    src={editSourceImage}
                    alt="Source for editing"
                    className="max-h-48 rounded border border-slate-200 object-contain mx-auto bg-slate-50"
                  />
                  <label className="mt-2 block text-center text-xs text-blue-600 cursor-pointer hover:underline">
                    <span>Upload different source image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setEditSourceImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block py-8 border-2 border-dashed border-slate-300 rounded-lg text-center">
                  <span className="text-xs text-slate-500">Upload source image to edit</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setEditSourceImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Edit Instruction Prompt
              </label>
              <textarea
                rows={4}
                value={editImagePrompt}
                onChange={(e) => setEditImagePrompt(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                placeholder="Describe modifications (e.g. Add red callout circles around the binding site)..."
              />
            </div>

            <button
              onClick={handleEditImage}
              disabled={!editSourceImage || isEditingImage}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEditingImage ? 'Editing with gemini-nano-banana-2.1...' : 'Apply Image Edit'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 mb-3">
              Edited Image Result
            </h4>

            {isEditingImage ? (
              <div className="py-24 text-center text-slate-500 text-xs space-y-2">
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Modifying figure with gemini-nano-banana-2.1...</p>
              </div>
            ) : editedImageUrl ? (
              <div className="space-y-3">
                <img
                  src={editedImageUrl}
                  alt="Edited result"
                  className="max-h-[460px] mx-auto rounded-lg shadow-sm border border-slate-200 object-contain"
                />
                <div className="text-right">
                  <a
                    href={editedImageUrl}
                    download="LISHA_Edited_Figure.png"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Edited Image</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 text-xs">
                Upload or select an image on the left, enter modification instructions, and apply edit.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Scientific Literature Scout */}
      {activeTab === 'literature' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Europe PMC / PubMed Live Scientific Literature Feed
              </h3>
              <p className="text-xs text-slate-500">
                Direct query to EMBL-EBI Europe PMC REST API for peer-reviewed citations and open-access full text.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={litQuery}
                onChange={(e) => setLitQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLiterature()}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg w-full sm:w-72 bg-slate-50"
                placeholder="Search literature..."
              />
              <button
                onClick={handleSearchLiterature}
                disabled={isSearchingLit}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>

          {isSearchingLit ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Searching scientific publications on Europe PMC...
            </div>
          ) : litArticles.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {litArticles.map((art, idx) => (
                <div key={idx} className="py-3.5 space-y-1 hover:bg-slate-50/60 p-2 rounded transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {art.title.replace(/<\/?[^>]+(>|$)/g, '')}
                    </h4>
                    {art.isOpenAccess && (
                      <span className="shrink-0 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        Open Access
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {art.authorString} &bull; <span className="italic">{art.journalTitle}</span> ({art.pubYear})
                  </p>
                  {art.abstractText && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {art.abstractText.replace(/<\/?[^>]+(>|$)/g, '')}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-1 text-[11px]">
                    {art.pmid && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${art.pmid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>PubMed: {art.pmid}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {art.fullTextUrl && (
                      <a
                        href={art.fullTextUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Full Article</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-slate-400">Cited by {art.citedByCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No publications retrieved. Enter a query and click Search.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
