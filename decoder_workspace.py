"""
decoder_workspace.py

Python translation of components/decoder-workspace.tsx from the
manuscript-decoder web app.

This reproduces the DECODER LOGIC of that React component (not the UI):
  - phase state machine: upload -> ready -> processing -> complete
  - simulated progress bar (increments of 4, every 180ms, matching the
    original `setInterval(() => setProgress(v => min(100, v + 4)), 180)`)
  - the 5 "decoding stages" shown during processing
  - choosing a sample manuscript / uploading your own
  - editable transcription with case-insensitive search
  - metadata export to JSON and CSV (with the same CSV-injection escaping
    used in the original `escape()` helper)
  - text-to-speech is stubbed out (no browser SpeechSynthesis API in Python)

IMPORTANT (carried over from the original app's own disclaimer):
This is a demo. OCR, script detection, confidence scores, and translations
are all simulated using fixed sample texts. No real AI models or archive
backend are involved.
"""

from __future__ import annotations

import csv
import io
import json
import re
import time
import uuid
from dataclasses import dataclass, field, replace
from datetime import date
from enum import Enum
from typing import Callable, Optional


# ---------------------------------------------------------------------------
# Data model (translated from lib/manuscripts.ts)
# ---------------------------------------------------------------------------

class Phase(str, Enum):
    UPLOAD = "upload"
    READY = "ready"
    PROCESSING = "processing"
    COMPLETE = "complete"


@dataclass
class Manuscript:
    id: str
    title: str
    script: str
    language: str
    subject: str
    period: str
    location: str
    image: str
    text: str
    translations: dict[str, str]
    confidence: int
    date: str
    preferred_translation: Optional[str] = None


# A trimmed set of the sample manuscripts from lib/manuscripts.ts, enough to
# drive the demo end-to-end. Add more entries here if you want the full set.
SAMPLE_MANUSCRIPTS: list[Manuscript] = [
    Manuscript(
        id="ayurveda",
        title="The art of healing",
        script="Devanagari",
        language="Sanskrit",
        subject="Ayurveda",
        period="18th century",
        location="Varanasi, India",
        image="/images/sanskrit-manuscript.png",
        text="सर्वे भवन्तु सुखिनः। सर्वे सन्तु निरामयाः।\nसर्वे भद्राणि पश्यन्तु। मा कश्चिद्दुःखभाग्भवेत्॥",
        translations={
            "English": "May all be happy. May all be free from illness. "
                       "May all see what is auspicious. May no one suffer.",
            "Spanish": "Que todos sean felices. Que todos estén libres de "
                       "enfermedades.",
        },
        confidence=94,
        date="2026-09-09",
    ),
    Manuscript(
        id="tamil",
        title="Wisdom on a palm leaf",
        script="Tamil",
        language="Tamil",
        subject="Philosophy",
        period="17th century",
        location="Thanjavur, India",
        image="/images/tamil-manuscript.png",
        text="அகர முதல எழுத்தெல்லாம் ஆதி\nபகவன் முதற்றே உலகு.",
        translations={
            "English": "As the letter A is the first of all letters, so the "
                       "Eternal is first in the world.",
            "Spanish": "Así como la letra A es la primera de todas las "
                       "letras, el Eterno es el primero en el mundo.",
        },
        confidence=92,
        date="2026-09-08",
    ),
]

# Same knowledge-panel copy as the `knowledge` dict in the original component.
KNOWLEDGE: dict[str, str] = {
    "Ayurveda": "A traditional South Asian system of medicine with a long "
                "Sanskrit textual history. Related topics include herbs, "
                "diet, and health. This is a demo collection label, not a "
                "classification of your uploaded image.",
    "Philosophy": "The study of knowledge, ethics, existence, and the "
                  "nature of reality. Indian philosophical writings span "
                  "diverse languages and traditions. This label describes "
                  "the sample collection.",
    "Literature": "Poetry, prose, and oral traditions preserved through "
                  "writing. Historical context requires a verified source "
                  "and expert review. This label describes the sample "
                  "collection.",
    "Wellbeing": "The example Sanskrit verse expresses a wish for universal "
                 "happiness and freedom from illness. A cultural reading, "
                 "not medical advice.",
    "Wisdom": "Knowledge and ethical insight passed between generations "
              "through written and oral traditions.",
    "Heritage": "The languages, artifacts, practices, and knowledge "
                "inherited from earlier generations.",
}

# The 5 stages shown during the fake "decoding journey", same order as the
# original `stages` array.
STAGES = [
    "Enhancing manuscript image",
    "Locating handwritten text",
    "Identifying the script",
    "Transcribing to Unicode",
    "Translating and extracting insights",
]


# ---------------------------------------------------------------------------
# Core workspace logic (translated from the DecoderWorkspace component)
# ---------------------------------------------------------------------------

class DecoderWorkspace:
    """
    Python port of the DecoderWorkspace React component's state + behavior.

    A GUI would normally call these methods in response to user actions;
    here they're just plain methods you can call from a script, a CLI,
    a notebook, or wire up to your own web framework (Flask/FastAPI/etc).
    """

    def __init__(
        self,
        initial: Optional[Manuscript] = None,
        initial_complete: bool = False,
        on_save: Optional[Callable[[Manuscript], None]] = None,
        on_progress: Optional[Callable[[int, str], None]] = None,
    ):
        self.item: Optional[Manuscript] = initial
        self.phase: Phase = (
            Phase.COMPLETE if initial and initial_complete
            else Phase.READY if initial
            else Phase.UPLOAD
        )
        self.progress: int = 0
        self.uploaded: bool = False
        self.language: str = (initial.preferred_translation if initial else None) or "English"
        self.query: str = ""
        self.on_save = on_save
        # Callback fired on every progress tick: (progress_percent, stage_name)
        self.on_progress = on_progress

    # -- derived state, mirrors `complete`/`running` consts -----------------
    @property
    def complete(self) -> bool:
        return self.phase == Phase.COMPLETE

    @property
    def running(self) -> bool:
        return self.phase == Phase.PROCESSING

    # -- sample / upload selection -------------------------------------
    def choose_sample(self, sample: Manuscript) -> None:
        """Equivalent of `chooseSample`."""
        self.item = replace(sample, translations=dict(sample.translations))
        self.uploaded = False
        self.phase = Phase.READY
        self.progress = 0

    def upload_image(self, image_path: str, name: str) -> None:
        """Equivalent of the inline `onUpload` handler passed to UploadZone."""
        base = SAMPLE_MANUSCRIPTS[0]
        self.item = replace(
            base,
            id=str(uuid.uuid4()),
            title=name,
            image=image_path,
            translations=dict(base.translations),
            date=date.today().isoformat(),
        )
        self.uploaded = True
        self.phase = Phase.READY

    def switch_demo_language(self, language_name: str) -> None:
        """Equivalent of the 'Demo language' <select> onChange handler."""
        sample = next(m for m in SAMPLE_MANUSCRIPTS if m.language == language_name)
        if self.uploaded and self.item:
            self.item = replace(
                sample,
                id=self.item.id,
                title=self.item.title,
                image=self.item.image,
                translations=dict(sample.translations),
            )
        else:
            self.item = replace(sample, translations=dict(sample.translations))

    # -- field editing, mirrors `update` -------------------------------
    def update(self, field_name: str, value: str) -> None:
        if self.item:
            self.item = replace(self.item, **{field_name: value})

    # -- run the simulated decoding pipeline -----------------------------
    def run_demo_decoder(self, realtime: bool = True) -> None:
        """
        Equivalent of clicking "Run demo decoder", followed by the two
        `useEffect` hooks that drive `progress` and flip the phase to
        'complete' at 100%.

        The original ticks +4 every 180ms via setInterval. Set
        realtime=False to skip the sleeps (useful for tests/scripts).
        """
        if self.phase != Phase.READY:
            raise RuntimeError("Decoder can only be run from the 'ready' phase")

        self.progress = 0
        self.phase = Phase.PROCESSING

        while self.progress < 100:
            if realtime:
                time.sleep(0.18)  # 180ms, matches the original interval
            self.progress = min(100, self.progress + 4)
            stage_index = min(len(STAGES) - 1, self.progress // 20)
            if self.on_progress:
                self.on_progress(self.progress, STAGES[stage_index])

        self.phase = Phase.COMPLETE
        # Equivalent of the toast.success(...) on completion
        print("Demo transformation complete — these are illustrative "
              "results, not OCR of your image.")

    def stage_status(self) -> list[dict]:
        """
        Returns per-stage status, equivalent to the `done`/`active` logic
        used to render each <li> in the stages list.
        """
        result = []
        for i, step in enumerate(STAGES):
            done = self.complete or self.progress >= (i + 1) * 20
            active = self.running and (self.progress // 20) == i
            result.append({"stage": step, "done": done, "active": active})
        return result

    # -- transcription search, mirrors `searchText` ----------------------
    def search_text(self) -> Optional[tuple[int, int]]:
        """
        Case-insensitive search within item.text.
        Returns (start, end) character offsets of the first match, or None.
        (The original also focuses/selects the <textarea> — not applicable
        outside a browser, so only the offsets are returned here.)
        """
        if not self.item or not self.query.strip():
            return None
        index = self.item.text.lower().find(self.query.lower())
        if index == -1:
            print("No matching text found")
            return None
        return index, index + len(self.query)

    # -- copy transcription, mirrors `copy` ------------------------------
    def copy_transcription(self) -> str:
        """
        Returns the transcription text. In the browser this went to the
        clipboard via navigator.clipboard; here it's up to the caller to
        do something with the returned string (print it, use `pyperclip`,
        etc).
        """
        return self.item.text if self.item else ""

    # -- text-to-speech, mirrors `listen` --------------------------------
    def listen(self) -> None:
        """
        The original used the browser's SpeechSynthesis API with a script
        -> locale map. There's no direct equivalent in a plain Python
        script, so this just reports what *would* have been spoken and in
        which locale. Swap in a real TTS library (e.g. pyttsx3, gTTS) if
        you need actual audio.
        """
        if not self.item:
            print("Text-to-speech is not supported: no manuscript loaded.")
            return
        speech_locales = {
            "Tamil": "ta-IN", "Bengali": "bn-IN", "Kannada": "kn-IN",
            "Telugu": "te-IN", "Odia": "or-IN", "Perso-Arabic": "fa-IR",
        }
        locale = speech_locales.get(self.item.script, "hi-IN")
        print(f"[stub] Would read transcription aloud using locale '{locale}': "
              f"{self.item.text!r}")

    # -- metadata export, mirrors `exportMetadata` -----------------------
    def export_metadata(self, fmt: str) -> str:
        """
        Returns the exported metadata as a string (JSON or CSV), matching
        the fields and CSV-injection escaping of the original `escape()`
        helper (guards against formulas starting with =, +, @, -, tab, CR).
        """
        if not self.item:
            raise RuntimeError("No manuscript loaded")

        metadata = {
            "title": self.item.title,
            "script": self.item.script,
            "language": self.item.language,
            "subject": self.item.subject,
            "period": self.item.period,
            "location": self.item.location,
            "sampleConfidence": self.item.confidence,
            "date": self.item.date,
            "demo": True,
        }

        if fmt == "json":
            return json.dumps(metadata, indent=2)

        if fmt == "csv":
            def escape(value) -> str:
                s = str(value)
                if re.match(r"^[=+@\-\t\r]", s):
                    s = "'" + s
                return '"' + s.replace('"', '""') + '"'

            header = ",".join(metadata.keys())
            row = ",".join(escape(v) for v in metadata.values())
            return f"{header}\n{row}"

        raise ValueError(f"Unsupported format: {fmt!r} (expected 'json' or 'csv')")

    def save_to_collection(self) -> None:
        """Equivalent of clicking 'Save to session collection'."""
        if not self.item or not self.on_save:
            return
        self.on_save(replace(self.item, preferred_translation=self.language))


# ---------------------------------------------------------------------------
# Minimal CLI demo, exercising the same flow the UI walks a user through.
# ---------------------------------------------------------------------------

def _print_progress(pct: int, stage: str) -> None:
    bar = "#" * (pct // 4) + "-" * (25 - pct // 4)
    print(f"\r[{bar}] {pct:3d}%  {stage:<40}", end="", flush=True)
    if pct == 100:
        print()


def main() -> None:
    print("=== Manuscript Decoder (Python CLI demo) ===\n")

    workspace = DecoderWorkspace(on_progress=_print_progress)

    print("Choosing sample manuscript: 'The art of healing' (Sanskrit)\n")
    workspace.choose_sample(SAMPLE_MANUSCRIPTS[0])

    print("Running demo decoder...")
    workspace.run_demo_decoder(realtime=True)

    print("\n--- Transcription ---")
    print(workspace.item.text)

    print("\n--- Translation (English) ---")
    print(workspace.item.translations["English"])

    workspace.query = "सर्वे"
    match = workspace.search_text()
    if match:
        print(f"\nFound '{workspace.query}' at character range {match}")

    print("\n--- Metadata (JSON) ---")
    print(workspace.export_metadata("json"))

    print("\n--- Metadata (CSV) ---")
    print(workspace.export_metadata("csv"))

    workspace.listen()


if __name__ == "__main__":
    main()
