import { Hash, HashObserver } from "./hash";

const TARGET = Symbol("target");

export class ObservableMap<K, V> extends Hash<K, V> {
	public constructor(source?: Iterable<[K, V]>, proxy = true) {
		super();
		this[TARGET] = new Map(source);
		if (proxy) {
			return new Proxy(this, {
				getPrototypeOf() {
					return Map.prototype;
				}
			});
		}
	}

	private [TARGET]: Map<K, V>;

	protected onSubscribe(observer: Partial<HashObserver<K, V>>) {
		if (observer.updateEntries) {
			observer.updateEntries({ stale: null, fresh: this[TARGET] });
		}
	}

	public clear() {
		const stale = this[TARGET];
		if (stale.size) {
			this[TARGET] = new Map();
			this.notifyResolveEntries({ stale, fresh: null });
		}
	}

	public set(key: K, value: V) {
		const target = this[TARGET];
		const stale: Map<K, V> = target.has(key) ? new Map([ [key, target.get(key)] ]) : null;
		target.set(key, value);
		this.notifyResolveEntries({ stale, fresh: new Map([ [key, value] ]) });
	}

	public delete(key: K) {
		const target = this[TARGET];
		if (target.has(key)) {
			const value = target.get(key);
			target.delete(key);
			this.notifyResolveEntries({ stale: new Map([ [key, value] ]), fresh: null });
		}
	}

	public forEach(callback: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any) {
		return this[TARGET].forEach((value, key) => {
			callback.call(thisArg, value, key, this);
		});
	}

	public get(key: K) {
		return this[TARGET].get(key);
	}

	public has(key: K) {
		return this[TARGET].has(key);
	}

	public get size() {
		return this[TARGET].size;
	}

	public [Symbol.iterator]() {
		return this[TARGET][Symbol.iterator]();
	}

	public entries() {
		return this[TARGET].entries();
	}

	public keys() {
		return this[TARGET].keys();
	}

	public values() {
		return this[TARGET].values();
	}

	public get [Symbol.toStringTag]() {
		return this[TARGET][Symbol.toStringTag];
	}

	public static [Symbol.hasInstance](value: any) {
		return value && (TARGET in value);
	}
}
