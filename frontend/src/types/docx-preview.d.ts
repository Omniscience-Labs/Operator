declare module 'docx-preview' {
  export interface DocxPreviewOptions {
    className?: string;
    inWrapper?: boolean;
    ignoreWidth?: boolean;
    ignoreHeight?: boolean;
    ignoreFonts?: boolean;
    breakPages?: boolean;
    ignoreLastRenderedPageBreak?: boolean;
    experimental?: boolean;
    useBase64URL?: boolean;
    debug?: boolean;
    renderHeaders?: boolean;
    renderFooters?: boolean;
    renderFootnotes?: boolean;
    renderEndnotes?: boolean;
    renderComments?: boolean;
    trimXmlDeclaration?: boolean;
  }

  export function renderAsync(
    data: ArrayBuffer,
    bodyContainer: HTMLElement,
    styleContainer?: HTMLElement,
    options?: DocxPreviewOptions
  ): Promise<void>;
} 