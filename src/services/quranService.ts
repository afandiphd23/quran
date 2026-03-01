import { Surah, SurahDetail, Translation, Word } from '../types';

const ALQURAN_BASE_URL = 'https://api.alquran.cloud/v1';
const QURAN_COM_BASE_URL = 'https://api.quran.com/api/v4';

export const fetchSurahs = async (): Promise<Surah[]> => {
  const response = await fetch(`${ALQURAN_BASE_URL}/surah`);
  const data = await response.json();
  return data.data;
};

export const fetchSurahDetail = async (number: number, edition: string = 'quran-uthmani'): Promise<SurahDetail> => {
  const response = await fetch(`${ALQURAN_BASE_URL}/surah/${number}/${edition}`);
  const data = await response.json();
  return data.data;
};

export const fetchTranslation = async (number: number, language: string = 'en.sahih'): Promise<Translation[]> => {
  const response = await fetch(`${ALQURAN_BASE_URL}/surah/${number}/${language}`);
  const data = await response.json();
  return data.data.ayahs;
};

export const fetchWordsForSurah = async (surahNumber: number, wordTranslationLanguageId: number = 39): Promise<Record<number, Word[]>> => {
  // Map ID back to code for the API parameter which often prefers codes.
  // Note: Quran.com API v4 does not support Malay ('ms') word-by-word translations,
  // so we fallback to Indonesian ('id') for Malay users.
  const langCodeMap: Record<number, string> = {
    39: 'id', // Malay falls back to Indonesian
    131: 'en',
    33: 'id',
    158: 'ta'
  };
  const langCode = langCodeMap[wordTranslationLanguageId] || 'en';

  // Using language parameter as it controls word translation output in Quran.com API v4
  const response = await fetch(`${QURAN_COM_BASE_URL}/verses/by_chapter/${surahNumber}?language=${langCode}&words=true&word_fields=text_uthmani,location,translation&word_translation_language=${langCode}&per_page=286`);
  const data = await response.json();

  const wordsByVerse: Record<number, Word[]> = {};
  data.verses.forEach((verse: any) => {
    wordsByVerse[verse.verse_number] = verse.words;
  });

  return wordsByVerse;
};

export const fetchAyahAudio = async (surahNumber: number, reciterId: number = 7): Promise<Record<number, string>> => {
  // 7 is typically Mishary Rashid Alafasy in Quran.com API
  const response = await fetch(`${QURAN_COM_BASE_URL}/recitations/${reciterId}/by_chapter/${surahNumber}?per_page=286`);
  const data = await response.json();

  const audioUrls: Record<number, string> = {};
  data.audio_files.forEach((audio: any) => {
    // verse_key is formatted like "1:1", so we extract the ayah number after the colon
    const ayahNumber = parseInt(audio.verse_key.split(':')[1]);
    audioUrls[ayahNumber] = `https://verses.quran.com/${audio.url}`;
  });

  return audioUrls;
};

// --- Juz APIs ---

export const fetchJuzDetail = async (number: number, edition: string = 'quran-uthmani') => {
  const response = await fetch(`${ALQURAN_BASE_URL}/juz/${number}/${edition}`);
  const data = await response.json();
  return data.data; // this maps closely to SurahDetail but with multiple surahs
};

export const fetchJuzTranslation = async (number: number, language: string = 'en.sahih'): Promise<Record<string, Translation>> => {
  const response = await fetch(`${ALQURAN_BASE_URL}/juz/${number}/${language}`);
  const data = await response.json();

  // Create a map by verse key since array indices won't match sequentially across surahs easily
  const translationMap: Record<string, Translation> = {};
  data.data.ayahs.forEach((ayah: any) => {
    const verseKey = `${ayah.surah.number}:${ayah.numberInSurah}`;
    translationMap[verseKey] = ayah;
  });
  return translationMap;
};

export const fetchWordsForJuz = async (juzNumber: number, wordTranslationLanguageId: number = 39): Promise<Record<string, Word[]>> => {
  const langCodeMap: Record<number, string> = {
    39: 'id', // Malay falls back to Indonesian
    131: 'en',
    33: 'id',
    158: 'ta'
  };
  const langCode = langCodeMap[wordTranslationLanguageId] || 'en';

  const response = await fetch(`${QURAN_COM_BASE_URL}/verses/by_juz/${juzNumber}?language=${langCode}&words=true&word_fields=text_uthmani,location,translation&per_page=286`);
  const data = await response.json();

  const wordsByVerseKey: Record<string, Word[]> = {};
  data.verses.forEach((verse: any) => {
    // Keep verse format as "1:1" to easily match UI
    wordsByVerseKey[verse.verse_key] = verse.words;
  });

  return wordsByVerseKey;
};

export const fetchJuzAudio = async (juzNumber: number, reciterId: number = 7): Promise<Record<string, string>> => {
  const response = await fetch(`${QURAN_COM_BASE_URL}/recitations/${reciterId}/by_juz/${juzNumber}?per_page=286`);
  const data = await response.json();

  const audioUrlsByVerseKey: Record<string, string> = {};
  data.audio_files.forEach((audio: any) => {
    audioUrlsByVerseKey[audio.verse_key] = `https://verses.quran.com/${audio.url}`;
  });

  return audioUrlsByVerseKey;
};
