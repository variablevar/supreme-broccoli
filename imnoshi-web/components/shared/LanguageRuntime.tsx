'use client';

import { useEffect } from 'react';
import { isRtlLanguage, sourcePhrase, translatePhrase } from '@/lib/i18n';
import { useDashboardStore } from '@/stores/useDashboardStore';

const sourceText = new WeakMap<Text, string>();
const sourceAttribute = new WeakMap<Element, Map<string, string>>();
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
const ATTRIBUTES = ['placeholder', 'aria-label', 'title'];

function preserveSpacing(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

function shouldSkip(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  return Boolean(parent.closest('[data-no-translate]'));
}

function translateTextNode(node: Text, language: Parameters<typeof translatePhrase>[0]) {
  if (shouldSkip(node)) return;
  const original = sourceText.get(node) ?? sourcePhrase(node.nodeValue ?? '');
  if (!sourceText.has(node)) sourceText.set(node, original);
  const translated = translatePhrase(language, original);
  node.nodeValue = translated === original ? original : preserveSpacing(original, translated);
}

function translateAttributes(root: ParentNode, language: Parameters<typeof translatePhrase>[0]) {
  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'));
  elements.forEach((element) => {
    if (element.closest('[data-no-translate]')) return;
    ATTRIBUTES.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      const originals = sourceAttribute.get(element) ?? new Map<string, string>();
      const original = originals.get(attr) ?? sourcePhrase(value);
      originals.set(attr, original);
      sourceAttribute.set(element, originals);
      element.setAttribute(attr, translatePhrase(language, original));
    });
  });
}

function translateTree(root: ParentNode, language: Parameters<typeof translatePhrase>[0]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text, language);
    node = walker.nextNode();
  }
  translateAttributes(root, language);
}

export function LanguageRuntime() {
  const language = useDashboardStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRtlLanguage(language) ? 'rtl' : 'ltr';
    translateTree(document.body, language);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, language);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node as Element, language);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
