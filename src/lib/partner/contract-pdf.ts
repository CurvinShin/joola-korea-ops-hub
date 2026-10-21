import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { RenderedContract } from "./contract-template";

// 서명이 끝난 계약서를 PDF로 만든다. SERVER-ONLY (fs로 한글 글꼴 파일을 읽는다).
// 글꼴: assets/fonts/NotoSansKR-Regular.ttf (SIL Open Font License). next.config.js의
// outputFileTracingIncludes로 배포에 함께 포함된다.

export interface SignedContractPdfInput {
  facilityName: string;
  content: RenderedContract;
  content_hash: string;
  template_version: string;
  effective_date: string | null;
  partner_signed_at: string | null;
  partner_signer_name: string | null;
  partner_signature_png: string | null;
  partner_seal_png: string | null;
  joola_signed_at: string | null;
  joola_signer_name: string | null;
  joola_signature_png: string | null;
  joola_seal_png: string | null;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const TEXT_W = PAGE_W - MARGIN * 2;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.4, 0.42, 0.46);

function fmtDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

// 공백 단위로 줄을 나누고, 한 단어가 한 줄보다 길면 글자 단위로 자른다.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let chunk = "";
      for (const ch of word) {
        if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

async function embedDataUrlPng(pdf: PDFDocument, dataUrl: string | null): Promise<PDFImage | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) return null;
  try {
    return await pdf.embedPng(Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  } catch {
    return null;
  }
}

export async function buildSignedContractPdf(input: SignedContractPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readFile(path.join(process.cwd(), "assets", "fonts", "NotoSansKR-Regular.ttf"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  pdf.setTitle(`JOOLA 브랜드 파트너십 계약서 - ${input.facilityName}`);
  pdf.setProducer("JOOLA Korea Ops Hub");

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (height: number) => {
    if (y - height < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawLines = (text: string, size: number, opts: { indent?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const indent = opts.indent ?? 0;
    const lineH = size * 1.55;
    for (const line of wrapText(text, font, size, TEXT_W - indent)) {
      ensure(lineH);
      y -= lineH;
      page.drawText(line, { x: MARGIN + indent, y: y + size * 0.25, size, font, color: opts.color ?? INK });
    }
    y -= opts.gap ?? 0;
  };

  // 제목
  const title = input.content.title;
  const titleSize = 17;
  y -= titleSize * 1.4;
  page.drawText(title, {
    x: (PAGE_W - font.widthOfTextAtSize(title, titleSize)) / 2,
    y,
    size: titleSize,
    font,
    color: INK,
  });
  y -= 18;

  drawLines(input.content.preamble, 10, { gap: 10 });

  for (const article of input.content.articles) {
    ensure(40);
    drawLines(article.title, 11.5, { gap: 2 });
    article.clauses.forEach((clause, i) => {
      const prefix = article.clauses.length > 1 ? `${i + 1}. ` : "";
      drawLines(`${prefix}${clause.text}`, 10, { indent: 8, gap: 2 });
      for (const sub of clause.subs ?? []) drawLines(`- ${sub}`, 10, { indent: 24, gap: 1 });
    });
    y -= 8;
  }

  // 서명란: 한 페이지 안에 모두 들어가도록 새 페이지에서 시작하지 않고, 모자라면 넘긴다.
  ensure(250);
  y -= 6;
  drawLines("위 내용으로 계약을 체결하고, 양 당사자는 전자서명하였습니다.", 10, { gap: 10 });

  const colW = (TEXT_W - 20) / 2;
  const boxTop = y;
  const boxH = 150;
  const parties = [
    {
      label: "JOOLA (스포츠스쿼드 주식회사)",
      name: input.joola_signer_name,
      at: input.joola_signed_at,
      sign: await embedDataUrlPng(pdf, input.joola_signature_png),
      seal: await embedDataUrlPng(pdf, input.joola_seal_png),
    },
    {
      label: `브랜드 파트너 (${input.facilityName})`,
      name: input.partner_signer_name,
      at: input.partner_signed_at,
      sign: await embedDataUrlPng(pdf, input.partner_signature_png),
      seal: await embedDataUrlPng(pdf, input.partner_seal_png),
    },
  ];

  parties.forEach((p, idx) => {
    const x = MARGIN + idx * (colW + 20);
    page.drawRectangle({ x, y: boxTop - boxH, width: colW, height: boxH, borderColor: rgb(0.8, 0.82, 0.85), borderWidth: 0.8 });
    const labelLines = wrapText(p.label, font, 10, colW - 16);
    let ty = boxTop - 18;
    for (const l of labelLines) {
      page.drawText(l, { x: x + 8, y: ty, size: 10, font, color: INK });
      ty -= 14;
    }
    page.drawText(`서명자: ${p.name ?? "-"}`, { x: x + 8, y: ty, size: 9.5, font, color: INK });
    ty -= 13;
    page.drawText(`서명 일시: ${fmtDateTime(p.at)}`, { x: x + 8, y: ty, size: 8.5, font, color: MUTED });

    const imgBottom = boxTop - boxH + 10;
    if (p.sign) {
      const s = Math.min(150 / p.sign.width, 60 / p.sign.height, 1) || 1;
      page.drawImage(p.sign, { x: x + 10, y: imgBottom + 4, width: p.sign.width * s, height: p.sign.height * s });
    }
    if (p.seal) {
      const s = Math.min(64 / p.seal.width, 64 / p.seal.height, 1) || 1;
      page.drawImage(p.seal, { x: x + colW - 10 - p.seal.width * s, y: imgBottom, width: p.seal.width * s, height: p.seal.height * s });
    }
  });
  y = boxTop - boxH - 14;

  ensure(70);
  drawLines(`계약일: ${input.effective_date ?? "-"}`, 9, { color: MUTED });
  drawLines(`계약서 문구 버전: ${input.template_version}`, 9, { color: MUTED });
  drawLines(`본문 SHA-256: ${input.content_hash}`, 8, { color: MUTED });

  // 쪽 번호
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    const label = `${i + 1} / ${pages.length}`;
    pg.drawText(label, {
      x: (PAGE_W - font.widthOfTextAtSize(label, 8)) / 2,
      y: 28,
      size: 8,
      font,
      color: MUTED,
    });
  });

  return pdf.save();
}

export function contractPdfFileName(facilityName: string): { ascii: string; utf8: string } {
  const safe = facilityName.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40) || "partner";
  return {
    ascii: "JOOLA_brand_partnership_contract.pdf",
    utf8: encodeURIComponent(`JOOLA_브랜드파트너십_계약서_${safe}.pdf`),
  };
}
