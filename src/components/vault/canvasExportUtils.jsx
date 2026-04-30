import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { jsPDF } from 'jspdf';

// ── HTML → plain text ───────────────────────────────────────────────
export function htmlToText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.innerText || tmp.textContent || '';
}

// ── HTML → Markdown (best-effort) ──────────────────────────────────
export function htmlToMarkdown(html) {
  let md = html || '';
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__');
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, c) =>
    c.trim().split('\n').map(l => '> ' + l).join('\n') + '\n'
  );
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

// ── Export helpers ──────────────────────────────────────────────────
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTxt(title, html) {
  const text = `${title}\n${'='.repeat(title.length)}\n\n${htmlToText(html)}`;
  download(new Blob([text], { type: 'text/plain' }), `${title}.txt`);
}

export function exportMd(title, html) {
  const md = `# ${title}\n\n${htmlToMarkdown(html)}`;
  download(new Blob([md], { type: 'text/markdown' }), `${title}.md`);
}

export async function exportDocx(title, html) {
  const lines = htmlToText(html).split('\n').filter(Boolean);
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
        ...lines.map(line => new Paragraph({ children: [new TextRun(line)] })),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  download(blob, `${title}.docx`);
}

export function exportPdf(title, html) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxW = pageW - margin * 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, margin, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const text = htmlToText(html);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, margin, 90);

  doc.save(`${title}.pdf`);
}