import {
  Directive,
  Input,
  ElementRef,
  ChangeDetectorRef,
  Optional,
  SimpleChanges,
  OnChanges,
  OnDestroy
} from '@angular/core';
import {Subscription, Subject} from 'rxjs';
import {filter} from 'rxjs/operators';
import {TimeagoClock} from './timeago.clock';
import {TimeagoFormatter} from './timeago.formatter';
import {TimeagoIntl} from './timeago.intl';
import {isDefined, coerceBooleanProperty, dateParser} from './util';

export type IDate = string | number | Date;

@Directive({
  selector: '[timeago]',
})
export class TimeagoDirective implements OnChanges, OnDestroy {
  private intlSubscription: Subscription;
  private clockSubscription: Subscription;

  stateChanges = new Subject<any>();

  /** The Date to display. An actual Date object or something that can be fed to new Date. */
  @Input()
  get date(): number {
    return this._date;
  }
  set date(date: number) {
    this._date = dateParser(date).valueOf();
    if (this._date) {
      if (this.clockSubscription) {
        this.clockSubscription.unsubscribe();
      }
      this.clockSubscription = this.clock.register(date)
        .pipe(filter((value, index) => !index || this.live, this))
        .subscribe(this.stateChanges);
    } else {
      console.warn('[ngx-timeago] Invalid Date provided');
    }
  }
  private _date: number;

  /** If the directive should update itself over time */
  @Input()
  get live(): boolean {
    return this._live;
  }
  set live(live: boolean) {
    this._live = coerceBooleanProperty(live);
  }
  private _live = true;

  @Input()
  get suffix(): boolean {
    return this._suffix;
  }
  set suffix(suffix: boolean) {
    this._suffix = coerceBooleanProperty(suffix);
  }
  private _suffix = true;

  constructor(@Optional() intl: TimeagoIntl,
              private clock: TimeagoClock,
              private formatter: TimeagoFormatter,
              private element: ElementRef,
              private changeDetectorRef: ChangeDetectorRef) {
    if (intl) {
      this.intlSubscription = intl.changes.subscribe(this.stateChanges);
    }
    this.stateChanges.subscribe(() => this.setContent(this.element.nativeElement, this.formatter.parse(this.date, this.suffix)));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.live) {
      if (changes.live.currentValue && !changes.live.previousValue) {
        this.stateChanges.next();
      }
    }

    if (changes.suffix) {
      this.stateChanges.next();
    }
  }

  setContent(node: any, content: string): void {
    if (isDefined(node.textContent)) {
      node.textContent = content;
    } else {
      node.data = content;
    }
  }

  ngOnDestroy() {
    if (this.intlSubscription) {
      this.intlSubscription.unsubscribe();
    }
    if (this.clockSubscription) {
      this.clockSubscription.unsubscribe();
    }
    this.stateChanges.complete();
  }
}
