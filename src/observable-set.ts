import { Observable, Observer } from "./observable";
import { Patch, PatchObservable, PatchObserver, Unit, UnitRange } from "./patch-observable";

const RANGE = Symbol("range");
const PROJECTION = Symbol("mapping");
const ENTRY_OBSERVERS = Symbol("entry-observers");

/** A set with an observable entry sequence. */
export class ObservableSet<T> extends PatchObservable<T> implements Set<T> {
	public constructor() {
		super();
		return new Proxy(this, {
			getPrototypeOf() {
				return Set.prototype;
			}
		});
	}

	private readonly [RANGE]: UnitRange<T> = { next: null, prev: null };
	private readonly [PROJECTION] = new Map<T, Unit<T>>();
	private readonly [ENTRY_OBSERVERS] = new Map<T, Set<Observer<boolean>>>();

	protected onSubscribe(observer: Partial<PatchObserver<T>>) {
		if (observer.patch) {
			observer.patch({ prev: null, next: null, stale: null, fresh: this[RANGE].next ? this[RANGE] : null });
		}
	}

	public entry(value: T): Observable<boolean> {
		return new Observable(observer => {
			let observers = this[ENTRY_OBSERVERS].get(value);
			if (observers) {
				observers.add(observer);
			} else {
				this[ENTRY_OBSERVERS].set(value, observers = new Set([observer]));
			}
			return () => {
				observers.delete(observer);
				if (observers.size === 0) {
					this[ENTRY_OBSERVERS].delete(value);
				}
			};
		}, observer => {
			if (observer.resolve) {
				observer.resolve(this[PROJECTION].has(value));
			}
		});
	}

	public clear() {
		const range = this[RANGE];
		if (range.next) {
			const projection = this[PROJECTION];
			const stale = { next: range.next, prev: range.prev };
			range.next = null;
			range.prev = null;
			const deleteCount = projection.size;
			projection.clear();
			const entryObservers = this[ENTRY_OBSERVERS];
			if (entryObservers.size > deleteCount) {
				let unit = stale.next;
				do {
					const observers = entryObservers.get(unit.value);
					if (observers) {
						observers.forEach(o => o.resolve(false));
					}
					unit = unit.next;
				} while (unit !== stale.prev);
			} else if (entryObservers.size > 0) {
				for (const [value, observers] of entryObservers) {
					if (projection.has(value)) {
						observers.forEach(o => o.resolve(false));
					}
				}
			}
			this.notifyPatch({ prev: null, next: null, fresh: null, stale });
		}
	}

	public add(value: T) {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		if (!projection.has(value)) {
			const prev = range.prev;
			const unit: Unit<T> = { prev, next: null, value };
			range.prev = unit;
			if (prev) {
				prev.next = unit;
			} else {
				range.next = unit;
			}
			projection.set(value, unit);
			const observers = this[ENTRY_OBSERVERS].get(value);
			if (observers) {
				observers.forEach(o => o.resolve(true));
			}
			this.notifyPatch({ prev, next: null, stale: null, fresh: { next: unit, prev: unit } });
		}
		return this;
	}

	public delete(value: T) {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const unit = projection.get(value);
		if (unit) {
			const { prev, next } = unit;
			(prev || range).next = next;
			(next || range).prev = prev;
			projection.delete(value);
			const observers = this[ENTRY_OBSERVERS].get(value);
			if (observers) {
				observers.forEach(o => o.resolve(false));
			}
			this.notifyPatch({ prev, next, stale: { next: unit, prev: unit }, fresh: null });
			return true;
		}
		return false;
	}

	public forEach(callback: (value: T, key: T, set: Set<T>) => void, thisArg?: any) {
		return this[PROJECTION].forEach((unit, value) => {
			callback.call(thisArg, value, value, this);
		});
	}

	public has(value: T) {
		return this[PROJECTION].has(value);
	}

	public get size() {
		return this[PROJECTION].size;
	}

	public [Symbol.iterator]() {
		return this[PROJECTION].keys();
	}

	public * entries() {
		for (const value of this[PROJECTION].keys()) {
			yield [value, value] as [T, T];
		}
	}

	public keys() {
		return this[PROJECTION].keys();
	}

	public values() {
		return this[PROJECTION].keys();
	}

	public get [Symbol.toStringTag]() {
		return new Set(this[PROJECTION].keys())[Symbol.toStringTag];
	}

	public [Symbol.hasInstance](value: any) {
		return value && RANGE in value;
	}
}
