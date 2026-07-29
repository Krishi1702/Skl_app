"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfViewerProps {
  url: string;
}

// Dynamically loaded at runtime — never bundled into the server build
export default function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(680);

  // Measure the actual space available (not the raw window width) so the
  // page fits its card on both the two-column desktop layout and mobile.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset to page 1 whenever a different PDF is loaded
  useEffect(() => {
    setPage(1);
  }, [url]);

  // Lazy-load react-pdf only in the browser
  const [PdfComponents, setPdfComponents] = useState<{
    Document: React.ComponentType<any>;
    Page: React.ComponentType<any>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("react-pdf");
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
      // Inject react-pdf CSS via link tags (avoids TS CSS import issues)
      for (const href of [
        "/pdf-annotation-layer.css",
        "https://unpkg.com/react-pdf@8.0.2/dist/Page/AnnotationLayer.css",
        "https://unpkg.com/react-pdf@8.0.2/dist/Page/TextLayer.css",
      ].slice(1)) {
        if (!document.querySelector(`link[href="${href}"]`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet"; link.href = href;
          document.head.appendChild(link);
        }
      }
      if (!cancelled) {
        setPdfComponents({ Document: mod.Document, Page: mod.Page });
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready || !PdfComponents) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center h-96 gap-3 bg-muted/30 rounded-xl">
        <FileText className="h-10 w-10 text-muted-foreground/40 animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading PDF…</p>
      </div>
    );
  }

  const { Document, Page } = PdfComponents;
  const viewWidth = Math.max(200, containerWidth - 16);

  return (
    <div ref={containerRef} className="bg-muted/30 rounded-xl overflow-hidden flex flex-col items-center border">
      <Document
        file={url}
        onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
        className="w-full flex justify-center py-4"
      >
        <Page pageNumber={page} width={viewWidth} />
      </Document>
      <div className="flex items-center gap-4 py-3 bg-background/80 w-full justify-center border-t">
        <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          Page {page} of {numPages || "–"}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
