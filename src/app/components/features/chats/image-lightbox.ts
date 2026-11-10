import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatDateTime } from '../../../lib/formatters';
import { MediaUrlPipe } from '../../../lib/media-url';
import { Dialog } from '../../ui/dialog';

export interface LightboxImage {
  url: string;
  caption: string;
  createdAt: string;
  senderLabel: string;
}

@Component({
  selector: 'app-image-lightbox',
  imports: [Dialog, MediaUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog [open]="!!image()" [title]="title()" size="lg" (closed)="closed.emit()">
      @if (image(); as img) {
        <figure class="flex flex-col items-center gap-3">
          <img
            [src]="img.url | mediaUrl"
            [alt]="img.caption ? 'Photo: ' + img.caption : 'Photo'"
            class="max-h-[70dvh] w-auto rounded-md object-contain"
          />
          @if (img.caption) {
            <figcaption class="max-w-prose text-center text-sm whitespace-pre-wrap text-ink">{{ img.caption }}</figcaption>
          }
        </figure>
      }
    </app-dialog>
  `,
})
export class ImageLightbox {
  readonly image = input<LightboxImage | null>(null);
  readonly closed = output<void>();

  protected readonly title = computed(() => {
    const image = this.image();
    return image ? `${image.senderLabel} · ${formatDateTime(image.createdAt)}` : 'Photo';
  });
}
