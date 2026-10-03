import { installPdfStreamIterator, installPdfBufferTransfer } from "./pdfCompatibility";

installPdfStreamIterator();
installPdfBufferTransfer();

export { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";
