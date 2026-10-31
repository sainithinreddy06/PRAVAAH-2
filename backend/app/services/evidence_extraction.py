from __future__ import annotations

from io import BytesIO

from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader
import pytesseract
from pytesseract import TesseractNotFoundError


MAX_EXTRACTED_CHARACTERS = 50_000
MAX_PDF_PAGES = 100


class EvidenceExtractionError(ValueError):
    """Evidence content could not be safely extracted."""


def extract_evidence_text(content: bytes, content_type: str | None) -> dict[str, object]:
    """Extract a bounded text preview from supported evidence; this is not AI verification."""
    if not content:
        raise EvidenceExtractionError('Evidence file is empty')

    if content_type == 'application/pdf':
        try:
            reader = PdfReader(BytesIO(content), strict=True)
            if reader.is_encrypted:
                raise EvidenceExtractionError('Encrypted PDFs are not supported for text extraction')
            if len(reader.pages) > MAX_PDF_PAGES:
                raise EvidenceExtractionError(f'PDF exceeds the {MAX_PDF_PAGES}-page extraction limit')
            text_parts: list[str] = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or '')
                if sum(map(len, text_parts)) >= MAX_EXTRACTED_CHARACTERS:
                    break
            extracted = '\n'.join(text_parts).strip()
            if not extracted:
                return {
                    'method': 'pdf_text_layer',
                    'text': '',
                    'character_count': 0,
                    'truncated': False,
                    'message': 'No selectable text was found. Scanned PDFs require OCR processing before text can be reviewed.',
                }
            return {
                'method': 'pdf_text_layer',
                'text': extracted[:MAX_EXTRACTED_CHARACTERS],
                'character_count': min(len(extracted), MAX_EXTRACTED_CHARACTERS),
                'truncated': len(extracted) > MAX_EXTRACTED_CHARACTERS,
                'message': 'Extracted text is unverified and may be incomplete. A reviewer must compare it with the original document.',
            }
        except EvidenceExtractionError:
            raise
        except Exception as exc:
            raise EvidenceExtractionError('The PDF could not be parsed safely') from exc

    if content_type in {'image/jpeg', 'image/png'}:
        try:
            with Image.open(BytesIO(content)) as image:
                image.verify()
            with Image.open(BytesIO(content)) as image:
                image = image.convert('RGB')
                extracted = pytesseract.image_to_string(image, timeout=20).strip()
            return {
                'method': 'tesseract_ocr',
                'text': extracted[:MAX_EXTRACTED_CHARACTERS],
                'character_count': min(len(extracted), MAX_EXTRACTED_CHARACTERS),
                'truncated': len(extracted) > MAX_EXTRACTED_CHARACTERS,
                'message': 'OCR can misread names, dates and numbers. Verify every extracted field against the original image.',
            }
        except TesseractNotFoundError as exc:
            raise RuntimeError('OCR engine is not installed on this service') from exc
        except RuntimeError as exc:
            raise RuntimeError('OCR processing timed out or failed') from exc
        except (UnidentifiedImageError, OSError) as exc:
            raise EvidenceExtractionError('The image could not be decoded safely') from exc

    raise EvidenceExtractionError('Text extraction supports PDF, JPEG and PNG evidence only')
