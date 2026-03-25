import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'

/**
 * Exporter Service
 * Handles the generation of DOCX and PDF files.
 */

export const exportToDocx = async (questions, passage) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'English Exam Questions',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: 'Passage:',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: passage,
            spacing: { after: 400 }
          }),
          ...questions.flatMap((q, index) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Q${index + 1}. [${getTypeLabel(q.type)}]`, bold: true }),
              ],
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: q.question,
              spacing: { after: 200 }
            }),
            ...(q.options ? q.options.map((opt, oIndex) => 
              new Paragraph({
                text: `${oIndex + 1}. ${opt}`,
                indent: { left: 720 },
                spacing: { after: 100 }
              })
            ) : []),
            new Paragraph({
              children: [
                new TextRun({ text: 'Answer: ', bold: true }),
                new TextRun({ text: q.answer }),
              ],
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Explanation: ', bold: true }),
                new TextRun({ text: q.explanation }),
              ],
              spacing: { after: 400 }
            })
          ])
        ]
      }
    ]
  })

  const blob = await Packer.toBlob(doc)
  const filename = `English_Exam_${new Date().toISOString().split('T')[0]}.docx`
  
  // Try using saveAs if available, otherwise fallback
  try {
    const { saveAs } = await import('file-saver')
    saveAs(blob, filename)
  } catch (e) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }
}

export const exportToPdf = async (questions, passage) => {
  const printWindow = window.open('', '_blank');
  const date = new Date().toISOString().split('T')[0];
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>English Exam - ${date}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Inter:wght@400;700&display=swap');
        body {
          font-family: 'Inter', 'Noto Sans KR', sans-serif;
          line-height: 1.6;
          color: #1e293b;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        h1 { text-align: center; color: #4f46e5; margin-bottom: 40px; }
        .section-title { font-size: 1.2rem; font-weight: bold; border-bottom: 2px solid #e2e8f0; margin: 30px 0 15px; padding-bottom: 5px; }
        .passage { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #4f46e5; margin-bottom: 30px; font-style: italic; }
        .question-card { margin-bottom: 30px; page-break-inside: avoid; }
        .question-header { font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .type-tag { font-size: 0.75rem; background: #eef2ff; color: #4f46e5; padding: 2px 10px; border-radius: 99px; font-weight: 600; }
        .question-text { font-size: 1.1rem; margin-bottom: 15px; }
        .options { margin-left: 20px; margin-top: 10px; list-style-type: none; padding: 0; }
        .option-item { margin-bottom: 8px; font-size: 1rem; }
        .answer-key { margin-top: 15px; font-size: 0.9rem; background: #f1f5f9; padding: 15px; border-radius: 6px; }
        .label { font-weight: bold; color: #4f46e5; margin-right: 8px; }
        .explanation { color: #475569; margin-top: 5px; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>English Exam Questions</h1>
      
      <div class="section-title">Passage</div>
      <div class="passage">${passage}</div>
      
      <div class="section-title">Questions</div>
      ${questions.map((q, index) => `
        <div class="question-card">
          <div class="question-header">
            <span>Question ${index + 1}</span>
            <span class="type-tag">${getTypeLabel(q.type)}</span>
          </div>
          <div class="question-text">${q.question.replace(/\n/g, '<br>')}</div>
          
          ${q.options ? `
            <ul class="options">
              ${q.options.map((opt, oIndex) => `
                <li class="option-item">${oIndex + 1}. ${opt}</li>
              `).join('')}
            </ul>
          ` : ''}
          
          <div class="answer-key">
            <div><span class="label">Answer:</span> ${q.answer}</div>
            <div class="explanation"><span class="label">Explanation:</span> ${q.explanation}</div>
          </div>
        </div>
      `).join('')}
      
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
}

const getTypeLabel = (type) => {
  const labels = {
    'main-idea-ko': '주제 찾기 (한글)',
    'main-idea-en': '주제 찾기 (영어)',
    'blank': '빈칸 추론',
    'insertion': '문장 삽입',
    'ordering': '순서 배열',
    'descriptive': '서술형'
  }
  return labels[type] || type
}
