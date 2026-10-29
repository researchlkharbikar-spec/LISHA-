/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA (LncRNA Interaction Screening and Homology Assessment)
 * Lead Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-NIBSM, Raipur, India.
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ScreeningEngine } from './components/ScreeningEngine';
import { BioticStressWorkbench } from './components/BioticStressWorkbench';
import { DatabaseBrowser } from './components/DatabaseBrowser';
import { AiIntelligenceStudio } from './components/AiIntelligenceStudio';
import { WhitepaperConcept } from './components/WhitepaperConcept';
import { SavedRunsModal } from './components/SavedRunsModal';
import {
  auth,
  signInWithGoogle,
  logOut,
  onAuthStateChanged,
  saveAnalysisRecord,
  getUserAnalyses,
  deleteAnalysisRecord,
  saveBookmark,
  getUserBookmarks,
  deleteBookmark,
  testFirestoreConnection,
  type User,
  type SavedAnalysis,
  type SavedBookmark,
} from './firebase/firebaseClient';
import type { CuratedLncRNA } from './data/curatedLncRNAs';
import { Dna, Heart, Award, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'screening' | 'biotic-stress' | 'database' | 'ai-studio' | 'concept' | 'saved'>('screening');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Firestore persistent state
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [savedBookmarks, setSavedBookmarks] = useState<SavedBookmark[]>([]);

  // Cross-component coordination state
  const [prefillLncRna, setPrefillLncRna] = useState<{ name: string; sequence: string } | null>(null);
  const [aiStudioInitialPrompt, setAiStudioInitialPrompt] = useState<string>('');

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auth observer
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const analyses = await getUserAnalyses(user.uid);
          setSavedAnalyses(analyses);
          const bookmarks = await getUserBookmarks(user.uid);
          setSavedBookmarks(bookmarks);
        } catch (err) {
          console.warn('Could not load Firestore data on auth change:', err);
        }
      } else {
        // Fallback local memory for guests
        const localAnalyses = localStorage.getItem('lisha_analyses');
        if (localAnalyses) setSavedAnalyses(JSON.parse(localAnalyses));
        const localBookmarks = localStorage.getItem('lisha_bookmarks');
        if (localBookmarks) setSavedBookmarks(JSON.parse(localBookmarks));
      }
    });

    return () => unsubscribe();
  }, []);

  // Save analysis handler
  const handleSaveAnalysis = async (record: {
    title: string;
    lncRnaName: string;
    lncRnaSequence: string;
    interactionType: string;
    targetName: string;
    score: number;
    summary: string;
  }) => {
    const id = `analysis_${Date.now()}`;
    const newRecord: SavedAnalysis = {
      id,
      userId: currentUser?.uid || 'guest_user',
      title: record.title,
      lncRnaName: record.lncRnaName,
      lncRnaSequence: record.lncRnaSequence,
      interactionType: record.interactionType,
      targetName: record.targetName,
      score: record.score,
      summary: record.summary,
      createdAt: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        await saveAnalysisRecord(newRecord);
        setSavedAnalyses((prev) => [newRecord, ...prev]);
        showToast('Saved to your Firestore cloud workspace!');
      } catch (err: any) {
        console.error(err);
        showToast('Saved locally in browser session');
      }
    } else {
      const updated = [newRecord, ...savedAnalyses];
      setSavedAnalyses(updated);
      localStorage.setItem('lisha_analyses', JSON.stringify(updated));
      showToast('Saved to guest workspace (Sign in with Google to sync across devices)');
    }
  };

  // Bookmark handler
  const handleBookmarkLncRNA = async (lnc: CuratedLncRNA) => {
    const isAlreadyBookmarked = savedBookmarks.some((b) => b.lncRnaId === lnc.id);
    if (isAlreadyBookmarked) {
      showToast(`"${lnc.name}" is already in your bookmarks`);
      return;
    }

    const newBookmark: SavedBookmark = {
      id: `bm_${Date.now()}`,
      userId: currentUser?.uid || 'guest_user',
      lncRnaId: lnc.id,
      lncRnaName: lnc.name,
      species: lnc.species,
      notes: `${lnc.diseaseName} (${lnc.pathogen}) - ${lnc.interactionType}`,
      createdAt: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        await saveBookmark(newBookmark);
        setSavedBookmarks((prev) => [newBookmark, ...prev]);
        showToast(`Bookmarked "${lnc.name}" to your Firestore account!`);
      } catch (err) {
        console.error(err);
        showToast(`Bookmarked "${lnc.name}" locally`);
      }
    } else {
      const updated = [newBookmark, ...savedBookmarks];
      setSavedBookmarks(updated);
      localStorage.setItem('lisha_bookmarks', JSON.stringify(updated));
      showToast(`Bookmarked "${lnc.name}" in guest session`);
    }
  };

  // Delete analysis handler
  const handleDeleteAnalysis = async (id: string) => {
    if (currentUser) {
      try {
        await deleteAnalysisRecord(id);
      } catch (err) {
        console.error(err);
      }
    }
    const filtered = savedAnalyses.filter((a) => a.id !== id);
    setSavedAnalyses(filtered);
    localStorage.setItem('lisha_analyses', JSON.stringify(filtered));
    showToast('Analysis record deleted');
  };

  // Delete bookmark handler
  const handleDeleteBookmark = async (id: string) => {
    if (currentUser) {
      try {
        await deleteBookmark(id);
      } catch (err) {
        console.error(err);
      }
    }
    const filtered = savedBookmarks.filter((b) => b.id !== id);
    setSavedBookmarks(filtered);
    localStorage.setItem('lisha_bookmarks', JSON.stringify(filtered));
    showToast('Bookmark removed');
  };

  // Load from database to screening engine
  const handleSelectForScreening = (lnc: CuratedLncRNA) => {
    setPrefillLncRna({ name: lnc.name, sequence: lnc.sequence });
    setActiveTab('screening');
    showToast(`Loaded "${lnc.name}" into Screening Engine`);
  };

  // Reload saved analysis
  const handleLoadSavedAnalysis = (record: SavedAnalysis) => {
    setPrefillLncRna({
      name: record.lncRnaName,
      sequence: record.lncRnaSequence || '',
    });
    setActiveTab('screening');
    showToast(`Loaded "${record.title}" into Screening Engine`);
  };

  // Switch to Gemini AI Studio with pre-formulated prompt
  const handleRequestGeminiInterpretation = (promptText: string, title: string) => {
    setAiStudioInitialPrompt(promptText);
    setActiveTab('ai-studio');
    showToast(`Transferred biophysical parameters to Gemini Thinking Studio`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onSignIn={async () => {
          try {
            await signInWithGoogle();
            showToast('Signed in successfully with Google');
          } catch (err: any) {
            console.error(err);
            showToast(`Sign in error: ${err.message}`);
          }
        }}
        onSignOut={async () => {
          try {
            await logOut();
            showToast('Signed out of LISHA');
          } catch (err: any) {
            console.error(err);
          }
        }}
        savedCount={savedAnalyses.length + savedBookmarks.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'screening' && (
          <ScreeningEngine
            onSaveAnalysis={handleSaveAnalysis}
            onRequestGeminiInterpretation={handleRequestGeminiInterpretation}
            prefillLncRna={prefillLncRna}
          />
        )}

        {activeTab === 'biotic-stress' && (
          <BioticStressWorkbench
            onRequestGeminiInterpretation={handleRequestGeminiInterpretation}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseBrowser
            onSelectForScreening={handleSelectForScreening}
            onBookmarkLncRNA={handleBookmarkLncRNA}
            bookmarkedIds={savedBookmarks.map((b) => b.lncRnaId)}
          />
        )}

        {activeTab === 'ai-studio' && (
          <AiIntelligenceStudio initialPrompt={aiStudioInitialPrompt} />
        )}

        {activeTab === 'concept' && <WhitepaperConcept />}

        {activeTab === 'saved' && (
          <SavedRunsModal
            currentUser={currentUser}
            onSignIn={async () => {
              try {
                await signInWithGoogle();
                showToast('Signed in successfully with Google');
              } catch (err: any) {
                console.error(err);
              }
            }}
            savedAnalyses={savedAnalyses}
            savedBookmarks={savedBookmarks}
            onDeleteAnalysis={handleDeleteAnalysis}
            onDeleteBookmark={handleDeleteBookmark}
            onLoadAnalysis={handleLoadSavedAnalysis}
          />
        )}
      </main>

      {/* Publication Grade Scientific Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-extrabold text-slate-800 text-sm flex items-center justify-center md:justify-start gap-1.5">
              <Dna className="w-4 h-4 text-blue-600" />
              <span>LISHA Platform &bull; ICAR-NIBSM</span>
            </div>
            <p>
              LncRNA Interaction Screening and Homology Assessment for Plant Biotic Stress & Pathogen Early Warning.
            </p>
            <p className="text-slate-400 text-[11px]">
              Principal Investigator: Prof. Lalit Laxman Kharbikar, Principal Scientist, ICAR-National Institute of Biotic Stress Management, Raipur, India.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab('concept')}
              className="text-blue-600 hover:underline"
            >
              Scientific Concept Whitepaper
            </button>
            <span className="hidden sm:inline text-slate-300">&bull;</span>
            <button
              onClick={() => setActiveTab('database')}
              className="text-blue-600 hover:underline"
            >
              Curated Knowledgebase
            </button>
            <span className="hidden sm:inline text-slate-300">&bull;</span>
            <a
              href="mailto:LALITKHARBIKAR@gmail.com"
              className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Contact ICAR-NIBSM</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
