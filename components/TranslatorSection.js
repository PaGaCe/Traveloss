"use client";

import { useState, useRef } from "react";
import { Languages, ArrowRightLeft, Volume2, Loader2, AlertCircle } from "lucide-react";

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

export default function TranslatorSection({ translatorLangs, accentColor, onUpdateLangs }) {
  const [fromLang, setFromLang] = useState(translatorLangs?.from || "es");
  const [toLang, setToLang] = useState(translatorLangs?.to || "en");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const inputRef = useRef(null);

  function swapLanguages() {
    const newFrom = toLang;
    const newTo = fromLang;
    setFromLang(newFrom);
    setToLang(newTo);
    onUpdateLangs({ from: newFrom, to: newTo });
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText("");
    }
  }

  function handleFromChange(code) {
    setFromLang(code);
    onUpdateLangs({ from: code, to: toLang });
  }

  function handleToChange(code) {
    setToLang(code);
    onUpdateLangs({ from: fromLang, to: code });
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
      setError("Error de conexión. Comprueba tu internet.");
    } finally {
      setTranslating(false);
    }
  }

  function handleSpeak() {
    if (!translatedText || speaking) return;
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = toLang;
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const fromLabel = LANGUAGES.find((l) => l.code === fromLang)?.label || fromLang;
  const toLabel = LANGUAGES.find((l) => l.code === toLang)?.label || toLang;

  return (
    <div className="px-1 py-2">
      <div className="flex items-center gap-2 mb-4">
        <Languages size={18} style={{ color: accentColor }} />
        <h3 className="text-[15px] font-semibold text-ink font-display">Traductor rápido</h3>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <select
            value={fromLang}
            onChange={(e) => handleFromChange(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none bg-cloud text-ink border border-line appearance-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={swapLanguages}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-line hover:bg-cloud transition-colors"
        >
          <ArrowRightLeft size={14} className="text-muted" />
        </button>
        <div className="flex-1">
          <select
            value={toLang}
            onChange={(e) => handleToChange(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none bg-cloud text-ink border border-line appearance-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[11px] font-medium text-muted mb-1 block">{fromLabel}</label>
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe o pega el texto a traducir..."
          rows={3}
          className="w-full rounded-xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line resize-none"
        />
      </div>

      <button
        onClick={handleTranslate}
        disabled={!inputText.trim() || translating}
        className="w-full rounded-xl py-3 text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
        style={{
          background: accentColor,
          opacity: inputText.trim() && !translating ? 1 : 0.5,
        }}
      >
        {translating ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Traduciendo...
          </>
        ) : (
          "Traducir"
        )}
      </button>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-coral bg-coral/10 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {translatedText && (
        <div className="mt-4">
          <label className="text-[11px] font-medium text-muted mb-1 block">{toLabel}</label>
          <div className="bg-white rounded-xl border border-line p-4">
            <p className="text-[14px] text-ink leading-relaxed">{translatedText}</p>
          </div>
          <button
            onClick={handleSpeak}
            disabled={speaking}
            className="mt-2.5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all active:scale-95"
            style={{
              background: speaking ? `${accentColor}25` : `${accentColor}12`,
              color: accentColor,
            }}
          >
            <Volume2 size={16} className={speaking ? "animate-pulse" : ""} />
            {speaking ? "Escuchando..." : "Escuchar pronunciación"}
          </button>
        </div>
      )}
    </div>
  );
}
