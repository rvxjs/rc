import { Observer } from "./observable";
import { Patch, PatchObservable, PatchObserver, Unit, UnitRange } from "./patch-observable";

const RANGE = Symbol("range");
const PROJECTION = Symbol("mapping");
const ENTRY_OBSERVERS = Symbol("entry-observers");

/** A map with an observable entry sequence. */
export class ObservableMap<K, V> extends PatchObservable<[K, V]> implements Map<K, V> {
	public constructor() {
		super();
		return new Proxy(this, {
			getPrototypeOf() {
				return Map.prototype;
			}
		});
	}

	private readonly [RANGE]: UnitRange<[K, V]> = { next: null, prev: null };
	private readonly [PROJECTION] = new Map<K, Unit<[K, V]>>();
	private readonly [ENTRY_OBSERVERS] = new Map<K, Set<Observer<V>>>();

	protected onSubscribe(observer: Partial<PatchObserver<[K, V]>>) {
		if (observer.patch) {
			observer.patch({ prev: null, next: null, stale: null, fresh: this[RANGE].next ? this[RANGE] : null });
		}
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
					const observers = entryObservers.get(unit.value[0]);
					if (observers) {
						observers.forEach(o => o.resolve(unit.value[1]));
					}
					unit = unit.next;
				} while (unit !== stale.prev);
			} else if (entryObservers.size > 0) {
				for (const [key, observers] of entryObservers) {
					const unit = projection.get(key);
					if (unit) {
						observers.forEach(o => o.resolve(unit.value[1]));
					}
				}
			}

			this.notifyPatch({ prev: null, next: null, fresh: null, stale });
		}
	}

	public set(key: K, value: V) {
		const range = this[RANGE];
		const projection = this[PROJECTION];

		let unit = projection.get(key);
		if (unit) {
			const { prev, next } = unit;
			const fresh: Unit<[K, V]> = { prev, next, value: [key, value] };
			(prev || range).next = fresh;
			(next || range).prev = fresh;
			const observers = this[ENTRY_OBSERVERS].get(key);
			if (observers) {
				observers.forEach(o => o.resolve(value));
			}
			this.notifyPatch({ prev, next, stale: { next: unit, prev: unit }, fresh: { next: fresh, prev: fresh } });
		} else {
			const prev = range.prev;
			unit = { prev, next: null, value: [key, value] };
			range.prev = unit;
			if (prev) {
				prev.next = unit;
			} else {
				range.next = unit;
			}
			projection.set(key, unit);
			const observers = this[ENTRY_OBSERVERS].get(key);
			if (observers) {
				observers.forEach(o => o.resolve(value));
			}
			this.notifyPatch({ prev, next: null, stale: null, fresh: { next: unit, prev: unit } });
		}
		return this;
	}

	public delete(key: K) {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const unit = projection.get(key);
		if (unit) {
			const { prev, next } = unit;
			(prev || range).next = next;
			(next || range).prev = prev;
			projection.delete(key);
			const observers = this[ENTRY_OBSERVERS].get(key);
			if (observers) {
				observers.forEach(o => o.resolve(unit.value[1]));
			}
			this.notifyPatch({ prev, next, stale: { next: unit, prev: unit }, fresh: null });
			return true;
		}
		return false;
	}

	public forEach(callback: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any) {
		return this[PROJECTION].forEach((unit, key) => {
			callback.call(thisArg, unit.value[1], unit.value[0], this);
		});
	}

	public get(key: K) {
		const unit = this[PROJECTION].get(key);
		if (unit) {
			return unit.value[1];
		}
	}

	public has(key: K) {
		return this[PROJECTION].has(key);
	}

	public get size() {
		return this[PROJECTION].size;
	}

	public * [Symbol.iterator]() {
		for (const [key, unit] of this[PROJECTION]) {
			yield [key, unit.value[1]] as [K, V];
		}
	}

	public * entries() {
		for (const [key, unit] of this[PROJECTION]) {
			yield [key, unit.value[1]] as [K, V];
		}
	}

	public keys() {
		return this[PROJECTION].keys();
	}

	public * values() {
		for (const unit of this[PROJECTION].values()) {
			yield unit.value[1];
		}
	}

	public get [Symbol.toStringTag]() {
		return new Map(this)[Symbol.toStringTag];
	}

	public [Symbol.hasInstance](value: any) {
		return value && RANGE in value;
	}
}
