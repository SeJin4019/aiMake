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
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  // Helper for text wrapping
  const addText = (text, size = 10, isBold = false, marginBottom = 5) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    
    // Simple text wrapping - jspdf splitTextToSize
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2)
    
    if (y + lines.length * (size / 2) > 280) {
      doc.addPage()
      y = 20
    }
    
    doc.text(lines, margin, y)
    y += lines.length * (size / 2) + marginBottom
  }

  addText('English Exam Questions', 18, true, 10)
  addText('Passage:', 14, true, 5)
  addText(passage, 10, false, 10)

  questions.forEach((q, index) => {
    addText(`Q${index + 1}. [${getTypeLabel(q.type)}]`, 12, true, 5)
    addText(q.question, 11, false, 5)
    
    if (q.options) {
      q.options.forEach((opt, oIndex) => {
        addText(`${oIndex + 1}. ${opt}`, 10, false, 2)
      })
      y += 3
    }

    addText(`Answer: ${q.answer}`, 10, true, 2)
    addText(`Explanation: ${q.explanation}`, 10, false, 8)
  })

  doc.save(`English_Exam_${new Date().toISOString().split('T')[0]}.pdf`)
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
