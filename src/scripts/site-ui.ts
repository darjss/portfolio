type Locale = 'en' | 'mn';
type Theme = 'light' | 'dark';

const localeButton = document.getElementById('locale-toggle') as HTMLButtonElement | null;
const localeButtonText = document.getElementById('locale-toggle-text') as HTMLSpanElement | null;
const themeButton = document.getElementById('theme-toggle') as HTMLButtonElement | null;
const themeButtonText = document.getElementById('theme-toggle-text') as HTMLSpanElement | null;

const getLocale = (): Locale => (document.documentElement.dataset.locale === 'mn' ? 'mn' : 'en');
const getTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

const uiCopy = {
    localeToggle: {
        en: '🇲🇳',
        mn: '🇺🇸'
    },
    themeToggle: {
        light: {
            en: '☀️',
            mn: '☀️'
        },
        dark: {
            en: '🌙',
            mn: '🌙'
        }
    },
    labels: {
        locale: {
            en: 'Switch language',
            mn: 'Хэл солих'
        },
        theme: {
            en: 'Toggle theme',
            mn: 'Өнгөний горим солих'
        }
    }
};

const applyLocalizedFields = (locale: Locale): void => {
    document.querySelectorAll<HTMLElement>('[data-i18n-field]').forEach((element) => {
        const value = locale === 'mn' ? element.dataset.mn : element.dataset.en;
        if (value) {
            element.textContent = value;
        }
    });

    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
        const value = locale === 'mn' ? element.dataset.titleMn : element.dataset.titleEn;
        if (value) {
            element.setAttribute('title', value);
            element.setAttribute('aria-label', value);
        }
    });

    if (localeButton && localeButtonText) {
        localeButtonText.textContent = uiCopy.localeToggle[locale];
        localeButton.title = uiCopy.labels.locale[locale];
        localeButton.setAttribute('aria-label', uiCopy.labels.locale[locale]);
    }
};

const applyThemeButton = (theme: Theme, locale: Locale): void => {
    if (!themeButtonText) {
        return;
    }

    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    themeButtonText.textContent = uiCopy.themeToggle[nextTheme][locale];

    if (themeButton) {
        themeButton.title = uiCopy.labels.theme[locale];
        themeButton.setAttribute('aria-label', uiCopy.labels.theme[locale]);
    }
};

const setLocale = (locale: Locale): void => {
    document.documentElement.dataset.locale = locale;
    document.documentElement.lang = locale;
    localStorage.setItem('locale', locale);
    applyLocalizedFields(locale);
    applyThemeButton(getTheme(), locale);
};

const setTheme = (theme: Theme): void => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    applyThemeButton(theme, getLocale());
};

localeButton?.addEventListener('click', () => {
    const nextLocale: Locale = getLocale() === 'en' ? 'mn' : 'en';
    setLocale(nextLocale);
});

themeButton?.addEventListener('click', () => {
    const nextTheme: Theme = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
});

setLocale(getLocale());
setTheme(getTheme());
