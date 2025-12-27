import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="'skeleton ' + (shape || 'rect')"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="borderRadius"
    ></div>
  `,
  styles: [
    `
      .skeleton {
        background: linear-gradient(
          90deg,
          var(--tg-theme-secondary-bg-color, #f0f0f0) 25%,
          var(--tg-theme-bg-color, #ffffff) 50%,
          var(--tg-theme-secondary-bg-color, #f0f0f0) 75%
        );
        background-size: 200% 100%;
        animation: loading 1.5s ease-in-out infinite;
      }

      .skeleton.rect {
        border-radius: 0.5rem;
      }

      .skeleton.circle {
        border-radius: 50%;
      }

      @keyframes loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class SkeletonComponent {
  @Input() width?: string;
  @Input() height?: string;
  @Input() shape?: 'rect' | 'circle';
  @Input() borderRadius?: string;
}
