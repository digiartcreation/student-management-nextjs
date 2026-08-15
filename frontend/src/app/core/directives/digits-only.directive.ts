import { Directive, ElementRef, HostListener, Input, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Restricts an input to digits, optionally capped at a length.
 *
 *   <input appDigitsOnly [maxDigits]="10" [(ngModel)]="form.parentMobile"/>
 *
 * Rejecting the keystroke is not enough on its own — paste, drag-drop and
 * autofill all bypass keydown — so the value is scrubbed on input as well and
 * the cleaned string is what reaches ngModel. Implementing ControlValueAccessor
 * rather than mutating the element keeps the model and the box from
 * disagreeing: a pasted "+91 98765 43210" becomes "9876543210" in both, instead
 * of looking clean while the model keeps the junk.
 */
@Directive({
  selector: '[appDigitsOnly]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DigitsOnlyDirective),
      multi: true,
    },
  ],
})
export class DigitsOnlyDirective implements ControlValueAccessor {
  /** 0 means no cap. */
  @Input() maxDigits = 0;

  private host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  private clean(raw: string): string {
    const digits = (raw ?? '').replace(/\D+/g, '');
    return this.maxDigits > 0 ? digits.slice(0, this.maxDigits) : digits;
  }

  @HostListener('input')
  onInput(): void {
    const input = this.host.nativeElement;
    const cleaned = this.clean(input.value);
    if (input.value !== cleaned) {
      // Keep the caret from jumping to the end when a character is dropped
      // from the middle of an existing number.
      const removed = input.value.length - cleaned.length;
      const caret = Math.max(0, (input.selectionStart ?? cleaned.length) - removed);
      input.value = cleaned;
      input.setSelectionRange(caret, caret);
    }
    this.onChange(cleaned);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string | number | null): void {
    this.host.nativeElement.value = value === null || value === undefined ? '' : String(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.host.nativeElement.disabled = isDisabled;
  }
}
