declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: { unit?: string; format?: string; orientation?: string };
    pagebreak?: Record<string, unknown>;
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    save(): Promise<void>;
    output(type: string): Promise<unknown>;
    toPdf(): Html2Pdf;
    toImg(): Html2Pdf;
    toCanvas(): Html2Pdf;
    toContainer(): Html2Pdf;
  }

  function html2pdf(): Html2Pdf;
  export = html2pdf;
}
