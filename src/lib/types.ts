import type { CatalogMeta } from './catalog';

export type Entry = {
	id: string;
	kind: 'Package' | 'Option' | 'Maintainer';
	meta: CatalogMeta;
	node?: unknown;
};

export type TreeEntry = Entry & { label: string; depth: number; branch: boolean; path: string };
export type Version = { id: string; label: string };
export type Section = 'Packages' | 'Options' | 'Maintainers' | 'Favorites' | 'Recent';
export type Dialog = '' | 'settings' | 'about' | 'news' | 'palette' | 'diff' | 'keybinds';

export type Preferences = {
	theme: 'system' | 'light' | 'dark';
	accent: string;
	reduceMotion: boolean;
	customCss: string;
	githubToken: string;
	geminiKey: string;
	transparency?: number;
	customFont?: string;
	advancedScratchpad?: boolean;
	comboTimeout?: number;
};
