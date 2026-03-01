import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Settings, ChevronLeft, BookOpen, Moon, Sun, X, Info, Bookmark as BookmarkIcon, BookmarkCheck, Trash2, Type, Play, Square, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Surah, SurahDetail, JuzDetail, Ayah, Translation, AppSettings, Bookmark, Word } from './types';
import { fetchSurahs, fetchSurahDetail, fetchTranslation, fetchWordsForSurah, fetchAyahAudio, fetchJuzDetail, fetchJuzTranslation, fetchWordsForJuz, fetchJuzAudio } from './services/quranService';

const DEFAULT_SETTINGS: AppSettings = {
  arabicFontSize: 32,
  translationFontSize: 16,
  translationLanguage: 'ms.basmeih',
  showTranslation: true,
  showWordByWord: true,
};

const TRANSLATION_LANGUAGES = [
  { id: 'ms.basmeih', name: 'Bahasa Melayu', wordId: 39 },
  { id: 'en.sahih', name: 'English (Sahih Int.)', wordId: 131 },
  { id: 'en.pickthall', name: 'English (Pickthall)', wordId: 131 },
  { id: 'id.indonesian', name: 'Bahasa Indonesia', wordId: 33 },
  { id: 'ta.tamil', name: 'Tamil (தமிழ்)', wordId: 158 },
];

export default function App() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [juzDetail, setJuzDetail] = useState<JuzDetail | null>(null);
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [wordsByVerseKey, setWordsByVerseKey] = useState<Record<string, Word[]>>({});
  const [audioUrlsByVerseKey, setAudioUrlsByVerseKey] = useState<Record<string, string>>({});
  const [playingAyahKey, setPlayingAyahKey] = useState<string | null>(null);
  const [copiedAyahKey, setCopiedAyahKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'surahs' | 'juzs' | 'bookmarks'>('surahs');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem('quran_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('quran_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('quran_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    const loadSurahs = async () => {
      try {
        const data = await fetchSurahs();
        setSurahs(data);
      } catch (error) {
        console.error('Failed to fetch surahs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSurahs();
  }, []);

  useEffect(() => {
    if (selectedSurah || selectedJuz) {
      const loadDetail = async () => {
        setDetailLoading(true);
        // Clear previous data to ensure dynamic update is visible
        if (selectedSurah) setJuzDetail(null);
        if (selectedJuz) setSurahDetail(null);
        setTranslations({});
        setWordsByVerseKey({});
        setAudioUrlsByVerseKey({});
        setPlayingAyahKey(null);
        if (audioRef.current) {
          audioRef.current.pause();
        }

        try {
          const currentLang = TRANSLATION_LANGUAGES.find(l => l.id === settings.translationLanguage);
          const wordId = currentLang?.wordId || 39;

          if (selectedSurah) {
            const [detail, transArray, words, audio] = await Promise.all([
              fetchSurahDetail(selectedSurah.number),
              fetchTranslation(selectedSurah.number, settings.translationLanguage),
              fetchWordsForSurah(selectedSurah.number, wordId),
              fetchAyahAudio(selectedSurah.number)
            ]);

            // Convert transArray to map by verseKey for unified rendering
            const transMap: Record<string, Translation> = {};
            transArray.forEach((t: Translation, i: number) => {
              transMap[`${selectedSurah.number}:${i + 1}`] = t;
            });

            // Convert words and audio maps
            const wordsMap: Record<string, Word[]> = {};
            Object.keys(words).forEach(numStr => {
              wordsMap[`${selectedSurah.number}:${numStr}`] = words[parseInt(numStr)];
            });

            const audioMap: Record<string, string> = {};
            Object.keys(audio).forEach(numStr => {
              audioMap[`${selectedSurah.number}:${numStr}`] = audio[parseInt(numStr)];
            });

            setSurahDetail(detail);
            setTranslations(transMap);
            setWordsByVerseKey(wordsMap);
            setAudioUrlsByVerseKey(audioMap);
          } else if (selectedJuz) {
            const [detail, trans, words, audio] = await Promise.all([
              fetchJuzDetail(selectedJuz),
              fetchJuzTranslation(selectedJuz, settings.translationLanguage),
              fetchWordsForJuz(selectedJuz, wordId),
              fetchJuzAudio(selectedJuz)
            ]);
            setJuzDetail(detail);
            setTranslations(trans);
            setWordsByVerseKey(words);
            setAudioUrlsByVerseKey(audio);
          }
        } catch (error) {
          console.error('Failed to fetch detail:', error);
        } finally {
          setDetailLoading(false);
        }
      };
      loadDetail();
    } else {
      setSurahDetail(null);
      setJuzDetail(null);
      setTranslations({});
      setWordsByVerseKey({});
      setAudioUrlsByVerseKey({});
      setPlayingAyahKey(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [selectedSurah, selectedJuz, settings.translationLanguage]);

  const filteredSurahs = useMemo(() => {
    return surahs.filter(s =>
      s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.number.toString().includes(searchQuery) ||
      s.name.includes(searchQuery)
    );
  }, [surahs, searchQuery]);

  const handleSurahClick = (surah: Surah) => {
    setSelectedSurah(surah);
    setSelectedJuz(null);
    setActiveTab('surahs');
    window.scrollTo(0, 0);
  };

  const handleJuzClick = (juzNumber: number) => {
    setSelectedJuz(juzNumber);
    setSelectedSurah(null);
    setActiveTab('juzs');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSelectedSurah(null);
    setSelectedJuz(null);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlayAudio = (verseKey: string) => {
    if (playingAyahKey === verseKey) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAyahKey(null);
      }
    } else {
      // Play new
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const url = audioUrlsByVerseKey[verseKey];
      if (url) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingAyahKey(null);
        audio.play().catch(e => console.error("Audio playback error:", e));
        audioRef.current = audio;
        setPlayingAyahKey(verseKey);
      }
    }
  };

  const toggleBookmark = (ayah: Ayah, surahReference: Surah) => {
    if (!surahReference) return;

    const isBookmarked = bookmarks.some(b => b.surahNumber === surahReference.number && b.ayahNumber === ayah.numberInSurah);

    if (isBookmarked) {
      setBookmarks(bookmarks.filter(b => !(b.surahNumber === surahReference.number && b.ayahNumber === ayah.numberInSurah)));
    } else {
      setBookmarks([...bookmarks, {
        surahNumber: surahReference.number,
        ayahNumber: ayah.numberInSurah,
        surahName: surahReference.englishName,
        ayahText: ayah.text
      }]);
    }
  };

  const handleCopyAyah = (verseKey: string, arabicText: string, translationText?: string, surahName?: string, surahNumber?: number, ayahNumber?: number) => {
    const header = `${surahName || ''} ${surahNumber ? `(${surahNumber}:${ayahNumber})` : ayahNumber ? ayahNumber : ''}`.trim();
    const textToCopy = `${header ? header + '\n\n' : ''}${arabicText}${translationText ? '\n\n' + translationText : ''}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedAyahKey(verseKey);
      setTimeout(() => {
        setCopiedAyahKey(null);
      }, 2000); // Reset after 2 seconds
    }).catch(err => console.error("Could not copy text: ", err));
  };

  const removeBookmark = (surahNum: number, ayahNum: number) => {
    setBookmarks(bookmarks.filter(b => !(b.surahNumber === surahNum && b.ayahNumber === ayahNum)));
  };

  const goToBookmark = (surahNum: number) => {
    const surah = surahs.find(s => s.number === surahNum);
    if (surah) {
      setSelectedSurah(surah);
      setActiveTab('surahs');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFCFB]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FDFCFB] font-sans selection:bg-emerald-100">
      <div className="bg-emerald-600 text-emerald-50 text-[11px] py-1.5 px-4 text-center tracking-wide">
        Developed by <span className="font-bold text-white">DrFendi Ameen</span> • <a href="mailto:afandi.amin@customs.gov.my" className="hover:text-white transition-colors underline decoration-emerald-500 underline-offset-2">afandi.amin@customs.gov.my</a>
      </div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FDFCFB]/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        {selectedSurah || selectedJuz ? (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
            id="back-button"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Quran Clear</h1>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            id="settings-button"
          >
            <Settings className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <main className="pb-24">
        <AnimatePresence mode="wait">
          {!selectedSurah && !selectedJuz ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 pt-4"
            >
              {/* Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                <button
                  onClick={() => setActiveTab('surahs')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'surahs' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
                >
                  Surah
                </button>
                <button
                  onClick={() => setActiveTab('juzs')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'juzs' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
                >
                  Juz
                </button>
                <button
                  onClick={() => setActiveTab('bookmarks')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'bookmarks' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}
                >
                  Bookmarks ({bookmarks.length})
                </button>
              </div>

              {activeTab === 'surahs' && (
                <>
                  {/* Search Bar */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Surah..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800"
                    />
                  </div>

                  {/* Surah List */}
                  <div className="space-y-3">
                    {filteredSurahs.map((surah) => (
                      <button
                        key={surah.number}
                        onClick={() => handleSurahClick(surah)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-sm transition-all text-left group"
                        id={`surah-${surah.number}`}
                      >
                        <div className="w-10 h-10 flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center text-sm font-bold text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          {surah.number}
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-semibold text-slate-800">{surah.englishName}</h3>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">
                            {surah.revelationType} • {surah.numberOfAyahs} Ayahs
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-arabic text-xl text-emerald-700 leading-none mb-1">{surah.name}</p>
                          <p className="text-[10px] text-slate-400">{surah.englishNameTranslation}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'juzs' && (
                <div className="grid grid-cols-2 gap-3 pb-8">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => (
                    <button
                      key={juzNum}
                      onClick={() => handleJuzClick(juzNum)}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-sm transition-all group"
                      id={`juz-${juzNum}`}
                    >
                      <h3 className="font-semibold text-slate-800">Juz {juzNum}</h3>
                      <div className="w-8 h-8 flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        {juzNum}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'bookmarks' && (
                <div className="space-y-4">
                  {bookmarks.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookmarkIcon className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-slate-800 font-semibold">No bookmarks yet</h3>
                      <p className="text-sm text-slate-400 mt-1">Ayahs you bookmark will appear here</p>
                    </div>
                  ) : (
                    bookmarks.map((bookmark) => (
                      <div
                        key={`${bookmark.surahNumber}-${bookmark.ayahNumber}`}
                        className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <button
                            onClick={() => goToBookmark(bookmark.surahNumber)}
                            className="text-xs font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                          >
                            {bookmark.surahName} : {bookmark.ayahNumber}
                          </button>
                          <button
                            onClick={() => removeBookmark(bookmark.surahNumber, bookmark.ayahNumber)}
                            className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="font-arabic text-right text-lg text-slate-800 mb-2 leading-relaxed">
                          {bookmark.ayahText}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-0"
            >
              {/* Header section depending on Surah or Juz */}
              {selectedSurah ? (
                <div className="px-4 py-8 text-center border-b border-slate-100 bg-white">
                  <h2 className="text-3xl font-arabic text-emerald-800 mb-2">{selectedSurah.name}</h2>
                  <h3 className="text-xl font-bold text-slate-800">{selectedSurah.englishName}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedSurah.englishNameTranslation} • {selectedSurah.revelationType} • {selectedSurah.numberOfAyahs} Ayahs
                  </p>
                </div>
              ) : selectedJuz ? (
                <div className="px-4 py-8 text-center border-b border-slate-100 bg-white">
                  <h2 className="text-3xl font-arabic text-emerald-800 mb-2">الجزء {selectedJuz}</h2>
                  <h3 className="text-xl font-bold text-slate-800">Juz {selectedJuz}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {juzDetail?.ayahs.length} Ayahs
                  </p>
                </div>
              ) : null}

              {detailLoading ? (
                <div className="flex justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full"
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* For Surahs, display Bismillah at the top if it's not Fatiha or Tawbah */}
                  {selectedSurah && selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
                    <div className="py-10 text-center px-4">
                      <p className="font-arabic text-3xl text-slate-800">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                    </div>
                  )}

                  {(surahDetail?.ayahs || juzDetail?.ayahs)?.map((ayah, index) => {
                    // In Juz view, ayah.surah exists. In Surah view, we fallback to selectedSurah
                    const surahReference = ayah.surah || selectedSurah!;
                    const verseKey = `${surahReference.number}:${ayah.numberInSurah}`;
                    const isBookmarked = bookmarks.some(b => b.surahNumber === surahReference.number && b.ayahNumber === ayah.numberInSurah);
                    const words = wordsByVerseKey[verseKey] || [];

                    // Whether to show Bismillah inside the loop (only in Juz view when encountering the first ayah of a surah)
                    const showInlinedBismillah = selectedJuz && ayah.numberInSurah === 1 && surahReference.number !== 1 && surahReference.number !== 9;

                    return (
                      <React.Fragment key={`${surahReference.number}-${ayah.number}`}>
                        {/* Inline Surah Header for Juz View */}
                        {selectedJuz && ayah.numberInSurah === 1 && (
                          <div className="px-4 py-6 bg-slate-50 border-y border-emerald-100 text-center shadow-inner">
                            <h2 className="text-xl font-arabic text-emerald-700">{surahReference.name}</h2>
                            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600/70 mt-1">{surahReference.englishName}</p>
                          </div>
                        )}
                        {showInlinedBismillah && (
                          <div className="py-8 text-center px-4 border-b border-slate-100">
                            <p className="font-arabic text-2xl text-slate-700">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                          </div>
                        )}

                        <div className="p-6 hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start mb-6">
                            <span className="inline-flex items-center justify-center min-w-[32px] px-2 h-8 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                              {/* Display Surah:Ayah format in Juz view for clarity, otherwise just Ayah number */}
                              {selectedJuz ? `${surahReference.number}:${ayah.numberInSurah}` : ayah.numberInSurah}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCopyAyah(verseKey, ayah.text, translations[verseKey]?.text, surahReference.englishName, surahReference.number, ayah.numberInSurah)}
                                className={`p-2 rounded-xl transition-all ${copiedAyahKey === verseKey ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                aria-label="Copy Ayah"
                              >
                                {copiedAyahKey === verseKey ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                              </button>
                              {audioUrlsByVerseKey[verseKey] && (
                                <button
                                  onClick={() => handlePlayAudio(verseKey)}
                                  className={`p-2 rounded-xl transition-all ${playingAyahKey === verseKey ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                  aria-label={playingAyahKey === verseKey ? "Stop Audio" : "Play Audio"}
                                >
                                  {playingAyahKey === verseKey ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                                </button>
                              )}
                              <button
                                onClick={() => toggleBookmark(ayah, surahReference)}
                                className={`p-2 rounded-xl transition-all ${isBookmarked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                              >
                                {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {settings.showWordByWord && words.length > 0 ? (
                            <div className="flex flex-wrap flex-row-reverse gap-y-8 gap-x-4 mb-8" style={{ fontSize: `${settings.arabicFontSize}px` }}>
                              {words.map((word) => (
                                <div key={word.id} className="flex flex-col items-center">
                                  <span className="font-arabic text-slate-900 mb-2">
                                    {word.text_uthmani}
                                  </span>
                                  <span className="text-[11px] text-emerald-600 font-medium font-sans leading-none text-center max-w-[70px]">
                                    {word.translation.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p
                              className="arabic-text font-arabic text-right text-slate-900 mb-6"
                              style={{ fontSize: `${settings.arabicFontSize}px` }}
                            >
                              {/* Remove Bismillah from first ayah if it's not Surah Fatiha */}
                              {ayah.numberInSurah === 1 && surahReference.number !== 1 && surahReference.number !== 9
                                ? ayah.text.replace('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', '').trim()
                                : ayah.text}
                            </p>
                          )}

                          {settings.showTranslation && translations[verseKey] && (
                            <p
                              className="text-slate-600 leading-relaxed"
                              style={{ fontSize: `${settings.translationFontSize}px` }}
                            >
                              {translations[verseKey].text}
                            </p>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Reading Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Translation Language */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Translation Language</label>
                  <div className="grid grid-cols-1 gap-2">
                    {TRANSLATION_LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setSettings({ ...settings, translationLanguage: lang.id })}
                        className={`px-4 py-3 rounded-2xl text-sm font-medium text-left transition-all border ${settings.translationLanguage === lang.id ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Arabic Font Size */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Arabic Font Size</label>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">{settings.arabicFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="60"
                    value={settings.arabicFontSize}
                    onChange={(e) => setSettings({ ...settings, arabicFontSize: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Translation Font Size */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Translation Font Size</label>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">{settings.translationFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={settings.translationFontSize}
                    onChange={(e) => setSettings({ ...settings, translationFontSize: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Show Translation Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-slate-700">Show Translation</label>
                    <p className="text-xs text-slate-400">Display translation below ayahs</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showTranslation: !settings.showTranslation })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.showTranslation ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showTranslation ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Show Word by Word Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-slate-700">Word by Word (Perkata)</label>
                    <p className="text-xs text-slate-400">Display meaning for each word</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showWordByWord: !settings.showWordByWord })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.showWordByWord ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showWordByWord ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer / Navigation Hint */}
      {!selectedSurah && activeTab === 'surahs' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900/90 backdrop-blur-md text-white rounded-full shadow-lg flex items-center gap-3 text-sm font-medium z-20">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>114 Surahs Available</span>
        </div>
      )}
    </div>
  );
}
