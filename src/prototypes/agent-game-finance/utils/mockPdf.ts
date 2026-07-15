/** 浏览器端生成可打开的最小 PDF（原型 mock，无第三方库） */

function escapePdfLiteral(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function toUtf16Hex(text: string): string {
  let hex = '<FEFF';
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    hex += code.toString(16).padStart(4, '0').toUpperCase();
  }
  hex += '>';
  return hex;
}

function isAsciiPrintable(text: string): boolean {
  return /^[\x20-\x7E]*$/.test(text);
}

function pdfText(text: string): string {
  return isAsciiPrintable(text) ? `(${escapePdfLiteral(text)})` : toUtf16Hex(text);
}

function buildContentStream(lines: string[]): string {
  const leading = 14;
  const lineHeight = 16;
  const startY = 760;
  const parts = ['BT'];
  lines.forEach((line, index) => {
    const y = startY - index * lineHeight;
    parts.push(`/F1 ${leading} Tf`);
    parts.push(`50 ${y} Td`);
    parts.push(`${pdfText(line)} Tj`);
    parts.push('0 0 Td');
  });
  parts.push('ET');
  return parts.join('\n');
}

export function createMockPdf(lines: string[]): Blob {
  const content = buildContentStream(lines);
  const contentLength = new TextEncoder().encode(content).length;

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /STSongStd-Light /Encoding /UniGB-UCS2-H /DescendantFonts [6 0 R] >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSongStd-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> /FontDescriptor 7 0 R /DW 1000 >>\nendobj\n',
    '7 0 obj\n<< /Type /FontDescriptor /FontName /STSongStd-Light /Flags 6 /FontBBox [-25 -254 1000 880] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 880 /StemV 93 >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadMockPdf(filename: string, lines: string[]) {
  const blob = createMockPdf(lines);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
