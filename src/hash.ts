import { dispose, DisposeLogic } from "./disposable";

/** Represents an unordered collection of key-value pairs that changes over time. */
export interface HashLike<K, V> {
	/** Subscribe to updates. */
	subscribeToHash(observer?: Partial<HashObserver<K, V>> | ((patch: HashPatch<K, V>) => void)): DisposeLogic;
}

/** An observer for an unordered collection of key-value pairs. */
export interface HashObserver<K, V> {
	/** Indicate, that some entries have changed. */
	updateEntries(patch: HashPatch<K, V>): void;
	/** Indicate, that an error occured. The target sequence stays the same. */
	reject(error: any): void;
}

/**
 * Represents the replacement of specific entries.
 *
 * Patches are emitted at the point in time where thr target hash
 * has already been changed to the new state. However, it's previous state
 * can be reconstructed from the provided information.
 *
 * The validity of patch information is only ensured for the current immediate
 * execution, as the underlying data structures might change over time.
 */
export interface HashPatch<K, V> {
	/** Entries that have been added or null. */
	readonly fresh: ReadonlyMap<K, V>;
	/** Entries that have been removed or null. */
	readonly stale: ReadonlyMap<K, V>;
}

export type HashOperator<K, V, U, A extends any[]> = (source: HashLike<K, V>, ...args: A) => U;

const OBSERVERS = Symbol("observers");
const STARTED = Symbol("started");
const DISPOSAL = Symbol("disposal");

/**
 * Represents an unordered collection of key-value pairs that changes over time.
 *
 * When a new observer subscribes, the map observable must emit an individual update representing the latest state if available.
 */
export class Hash<K, V> implements HashLike<K, V> {
	public constructor(
		awake?: (observer: HashObserver<K, V>) => DisposeLogic,
		onSubscribe?: (observer: Partial<HashObserver<K, V>>) => void
	) {
		if (awake) {
			this.awake = awake;
		}
		if (onSubscribe) {
			this.onSubscribe = onSubscribe;
		}
	}

	private readonly [OBSERVERS] = new Set<Partial<HashObserver<K, V>>>();
	private [STARTED] = false;
	private [DISPOSAL]: DisposeLogic = null;

	/**
	 * Called, when the first observer subscribes.
	 * @returns Dispose logic that is disposed when the last observer unsubscribes.
	 */
	protected awake(observer: HashObserver<K, V>): DisposeLogic {
	}

	/**
	 * Called before an observer is added to this observable.
	 * @param observer The observer. Note that the observer may be partially implemented.
	 */
	protected onSubscribe(observer: Partial<HashObserver<K, V>>) {
	}

	/** Notify all observers that some entries have changed. */
	protected notifyResolveEntries(patch: HashPatch<K, V>) {
		for (const observer of this[OBSERVERS]) {
			if (observer.updateEntries) {
				observer.updateEntries(patch);
			}
		}
	}

	/** Notify all observers that an error occurred. */
	protected notifyReject(error: any) {
		for (const observer of this[OBSERVERS]) {
			if (observer.reject) {
				observer.reject(error);
			}
		}
	}

	public subscribeToHash(observer?: Partial<HashObserver<K, V>> | ((patch: HashPatch<K, V>) => void)): DisposeLogic {
		const observerObj = typeof observer === "function" ? { updateEntries: observer } : (observer || { });
		this.onSubscribe(observerObj);
		this[OBSERVERS].add(observerObj);

		if (!this[STARTED]) {
			this[STARTED] = true;
			this[DISPOSAL] = this.awake({
				updateEntries: this.notifyResolveEntries.bind(this),
				reject: this.notifyReject.bind(this)
			});
		}

		return () => {
			if (this[OBSERVERS].delete(observerObj) && this[OBSERVERS].size === 0) {
				this[STARTED] = false;
				dispose(this[DISPOSAL]);
			}
		};
	}

	/** Apply an operator to this observable and get the result. */
	public pipe<U, A extends any[]>(operator: HashOperator<K, V, U, A>, ...args: A) {
		return operator(this, ...args);
	}

	/** Create an empty map observable that never changes. */
	public static empty() {
		const patch = { fresh: null, stale: null };
		return new Hash<any, any>(null, observer => observer.updateEntries(patch));
	}

	/** Create a map that never changes. */
	public static map<K, V>(entries: Iterable<[K, V]>) {
		const patch: HashPatch<K, V> = { fresh: new Map(entries), stale: null };
		return new Hash<K, V>(null, observer => observer.updateEntries(patch));
	}

	/** Create a set that never changes. */
	public static set<T>(entries: Iterable<T>) {
		const patch: HashPatch<T, void> = { fresh: new Map((function *() {
			for (const value of entries) {
				yield [value, undefined] as [T, void];
			}
		})()), stale: null };
		return new Hash<T, void>(null, observer => observer.updateEntries(patch));
	}
}

/** Check if a value is an observable. */
export function isHash(value: any): value is HashLike<any, any> {
	return value && typeof (value as HashLike<any, any>).subscribeToHash === "function";
}
