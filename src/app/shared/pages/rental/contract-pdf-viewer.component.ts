import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  output,
  signal,
} from '@angular/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

/** Displays the already hash-verified Jasper PDF locally, without another API or CDN request. */
@Component({
  selector: 'app-contract-pdf-viewer',
  templateUrl: './contract-pdf-viewer.component.html',
  styleUrl: './contract-pdf-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractPdfViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) source!: Blob;
  @ViewChild('canvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLDivElement>;
  readonly ready = output<boolean>();
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly zoom = signal(1);
  readonly loading = signal(true);
  readonly rendering = signal(false);
  readonly error = signal('');
  readonly pageText = signal('');
  private pdf?: PDFDocumentProxy;
  private loadingTask?: PDFDocumentLoadingTask;
  private renderTask?: RenderTask;
  private observer?: ResizeObserver;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  private initialized = false;
  private dead = false;
  private documentGeneration = 0;
  private renderGeneration = 0;

  ngAfterViewInit() {
    this.initialized = true;
    let previousWidth = this.stage.nativeElement.clientWidth;
    this.observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - previousWidth) < 1) return;
      previousWidth = entry.contentRect.width;
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => void this.render(), 100);
    });
    this.observer.observe(this.stage.nativeElement);
    void this.open();
  }

  ngOnChanges() {
    if (this.initialized) void this.open();
  }

  private async open() {
    const generation = ++this.documentGeneration;
    ++this.renderGeneration;
    this.renderTask?.cancel();
    void this.loadingTask?.destroy();
    this.pdf = undefined;
    this.loading.set(true);
    this.error.set('');
    this.pageText.set('');
    this.ready.emit(false);
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      if (this.dead || generation !== this.documentGeneration) return;
      GlobalWorkerOptions.workerSrc = new URL(
        'assets/pdfjs/pdf.worker.min.mjs',
        document.baseURI,
      ).href;
      const data = new Uint8Array(await this.source.arrayBuffer());
      if (this.dead || generation !== this.documentGeneration) return;
      this.loadingTask = getDocument({ data });
      const pdf = await this.loadingTask.promise;
      if (this.dead || generation !== this.documentGeneration) return;
      this.pdf = pdf;
      this.pages.set(pdf.numPages);
      this.page.set(1);
      this.zoom.set(1);
      this.loading.set(false);
      await this.render();
    } catch {
      if (!this.dead && generation === this.documentGeneration) {
        this.loading.set(false);
        this.error.set(
          'Chưa hiển thị được tài liệu. Bạn có thể dùng “Mở PDF” bên dưới để đọc hợp đồng.',
        );
      }
    }
  }

  changePage(offset: number) {
    const next = this.page() + offset;
    if (this.loading() || this.rendering() || next < 1 || next > this.pages()) return;
    this.page.set(next);
    this.stage.nativeElement.scrollTo(0, 0);
    void this.render();
  }

  changeZoom(offset: number) {
    if (this.loading() || this.rendering()) return;
    this.zoom.set(Math.min(2, Math.max(0.75, this.zoom() + offset)));
    void this.render();
  }

  fitWidth() {
    if (this.loading() || this.rendering()) return;
    this.zoom.set(1);
    this.stage.nativeElement.scrollTo(0, 0);
    void this.render();
  }

  private async render() {
    if (!this.pdf || this.dead) return;
    const generation = ++this.renderGeneration;
    this.rendering.set(true);
    this.renderTask?.cancel();
    try {
      try {
        await this.renderTask?.promise;
      } catch {
        /* The previous draw was cancelled. */
      }
      if (this.dead || generation !== this.renderGeneration) return;
      const page = await this.pdf.getPage(this.page());
      if (this.dead || generation !== this.renderGeneration) return;
      const natural = page.getViewport({ scale: 1 });
      const width = Math.max(240, this.stage.nativeElement.clientWidth - 32);
      const viewport = page.getViewport({
        scale: Math.min(1.4, width / natural.width) * this.zoom(),
      });
      const canvas = this.canvas.nativeElement;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      this.renderTask = page.render({
        canvas,
        canvasContext: canvas.getContext('2d')!,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      });
      await this.renderTask.promise;
      const content = await page.getTextContent();
      if (this.dead || generation !== this.renderGeneration) return;
      this.pageText.set(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
      this.ready.emit(true);
    } catch (error) {
      if (
        !this.dead &&
        generation === this.renderGeneration &&
        (error as Error).name !== 'RenderingCancelledException'
      ) {
        this.error.set(
          'Chưa hiển thị được trang. Bạn có thể dùng “Mở PDF” bên dưới để tiếp tục đọc.',
        );
        this.ready.emit(false);
      }
    } finally {
      if (!this.dead && generation === this.renderGeneration) this.rendering.set(false);
    }
  }

  ngOnDestroy() {
    this.dead = true;
    ++this.documentGeneration;
    ++this.renderGeneration;
    clearTimeout(this.resizeTimer);
    this.observer?.disconnect();
    this.renderTask?.cancel();
    void this.loadingTask?.destroy();
  }
}
