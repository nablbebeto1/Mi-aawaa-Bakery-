import { en } from './en';
import { om } from './om';
import { am } from './am';

export type Language = 'en' | 'om' | 'am';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'om', label: 'Afaan Oromo', nativeLabel: 'Afaan Oromoo' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
];

export const dictionaries: Record<Language, Record<string, string>> = {
  en,
  om,
  am,
};

export type TranslationKey = keyof typeof en;
