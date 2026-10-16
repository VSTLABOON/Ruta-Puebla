export type Paper = 'light' | 'dark';

const KEY = 'popogo_paper';

export const readPaper = (): Paper => {
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyPaper = (paper: Paper) => {
  document.documentElement.classList.toggle('dark', paper === 'dark');
  localStorage.setItem(KEY, paper);
};
