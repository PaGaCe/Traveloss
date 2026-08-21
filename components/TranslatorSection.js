"use client";

import { useState, useRef } from "react";
import { Languages, ArrowRightLeft, Volume2, Loader2, AlertCircle, Copy, Check, X } from "lucide-react";
import { useToast } from "./Toast";

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "ca", label: "Català" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "sl", label: "Slovenščina" },
  { code: "hr", label: "Hrvatski" },
  { code: "cs", label: "Čeština" },
  { code: "pl", label: "Polski" },
  { code: "nl", label: "Nederlands" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

export default function TranslatorSection({ translatorLangs, accentColor = "#0B0F19", onUpdateLangs }) {
  const [fromLang, setFromLang] = useState(translatorLangs?.from || "es");
  const [toLang, setToLang] = useState(translatorLangs?.to || "en");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const addToast = useToast();

  function swapLanguages() {
    const newFrom = toLang;
    const newTo = fromLang;
    setFromLang(newFrom);
    setToLang(newTo);
    onUpdateLangs?.({ from: newFrom, to: newTo });
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText("");
    }
  }

  function handleFromChange(code) {
    setFromLang(code);
    onUpdateLangs?.({ from: code, to: toLang });
  }

  function handleToChange(code) {
    setToLang(code);
    onUpdateLangs?.({ from: fromLang, to: code });
  }

  async function handleTranslate() {
    if (!inputText.trim()) return;
    setTranslating(true);
    setError(null);
    setTranslatedText("");
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(inputText.trim())}&langpair=${fromLang}|${toLang}`
      );
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        setTranslatedText(data.responseData.translatedText);
      } else {
        setError("No se pudo traducir. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión. Comprueba tu conexión a internet.");
    } finally {
      setTranslating(false);
    }
  }

  function handleSpeak() {
    if (!translatedText || speaking) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = toLang;
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleCopy() {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    addToast?.("Traducción copiada", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  const fromLabel = LANGUAGES.find((l) => l.code === fromLang)?.label || fromLang;
  const toLabel = LANGUAGES.find((l) => l.code === toLang)?.label || toLang;

  return (
    <div className="bg-surface rounded-3xl p-5 border border-line shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-line">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
          style={{ background: `${accentColor}18` }}
        >
          <Languages size={20} style={{ color: accentColor }} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-ink font-display">Traductor de viaje</h3>
          <p className="text-[11.5px] text-slate font-medium">Traduce frases y escucha su pronunciación</p>
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="flex items-center gap-2 bg-cloud p-1.5 rounded-2xl border border-line">
        <div className="flex-1">
          <select
            value={fromLang}
            onChange={(e) => handleFromChange(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-[13px] font-semibold outline-none bg-surface text-ink border border-line appearance-none cursor-pointer shadow-xs text-center"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={swapLanguages}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-surface border border-line hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
          title="Intercambiar idiomas"
        >
          <ArrowRightLeft size={14} className="text-slate" />
        </button>
        <div className="flex-1">
          <select
            value={toLang}
            onChange={(e) => handleToChange(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-[13px] font-semibold outline-none bg-surface text-ink border border-line appearance-none cursor-pointer shadow-xs text-center"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Input Box */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate">{fromLabel}</label>
          {inputText && (
            <button
              onClick={() => { setInputText(""); setTranslatedText(""); inputRef.current?.focus(); }}
              className="text-[11px] font-semibold text-slate hover:text-ink flex items-center gap-0.5"
            >
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe o pega aquí la frase que quieras traducir..."
          rows={3}
          className="w-full rounded-2xl p-4 text-[14.5px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-surface transition-all resize-none font-medium placeholder:font-normal placeholder:text-slate/60"
        />
      </div>

      {/* Translate Action Button */}
      <button
        onClick={handleTranslate}
        disabled={!inputText.trim() || translating}
        className="w-full rounded-2xl py-3.5 text-[15px] font-bold text-white flex items-center justify-center gap-2 shadow-card active:scale-[0.98] transition-all disabled:opacity-50"
        style={{ background: accentColor }}
      >
        {translating ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Traduciendo...
          </>
        ) : (
          "Traducir ahora"
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-[12.5px] text-coral bg-coral/10 rounded-2xl px-4 py-3 border border-coral/20 font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Translated Result Box */}
      {translatedText && (
        <div className="rounded-2xl bg-cloud p-4 border border-line animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate">{toLabel}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-xl bg-surface border border-line text-slate hover:text-ink active:scale-95 transition-all text-[12px] flex items-center gap-1 px-2.5 font-medium shadow-xs"
              >
                {copied ? <Check size={13} className="text-teal" /> : <Copy size={13} />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-3.5 border border-line shadow-xs">
            <p className="text-[15.5px] text-ink font-semibold leading-relaxed select-all">{translatedText}</p>
          </div>

          <button
            onClick={handleSpeak}
            disabled={speaking}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold bg-surface border border-line text-ink hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
          >
            <Volume2 size={16} className={speaking ? "text-teal animate-pulse" : "text-slate"} />
            <span>{speaking ? "Reproduciendo audio..." : "Escuchar pronunciación"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
