"use client";

import { useState, useEffect, useRef, RefObject } from "react";

function getCaretFixedPos(textarea: HTMLTextAreaElement, cursorIndex: number): { top: number; left: number } {
  const style = window.getComputedStyle(textarea);
  const div = document.createElement("div");
  const copyProps = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle",
    "lineHeight", "letterSpacing", "wordSpacing",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "boxSizing",
  ];
  copyProps.forEach((p) => { (div.style as unknown as Record<string, string>)[p] = (style as unknown as Record<string, string>)[p]; });
  div.style.position = "absolute";
  div.style.top = "-9999px";
  div.style.left = "-9999px";
  div.style.width = textarea.clientWidth + "px";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordBreak = "break-word";
  div.style.overflow = "scroll";
  div.appendChild(document.createTextNode(textarea.value.slice(0, cursorIndex)));
  const marker = document.createElement("span");
  marker.textContent = "​";
  div.appendChild(marker);
  document.body.appendChild(div);
  const divRect = div.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const caretTop = markerRect.top - divRect.top;
  const caretLeft = markerRect.left - divRect.left;
  document.body.removeChild(div);
  const textareaRect = textarea.getBoundingClientRect();
  const lineH = parseFloat(style.lineHeight) || 20;
  return {
    top: textareaRect.top + caretTop - textarea.scrollTop + lineH,
    left: textareaRect.left + caretLeft - textarea.scrollLeft,
  };
}

export function useTagAutocomplete(textareaRef: RefObject<HTMLTextAreaElement | null>, content: string, setContent: (v: string) => void) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const tagQueryRef = useRef(tagQuery);
  useEffect(() => { tagQueryRef.current = tagQuery; }, [tagQuery]);

  useEffect(() => {
    fetch("/api/cards?alltags=true")
      .then((r) => r.json())
      .then((tags) => setAllTags(tags))
      .catch(() => {});
  }, []);

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart ?? 0;
    const before = val.slice(0, cursor);
    const match = before.match(/#([^\s#]*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      const filtered = allTags.filter((t) => t.startsWith(q) && t !== q).slice(0, 6);
      setTagQuery(match[1]);
      setTagSuggestions(filtered);
      setActiveSuggestion(0);
      if (textareaRef.current) {
        const hashIndex = cursor - match[1].length - 1;
        setDropdownPos(getCaretFixedPos(textareaRef.current, hashIndex));
      }
    } else {
      setTagQuery(null);
      setTagSuggestions([]);
      setDropdownPos(null);
    }
  }

  function applyTag(tag: string) {
    const textarea = textareaRef.current;
    if (!textarea || tagQueryRef.current === null) return;
    const cursor = textarea.selectionStart ?? 0;
    const before = content.slice(0, cursor);
    const after = content.slice(cursor);
    const newBefore = before.replace(/#([^\s#]*)$/, `#${tag}`);
    const newContent = newBefore + after;
    setContent(newContent);
    setTagSuggestions([]);
    setTagQuery(null);
    setDropdownPos(null);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newBefore.length;
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!tagSuggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, tagSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, 0));
    } else if (e.key === "Tab" || (e.key === "Enter" && tagSuggestions.length > 0)) {
      e.preventDefault();
      applyTag(tagSuggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setTagSuggestions([]);
      setTagQuery(null);
    }
  }

  return { tagSuggestions, activeSuggestion, setActiveSuggestion, dropdownPos, handleContentChange, handleKeyDown, applyTag };
}
