from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'AI_Legal_Document_Intelligence_Project_Report.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCustom', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=24, leading=29, alignment=TA_CENTER, textColor=colors.black, spaceAfter=18))
styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=16, alignment=TA_CENTER, textColor=colors.HexColor('#333333')))
styles.add(ParagraphStyle(name='H1Custom', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=16, leading=20, spaceBefore=3, spaceAfter=8, textColor=colors.black))
styles.add(ParagraphStyle(name='H2Custom', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=11.5, leading=15, spaceBefore=8, spaceAfter=4, textColor=colors.black))
styles.add(ParagraphStyle(name='BodyCustom', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.5, leading=14, spaceAfter=7))
styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#333333')))
styles.add(ParagraphStyle(name='Quote', parent=styles['BodyText'], fontName='Helvetica-Oblique', fontSize=10, leading=15, leftIndent=16, rightIndent=16, borderColor=colors.black, borderWidth=0.6, borderPadding=8, spaceBefore=6, spaceAfter=10))

def p(text, style='BodyCustom'):
    return Paragraph(text, styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(0.4)
    canvas.line(2*cm, 1.45*cm, A4[0]-2*cm, 1.45*cm)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(2*cm, 1.0*cm, 'AI Legal Document Intelligence Platform | B.Tech Major Project')
    canvas.drawRightString(A4[0]-2*cm, 1.0*cm, f'Page {doc.page}')
    canvas.restoreState()

story = []
story += [Spacer(1, 4.4*cm), p('AI Legal Document Intelligence Platform', 'TitleCustom'), p('Evidence-first contract question answering, readiness review and controlled clause redlining', 'Subtitle'), Spacer(1, 1.2*cm)]
cover = Table([
    ['Project Type', 'B.Tech Computer Science Engineering Major Project'],
    ['Scope', 'Prototype for contract evidence retrieval and review'],
    ['Core Methods', 'ChromaDB semantic retrieval, Contract Graph, Policy Graph, Groq LLM'],
    ['Safety Boundary', 'Readiness and risk screening only; no legal-validity decision']
], colWidths=[4.2*cm, 11.4*cm])
cover.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,colors.black),('BACKGROUND',(0,0),(0,-1),colors.HexColor('#eeeeee')),('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('FONTNAME',(1,0),(1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),9.5),('LEADING',(0,0),(-1,-1),13),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
story += [cover, Spacer(1, 0.8*cm), p('Prepared for Major Project Submission', 'Subtitle'), PageBreak()]

story += [p('1. Problem Statement and Research Gap', 'H1Custom'), p('Contracts contain linked definitions, exceptions, schedules and annexures. A contract chatbot can retrieve a clause that appears relevant while missing a dependent attachment or definition that changes the meaning. In this setting, a fluent answer can be unsupported.', 'BodyCustom'), p('Research context', 'H2Custom'), p('ContractNLI frames contract understanding as document-level inference and asks systems to identify evidence spans. It reports that contract characteristics such as exception-based negation make the task difficult [1]. LegalBench-RAG focuses specifically on legal retrieval and argues that precise relevant snippets support citations and reduce long-context failure modes [2]. PAKTON demonstrates an end-to-end RAG framework for long legal agreements [3]. COMPACT models cross-clause dependencies using structured clause graphs and shows that multi-clause reasoning remains difficult [4].', 'BodyCustom'), p('Research gap addressed by this project', 'H2Custom'), p('Existing legal RAG and graph-based systems retrieve clauses and may traverse cross-references. However, an answer can still be generated when a required definition, schedule, exhibit or exception is absent from the evidence bundle. This prototype introduces a <b>dependency-completeness gate</b>: it identifies relevant linked references, retrieves available dependencies, and abstains with an evidence-missing warning when required support is absent.', 'Quote'), p('Research question', 'H2Custom'), p('Can dependency-aware GraphRAG with evidence-completeness verification reduce unsupported answers to contract questions while avoiding unnecessary refusal of answerable questions?', 'BodyCustom'), PageBreak()]

story += [p('2. Proposed Architecture', 'H1Custom'), p('The platform separates semantic retrieval, relationship reasoning, policy checks and language generation. Each layer has a defined role, making the system easier to explain, test and audit.', 'BodyCustom')]
arch = Table([
    ['Layer', 'Responsibility', 'Implementation'],
    ['Document parsing', 'Extract structural clauses, headings, pages and explicit references', 'FastAPI + PyMuPDF'],
    ['Semantic retrieval', 'Find clauses with similar meaning even when wording differs', 'ChromaDB + all-MiniLM-L6-v2'],
    ['Contract Graph', 'Follow clause-to-clause and schedule/annexure references', 'Node.js + PostgreSQL or in-memory development store'],
    ['Completeness gate', 'Detect unresolved evidence required by the selected answer path', 'Deterministic dependency verification'],
    ['Policy Graph', 'Apply document-type review checks and approved redline templates', 'Versioned JSON policy graph'],
    ['LLM generation', 'Write plain-language answers only from retrieved evidence', 'Groq API, GPT-OSS-20B']
], colWidths=[3.2*cm, 7.3*cm, 5.1*cm])
arch.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.45,colors.black),('BACKGROUND',(0,0),(-1,0),colors.black),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTNAME',(0,1),(-1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),8.3),('LEADING',(0,0),(-1,-1),10.5),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
story += [arch, Spacer(1, 0.5*cm), p('Question-answering flow', 'H2Custom'), p('User question → ChromaDB retrieves semantic candidates → lexical ranking contributes exact contract terms → Contract Graph expands linked definitions/schedules → completeness gate verifies evidence → Groq receives original retrieved text and returns a cited answer. When a required reference is missing, the platform returns an abstention rather than a speculative answer.', 'BodyCustom'), p('Why the embedding and generation models differ', 'H2Custom'), p('The same embedding model must index both clauses and user questions. It does not need to be the same model as the generator. MiniLM creates stable semantic vectors for search; Groq receives the retrieved original clause text and produces the final natural-language answer. This is a standard retrieval-generation separation.', 'BodyCustom'), PageBreak()]

story += [p('3. Implemented Functionality and Evaluation Plan', 'H1Custom'), p('Implemented prototype functionality', 'H2Custom')]
features = Table([
    [p('Feature', 'Small'), p('Demonstration outcome', 'Small')],
    [p('Contract Q&amp;A', 'Small'), p('Answers are constrained to retrieved clauses and citations.', 'Small')],
    [p('Multi-hop GraphRAG', 'Small'), p('Definitions, schedules and cross-referenced clauses expand the evidence context.', 'Small')],
    [p('Evidence abstention', 'Small'), p('If a referenced schedule is absent, the system reports insufficient evidence.', 'Small')],
    [p('Readiness review', 'Small'), p('Flags missing expected components and risky language such as open-ended deposit deductions.', 'Small')],
    [p('Controlled redlining', 'Small'), p('Uses a policy graph template and labels every replacement as requiring human review.', 'Small')],
    [p('Four demo contracts', 'Small'), p('Mutual NDA, residential rent, employment and software service agreements.', 'Small')]
], colWidths=[5.0*cm, 10.6*cm])
features.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.45,colors.black),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dddddd')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTNAME',(0,1),(-1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),9),('LEADING',(0,0),(-1,-1),12),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
story += [features, Spacer(1, 0.45*cm), p('Evaluation plan', 'H2Custom'), p('Compare lexical RAG, hybrid vector-plus-lexical retrieval, GraphRAG, and GraphRAG with the completeness gate. Evaluate four controlled cases: (1) all supporting evidence exists, (2) a linked clause exists but initial retrieval misses it, (3) a required schedule is absent, and (4) an unrelated attachment is absent.', 'BodyCustom'), p('Metrics: retrieval completeness, answer correctness, citation support, unsupported-answer rate, correct abstention rate, wrong-refusal rate and latency. The primary claim to test is a reduction in unsupported answers when critical dependencies are absent.', 'BodyCustom'), p('Limitations', 'H2Custom'), p('The prototype is a technical decision-support system. It does not determine legal validity, enforceability or compliance with all laws. Policy templates cover only selected document types and must be reviewed by a qualified person before use.', 'BodyCustom'), p('4. References', 'H1Custom'), p('[1] Koreeda, Y. and Manning, C. (2021). ContractNLI: A Dataset for Document-level Natural Language Inference for Contracts. Findings of EMNLP 2021. https://aclanthology.org/2021.findings-emnlp.164/', 'Small'), p('[2] Pipitone, N. and Alami, G. H. (2024). LegalBench-RAG: A Benchmark for Retrieval-Augmented Generation in the Legal Domain. arXiv:2408.10343. https://arxiv.org/abs/2408.10343', 'Small'), p('[3] Raptopoulos, P. et al. (2025). PAKTON: A Multi-Agent Framework for Question Answering in Long Legal Agreements. EMNLP 2025. https://aclanthology.org/2025.emnlp-main.403/', 'Small'), p('[4] Singh, A. et al. (2026). COMPACT: Building Compliance Paralegals via Clause Graph Reasoning over Contracts. EACL 2026. https://aclanthology.org/2026.eacl-long.377/', 'Small')]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.8*cm, bottomMargin=2.1*cm)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
