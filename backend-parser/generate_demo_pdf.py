"""Generate the controlled two-page contract used in the viva demonstration."""

from pathlib import Path

from test_service import generate_synthetic_legal_pdf


OUTPUT_PATH = Path(__file__).resolve().parent.parent / "backend-api" / "sample_contract.pdf"


if __name__ == "__main__":
    OUTPUT_PATH.write_bytes(generate_synthetic_legal_pdf())
    print(f"Created {OUTPUT_PATH}")
