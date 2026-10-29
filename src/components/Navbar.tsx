/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Navigation Bar
 */

import React from 'react';
import {
  Dna,
  Database,
  Activity,
  Sparkles,
  BookOpen,
  Bookmark,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import type { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'screening' | 'biotic-stress' | 'database' | 'ai-studio' | 'concept' | 'saved';
  setActiveTab: (tab: 'screening' | 'biotic-stress' | 'database' | 'ai-studio' | 'concept' | 'saved') => void;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onSignIn,
  onSignOut,
  savedCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top institutional ribbon */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
              ICAR-NIBSM Research Initiative
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="truncate">
              Prof. Lalit Laxman Kharbikar • Principal Scientist, ICAR-NIBSM Raipur, India
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plant Biotic Stress & Biomarker Engine</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main App Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('screening')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-700 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-sm ring-1 ring-slate-900/10">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                  LISHA
                </span>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-200">
                  v1.2 Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                LncRNA Interaction Screening & Homology Assessment
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('screening')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'screening'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Dna className="w-4 h-4 text-blue-600" />
              <span>Screening Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('biotic-stress')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'biotic-stress'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Biotic Stress & Multi-Omics</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'database'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Curated Knowledgebase</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-studio')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'ai-studio'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>AI & Thinking Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('concept')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'concept'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Scientific Concept</span>
            </button>
          </nav>

          {/* Right Action / Auth */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                activeTab === 'saved'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Saved analyses and bookmarks"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Workspace</span>
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                  {savedCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <div className="hidden xl:block text-left text-xs leading-tight">
                  <div className="font-semibold text-slate-800 truncate max-w-[120px]">
                    {currentUser.displayName || 'Scientist'}
                  </div>
                  <div className="text-[10px] text-slate-400">Authenticated</div>
                </div>
                <button
                  onClick={onSignOut}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Sign-In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto text-xs gap-1">
          <button
            onClick={() => setActiveTab('screening')}
            className={`px-2 py-1 rounded font-medium shrink-0 ${
              activeTab === 'screening' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Screening
          </button>
          <button
            onClick={() => setActiveTab('biotic-stress')}
            className={`px-2 py-1 rounded font-medium shrink-0 ${
              activeTab === 'biotic-stress' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Multi-Omics
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-2 py-1 rounded font-medium shrink-0 ${
              activeTab === 'database' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Database
          </button>
          <button
            onClick={() => setActiveTab('ai-studio')}
            className={`px-2 py-1 rounded font-medium shrink-0 ${
              activeTab === 'ai-studio' ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-slate-600'
            }`}
          >
            AI Studio
          </button>
          <button
            onClick={() => setActiveTab('concept')}
            className={`px-2 py-1 rounded font-medium shrink-0 ${
              activeTab === 'concept' ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-slate-600'
            }`}
          >
            Concept
          </button>
        </div>
      </div>
    </header>
  );
};
