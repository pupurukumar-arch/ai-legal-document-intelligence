"""Generate small, fictional PDF agreements for the project demonstration.

These documents deliberately contain simple clauses and cross-references so the
parser, contract graph, review dashboard and redline panel can be demonstrated.
They are not legal forms and must not be used as agreements.
"""
from pathlib import Path
import pymupdf as fitz

OUT = Path(__file__).resolve().parent.parent / "demo-documents"

DOCUMENTS = {
    "01_Mutual_NDA_Demo.pdf": [
        "MUTUAL NON-DISCLOSURE AGREEMENT — FICTIONAL DEMO ONLY",
        "1. Confidential Information\nConfidential Information means non-public technical, business and customer information disclosed by either party.",
        "2. Exclusions\nThe obligations do not apply to information publicly available, independently developed, lawfully received from a third party, or identified in Schedule A. See Section 1.",
        "3. Non-Disclosure Duty\nThe Receiving Party shall use reasonable care and may disclose information only as stated in Schedule B.",
        "Schedule A — Excluded Information\nPublic marketing material, open-source documentation and pre-existing audit reports.",
        "Schedule B — Permitted Recipients\nPersonnel with a need to know who are bound by equivalent confidentiality obligations."
    ],
    "02_Residential_Rent_Demo.pdf": [
        "RESIDENTIAL RENT AGREEMENT — FICTIONAL DEMO ONLY",
        "1. Premises and Term\nThe Landlord lets the premises at 12 Lake Road to the Tenant for eleven months.",
        "2. Rent\nMonthly rent is payable on or before the fifth day of each calendar month.",
        "3. Maintenance\nThe Tenant keeps the premises reasonably clean. Structural repairs remain the Landlord's responsibility.",
        "4. Security Deposit\nThe Landlord may deduct any amount from the security deposit at the Landlord's sole discretion after handover. See Section 5.",
        "5. Termination\nEither party may terminate by thirty days' written notice. Material breach must first be notified in writing."
    ],
    "03_Employment_Agreement_Demo.pdf": [
        "EMPLOYMENT AGREEMENT — FICTIONAL DEMO ONLY",
        "1. Role and Start Date\nThe Employee joins as Software Engineer from the stated start date.",
        "2. Compensation\nCompensation and statutory deductions are described in Schedule A.",
        "3. Confidentiality\nThe Employee shall protect confidential business information during employment and after separation.",
        "4. Intellectual Property\nWork product created in the course of employment shall be assigned as permitted by applicable law.",
        "5. Resignation and Notice\nThe Employee may resign by providing written notice to the Employer.",
        "Schedule A — Compensation\nMonthly gross compensation, reimbursement rules and payroll date are recorded here."
    ],
    "04_Software_Service_Agreement_Demo.pdf": [
        "SOFTWARE SERVICE AGREEMENT — FICTIONAL DEMO ONLY",
        "1. Scope of Services\nThe Supplier shall deliver implementation services described in Statement of Work A.",
        "2. Milestones and Acceptance\nDeliverables are accepted after written confirmation or after the review period in Statement of Work A.",
        "3. Fees and Payment\nThe Customer shall pay undisputed invoices within thirty days of receipt.",
        "4. Confidentiality\nEach party shall protect the other party's confidential information using reasonable care.",
        "5. Liability\nSupplier shall be liable for all losses, damages and claims arising from this Agreement.",
        "Statement of Work A\nThe project includes discovery, implementation, user acceptance testing and deployment."
    ]
}

def write_pdf(filename, sections):
    document = fitz.open()
    page = document.new_page(width=595, height=842)
    y = 55
    for index, section in enumerate(sections):
        rect = fitz.Rect(50, y, 545, min(y + 110, 790))
        page.insert_textbox(rect, section, fontsize=11 if index else 14, fontname="helv", color=(0, 0, 0), lineheight=1.35)
        y += 105 if index else 62
        if y > 730 and index < len(sections) - 1:
            page = document.new_page(width=595, height=842)
            y = 55
    document.save(OUT / filename)

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, content in DOCUMENTS.items():
        write_pdf(name, content)
    print(f"Created {len(DOCUMENTS)} fictional demo PDFs in {OUT}")
