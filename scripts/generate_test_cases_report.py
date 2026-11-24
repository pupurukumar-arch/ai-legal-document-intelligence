from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'AI_Legal_Platform_Test_Cases_and_Results.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
s = getSampleStyleSheet()
s.add(ParagraphStyle(name='T', parent=s['Title'], fontName='Helvetica-Bold', fontSize=22, leading=27, spaceAfter=12))
s.add(ParagraphStyle(name='H', parent=s['Heading1'], fontName='Helvetica-Bold', fontSize=15, leading=19, spaceBefore=4, spaceAfter=7))
s.add(ParagraphStyle(name='B', parent=s['BodyText'], fontName='Helvetica', fontSize=9.3, leading=13, spaceAfter=6))
s.add(ParagraphStyle(name='S', parent=s['BodyText'], fontName='Helvetica', fontSize=7.7, leading=10))
def p(v, style='B'): return Paragraph(v, s[style])
def footer(c, d):
    c.saveState(); c.setLineWidth(.4); c.line(2*cm,1.45*cm,A4[0]-2*cm,1.45*cm); c.setFont('Helvetica',8); c.drawString(2*cm,1*cm,'AI Legal Document Intelligence Platform | Test Cases and Results'); c.drawRightString(A4[0]-2*cm,1*cm,f'Page {d.page}'); c.restoreState()

story=[p('Test Cases and Results','T'),p('AI Legal Document Intelligence Platform','B'),p('Test environment: local Node.js API, FastAPI parser, local ChromaDB semantic store and Groq GPT-OSS-20B generation. Test date: 24 November 2026.','B'),Spacer(1,.3*cm),p('1. Test inputs','H')]
inputs=[['ID','Input PDF','Document type','Purpose'],['D1','Mutual NDA Demo','NDA','Normal evidence retrieval and linked Schedule A'],['D2','Residential Rent Demo','Rent agreement','Security-deposit risk and redline'],['D3','Employment Agreement Demo','Employment agreement','Resignation notice question'],['D4','Software Service Demo','Service agreement','Liability-cap absence and readiness finding'],['D5','Sample Contract','NDA','Missing Schedule B abstention case']]
inputs=[[p(c,'S') for c in row] for row in inputs]
t=Table(inputs,colWidths=[1*cm,4.5*cm,3.6*cm,6.5*cm]);t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.45,colors.black),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dddddd')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]));story += [t,Spacer(1,.35*cm),p('2. Functional test cases','H')]
cases=[
['TC-01','Health check','Call /health on Node and parser services.','Both services report healthy; parser reachable; Groq configured.','PASS'],
['TC-02','PDF parsing and indexing','Upload D1 through the Node API.','Clauses extracted and stored; each clause indexed in ChromaDB.','PASS'],
['TC-03','Hybrid retrieval','Ask D1: “What information is excluded from confidentiality?”','Vector candidates plus lexical seeds returned; graph expands Schedule A.','PASS'],
['TC-04','Grounded answer','Run a supported contract question with Groq enabled.','Answer contains only retrieved evidence and valid clause IDs.','PASS'],
['TC-05','Missing-evidence guardrail','Ask D5 about the referenced Schedule B.','System abstains and identifies Schedule B as missing.','PASS'],
['TC-06','Readiness review','Run readiness check on D2.','Flags “any amount” and “sole discretion” in the security-deposit clause.','PASS'],
['TC-07','Controlled redline','Submit D2 deposit clause to /api/redline.','Returns policy-template replacement and requires human review.','PASS'],
['TC-08','Liability evidence gap','Ask D4 for supplier liability limit.','Reports no stated limit and cites inspected liability clause SEC-5.','PASS'],
['TC-09','Document-type metadata','Upload PDF with selected document type.','Type travels with upload response and drives correct readiness checklist.','PASS']]
header = [Paragraph(f'<font color="#FFFFFF">{c}</font>', s['S']) for c in ['Test ID','Scenario','Action','Expected result','Result']]
rows=[header]+[[p(c,'S') for c in row] for row in cases]
t=Table(rows,colWidths=[1.25*cm,2.8*cm,4.0*cm,6.6*cm,1.2*cm],repeatRows=1);t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.35,colors.black),('BACKGROUND',(0,0),(-1,0),colors.black),('TEXTCOLOR',(0,0),(-1,0),colors.white),('BACKGROUND',(-1,1),(-1,-1),colors.HexColor('#eeeeee')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]));story += [t,PageBreak(),p('3. Observed results','H'),p('Normal question-answering cases completed successfully across NDA, rent, employment and service-agreement inputs. Each upload parsed the PDF and indexed all extracted clauses in local ChromaDB. Hybrid retrieval returned semantic vector matches before Contract Graph traversal.','B'),p('The rent case identified the exact risky patterns “any amount” and “sole discretion.” The policy graph produced a balanced replacement clause and marked it as a draft requiring human review.','B'),p('The negative case behaved correctly: where the uploaded sample contract referenced Schedule B but did not include it, the system returned INSUFFICIENT_EVIDENCE and did not ask Groq to invent the schedule content.','B'),p('4. Defects found and rectified','H')]
fixes=[['Issue','Fix applied'],['Service checklist showed scope of work as missing despite a Scope of Services clause.','Added the scope_of_work keyword mapping to the readiness service.'],['Groq could return a useful no-limit answer without a citation.','Enforced a fallback citation to the first retrieved evidence clause whenever answer text exists.'],['Duplicate heading IDs in PDFs could cause ChromaDB index-ID collision.','Vector IDs now include a per-clause sequence while preserving original clause IDs as metadata.']]
t=Table([[p(c,'S') for c in row] for row in fixes],colWidths=[7*cm,8.85*cm]);t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.4,colors.black),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dddddd')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]));story += [t,Spacer(1,.4*cm),p('5. Acceptance criteria','H'),p('The prototype passes acceptance when it parses normal PDFs, indexes clauses, retrieves relevant evidence, expands required graph dependencies, produces cited grounded answers, abstains for missing evidence, flags risk patterns and returns only human-review-required redline drafts. The completed tests meet these criteria in the local demonstration environment.','B')]

SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=2*cm,leftMargin=2*cm,topMargin=1.8*cm,bottomMargin=2.1*cm).build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
