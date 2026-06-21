// pdfjs-dist 3.x legacy build — CommonJS, runs in Node without a worker
/* eslint-disable @typescript-eslint/no-require-imports */
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export async function extractPdfText(
  buffer: Buffer
): Promise<{ pageCount: number; text: string }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pageCount: number = pdf.numPages;
  const pages: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      (content.items as Array<{ str?: string }>)
        .map((item) => item.str ?? "")
        .join(" ")
    );
  }
  return { pageCount, text: pages.join("\n\n") };
}
