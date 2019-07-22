import { dispose, DisposeLogic, Disposable } from "./disposable";

/** Represents a linear sequence of units that changes over time. */
export interface PatchObservableLike<T> {
	/** Subscribe to updates. */
	patches(observer?: Partial<PatchObserver<T>> | ((patch: Patch<T>) => void)): DisposeLogic;
}

/** An observer for a linear sequence of units that changes over time. */
export interface PatchObserver<T> {
	/** Indicate, that the target sequence has changed. */
	patch(patch: Patch<T>): void;
	/** Indicate, that an error occurred. The target sequence stays the same. */
	reject(error: any): void;
}

/**
 * Represents the replacement of specific units.
 *
 * Patches are emitted at the point in time where the target sequence
 * has already been changed to the new state. However, it's previous state
 * can be reconstructed from the provided information.
 *
 * The validity of patch information is only ensured for the current immediate
 * execution, as the underlying data structures might change over time.
 */
export interface Patch<T> {
	/**
	 * The previous unit that was not affected by the patch
	 * or null if the first unit of a sequence has changed.
	 */
	readonly prev: ReadonlyUnit<T>;
	/**
	 * The next unit that was not affected by the patch
	 * or null if the last unit of a sequence has changed.
	 */
	readonly next: ReadonlyUnit<T>;
	/** The range of units that has been inserted or null if no units have been inserted. */
	readonly fresh: ReadonlyUnitRange<T>;
	/** The range of units that has been deleted or null if no units have been deleted. */
	readonly stale: ReadonlyUnitRange<T>;
}

/** Represents a non-empty sequence of units. */
export interface UnitRange<T> {
	/** The first unit that is included in the range. */
	next: Unit<T>;
	/** The last unit that is included in the range. */
	prev: Unit<T>;
}

/** Represents a non-empty sequence of units. */
export interface ReadonlyUnitRange<T> extends UnitRange<T> {
	/** The first unit that is included in the range. */
	readonly next: ReadonlyUnit<T>;
	/** The last unit that is included in the range. */
	readonly prev: ReadonlyUnit<T>;
}

/** Represents a unit in a linked list. */
export interface Unit<T> {
	/** The previous unit or null. */
	prev: Unit<T>;
	/** The next unit or null. */
	next: Unit<T>;
	/** The value of the unit. */
	readonly value: T;
}

/** Represents a unit in a linked list. */
export interface ReadonlyUnit<T> extends Unit<T> {
	/** The previous unit or null. */
	readonly prev: ReadonlyUnit<T>;
	/** The next unit or null. */
	readonly next: ReadonlyUnit<T>;
}

export type PatchObservableOperator<T, U, A extends any[]> = (source: PatchObservableLike<T>, ...args: A) => U;

const OBSERVERS = Symbol("observers");
const STARTED = Symbol("started");
const DISPOSAL = Symbol("disposal");

/** Represents a linear sequence of units that changes over time. */
export class PatchObservable<T> implements PatchObservableLike<T> {
	public constructor(
		awake?: (observer: PatchObserver<T>) => DisposeLogic,
		onSubscribe?: (observer: Partial<PatchObserver<T>>) => void
	) {
		if (awake) {
			this.awake = awake;
		}
		if (onSubscribe) {
			this.onSubscribe = onSubscribe;
		}
	}

	private readonly [OBSERVERS] = new Set<Partial<PatchObserver<T>>>();
	private [STARTED] = false;
	private [DISPOSAL]: DisposeLogic = null;

	/**
	 * Called, when the first observer subscribes.
	 * @returns Dispose logic that is disposed when the last observer unsubscribes.
	 */
	protected awake(observer: PatchObserver<T>): DisposeLogic {
	}

	/**
	 * Called before an observer is added to this observable.
	 * @param observer The observer. Note that the observer may be partially implemented.
	 */
	protected onSubscribe(observer: Partial<PatchObserver<T>>) {
	}

	/** Notify all observers that the target sequence has changed. */
	protected notifyPatch(patch: Patch<T>) {
		for (const observer of this[OBSERVERS]) {
			if (observer.patch) {
				observer.patch(patch);
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

	public patches(observer?: Partial<PatchObserver<T>> | ((patch: Patch<T>) => void)): DisposeLogic {
		const observerObj = typeof observer === "function" ? { patch: observer } : (observer || { });
		this.onSubscribe(observerObj);
		this[OBSERVERS].add(observerObj);

		if (!this[STARTED]) {
			this[STARTED] = true;
			this[DISPOSAL] = this.awake({
				patch: this.notifyPatch.bind(this),
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
	public pipe<U, A extends any[]>(operator: PatchObservableOperator<T, U, A>, ...args: A) {
		return operator(this, ...args);
	}

	/** Get an array that represents the closest state of this patch observable. */
	public toArray() {
		return new Promise<T[]>((resolve, reject) => {
			const subscription = new Disposable();
			subscription.add(this.patches({
				patch(patch) {
					if (!subscription.disposed) {
						subscription.dispose();
						if (patch.fresh) {
							const values = [];
							for (let unit = patch.fresh.next; unit; unit = unit.next) {
								values.push(unit.value);
							}
							resolve(values);
						} else {
							resolve([]);
						}
					}
				},
				reject(error) {
					subscription.dispose();
					reject(error);
				}
			}));
		});
	}

	/** Create an empty patch observable that never changes. */
	public static empty() {
		const patch: Patch<any> = { prev: null, next: null, stale: null, fresh: null };
		return new PatchObservable<any>(null, observer => {
			observer.patch(patch);
		});
	}

	/** Create a patch observable that never changes. */
	public static fixed<T>(values: Iterable<T>) {
		const range: UnitRange<T> = { next: null, prev: null };
		let prev: Unit<T> = null;
		for (const value of values) {
			const unit: Unit<T> = { prev, next: null, value };
			(prev || range).next = unit;
			prev = unit;
		}
		range.prev = prev;
		if (prev) {
			const patch: Patch<T> = { prev: null, next: null, stale: null, fresh: range };
			return new PatchObservable<T>(null, observer => {
				if (observer.patch) {
					observer.patch(patch);
				}
			});
		} else {
			return PatchObservable.empty();
		}
	}
}
