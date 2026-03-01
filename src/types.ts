export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Word {
  id: number;
  position: number;
  text_uthmani: string;
  translation: {
    text: string;
    language_name: string;
  };
  transliteration: {
    text: string;
    language_name: string;
  };
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  surah?: Surah;
  words?: Word[];
}

export interface SurahDetail extends Surah {
  ayahs: Ayah[];
}

export interface JuzDetail {
  number: number;
  ayahs: Ayah[];
  surahs: Record<string, Surah>;
}

export interface Translation {
  number?: number;
  text: string;
}

export interface Bookmark {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText: string;
}

export interface AppSettings {
  arabicFontSize: number;
  translationFontSize: number;
  translationLanguage: string;
  showTranslation: boolean;
  showWordByWord: boolean;
}
