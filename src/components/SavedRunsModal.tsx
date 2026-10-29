/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Saved Runs & Bookmarks Workspace
 */

import React from 'react';
import {
  Bookmark,
  Trash2,
  Download,
  Dna,
  LogIn,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { SavedAnalysis, SavedBookmark } from '../firebase/firebaseClient';
import type { User } from 'firebase/auth';

interface SavedRunsModalProps {
  currentUser: User | null;
  onSignIn: () => void;
  savedAnalyses: SavedAnalysis[];
  savedBookmarks: SavedBookmark[];
  onDeleteAnalysis: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  onLoadAnalysis: (analysis: SavedAnalysis) => void;
}

export const SavedRunsModal: React.FC<SavedRunsModalProps> = ({
  currentUser,
  onSignIn,
  savedAnalyses,
  savedBookmarks,
  onDeleteAnalysis,
  onDeleteBookmark,
  onLoadAnalysis,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'analyses' | 'bookmarks'>('analyses');

  const exportAllSaved = () => {
    const data = {
      exportDate: new Date().toISOString(),
      user: currentUser?.email || 'Anonymous',
      analyses: savedAnalyses,
      bookmarks: savedBookmarks,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LISHA_workspace_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-md">
                Firestore Persistence
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                My Research Workspace & Bookmarks
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Securely stored in your personal cloud repository via Firebase Authentication and Firestore database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(savedAnalyses.length > 0 || savedBookmarks.length > 0) && (
              <button
                onClick={exportAllSaved}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export JSON</span>
              </button>
            )}

            {!currentUser && (
              <button
                onClick={onSignIn}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-tab selection */}
        <div className="flex items-center space-x-2 pt-4">
          <button
            onClick={() => setActiveSubTab('analyses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'analyses'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Saved Screenings ({savedAnalyses.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bookmarks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'bookmarks'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarked lncRNAs ({savedBookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {activeSubTab === 'analyses' ? (
          savedAnalyses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No saved screening runs found</p>
              <p>Run any lncRNA-protein, lncRNA-miRNA or triplex screening in the Screening Engine and click "Save to Workspace".</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {savedAnalyses.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                        {item.interactionType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{item.summary}</p>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Target: {item.targetName} &bull; Score: {item.score?.toFixed(2)} &bull; Saved:{' '}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onLoadAnalysis(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Reload</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteAnalysis(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : savedBookmarks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No bookmarked lncRNAs found</p>
            <p>Browse the Curated Knowledgebase and click the bookmark icon on any plant lncRNA record.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {savedBookmarks.map((b) => (
              <div key={b.id} className="py-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">{b.lncRnaName}</div>
                  <div className="text-[11px] text-slate-500 italic">{b.species}</div>
                  {b.notes && <div className="text-[11px] text-slate-600 mt-0.5">{b.notes}</div>}
                </div>
                <button
                  onClick={() => onDeleteBookmark(b.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
