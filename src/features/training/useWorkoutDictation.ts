import { useEffect, useRef, useState } from 'react';

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { transcript: string };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function recognitionErrorMessage(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'El micrófono no tiene permiso. Actívalo en los permisos del navegador o escribe el registro.';
    case 'audio-capture':
      return 'No se pudo acceder al micrófono. Revisa si otra aplicación lo está usando.';
    case 'network':
      return 'El dictado necesita conexión en este navegador. Conservamos el texto; puedes editarlo y continuar.';
    case 'no-speech':
      return 'No se escuchó una frase. Acércate al micrófono y vuelve a intentarlo.';
    case 'language-not-supported':
      return 'Este navegador no reconoce español. Puedes usar el micrófono del teclado en el campo de texto.';
    default:
      return 'No se pudo completar el dictado. El texto sigue disponible para editarlo.';
  }
}

export function useWorkoutDictation(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'stopping'>('idle');
  const [error, setError] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const dispose = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    }
  };

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) {
        dispose();
        setStatus('idle');
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      dispose();
    };
  }, []);

  const stop = () => {
    if (recognitionRef.current) {
      setStatus('stopping');
      recognitionRef.current.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      // Some mobile implementations never emit onend after a network failure.
      timerRef.current = setTimeout(() => {
        dispose();
        setStatus('idle');
      }, 4000);
    }
  };

  const start = (existingText: string) => {
    if (recognitionRef.current) return;
    const Constructor = getRecognitionConstructor();
    if (!Constructor) {
      setError(
        'Este navegador no permite dictado directo. Usa el micrófono de tu teclado o escribe abajo.',
      );
      return;
    }
    if (!navigator.onLine) {
      setError(recognitionErrorMessage('network'));
      return;
    }
    setError('');
    const recognition = new Constructor();
    recognitionRef.current = recognition;
    recognition.lang = 'es-CR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setStatus('listening');
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      const heard = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ');
      onTranscriptRef.current([existingText.trim(), heard.trim()].filter(Boolean).join(' '));
    };
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') setError(recognitionErrorMessage(event.error));
      dispose();
      setStatus('idle');
    };
    recognition.onend = () => {
      dispose();
      setStatus('idle');
    };
    try {
      setStatus('starting');
      recognition.start();
      timerRef.current = setTimeout(stop, 60_000);
    } catch {
      dispose();
      setStatus('idle');
      setError(
        'No se pudo iniciar el micrófono. Usa el dictado de tu teclado o escribe el registro.',
      );
    }
  };

  return { status, error, start, stop, supported: Boolean(getRecognitionConstructor()) };
}
