import { dispose, DisposeLogic } from "./disposable";

/** Represents a linear sequence of units that changes over time. */
export interface SequenceLike<T> {
	/** Subscribe to updates. */
	subscribeToSequence(observer?: Partial<SequenceObserver<T>> | ((patch: SequencePatch<T>) => void)): DisposeLogic;
}

/** An observer for a linear sequence of units that changes over time. */
export interface SequenceObserver<T> {
	/** Indicate, that the target sequence has changed. */
	updateSequence(patch: SequencePatch<T>): void;
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
export interface SequencePatch<T> {
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
	readonly fresh: ReadonlySequenceRange<T>;
	/** The range of units that has been deleted or null if no units have been deleted. */
	readonly stale: ReadonlySequenceRange<T>;
}

/** Represents a non-empty sequence of units. */
export interface SequenceRange<T> {
	/** The first unit that is included in the range. */
	next: Unit<T>;
	/** The last unit that is included in the range. */
	prev: Unit<T>;
}

/** Represents a non-empty sequence of units. */
export interface ReadonlySequenceRange<T> extends SequenceRange<T> {
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

export type SequenceOperator<T, U, A extends any[]> = (source: SequenceLike<T>, ...args: A) => U;

const OBSERVERS = Symbol("observers");
const STARTED = Symbol("started");
const DISPOSAL = Symbol("disposal");

/**
 * Represents a linear sequence of units that changes over time.
 *
 * When a new observer subscribes, the patch observable must emit an individual patch representing the latest state if available.
 */
export class Sequence<T> implements SequenceLike<T> {
	public constructor(
		awake?: (observer: SequenceObserver<T>) => DisposeLogic,
		onSubscribe?: (observer: Partial<SequenceObserver<T>>) => void
	) {
		if (awake) {
			this.awake = awake;
		}
		if (onSubscribe) {
			this.onSubscribe = onSubscribe;
		}
	}

	private readonly [OBSERVERS] = new Set<Partial<SequenceObserver<T>>>();
	private [STARTED] = false;
	private [DISPOSAL]: DisposeLogic = null;

	/**
	 * Called, when the first observer subscribes.
	 * @returns Dispose logic that is disposed when the last observer unsubscribes.
	 */
	protected awake(observer: SequenceObserver<T>): DisposeLogic {
	}

	/**
	 * Called before an observer is added to this observable.
	 * @param observer The observer. Note that the observer may be partially implemented.
	 */
	protected onSubscribe(observer: Partial<SequenceObserver<T>>) {
	}

	/** Notify all observers that the target sequence has changed. */
	protected notifyUpdateSequence(patch: SequencePatch<T>) {
		for (const observer of this[OBSERVERS]) {
			if (observer.updateSequence) {
				observer.updateSequence(patch);
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

	public subscribeToSequence(observer?: Partial<SequenceObserver<T>> | ((patch: SequencePatch<T>) => void)): DisposeLogic {
		const observerObj = typeof observer === "function" ? { updateSequence: observer } : (observer || { });
		this.onSubscribe(observerObj);
		this[OBSERVERS].add(observerObj);

		if (!this[STARTED]) {
			this[STARTED] = true;
			this[DISPOSAL] = this.awake({
				updateSequence: this.notifyUpdateSequence.bind(this),
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
	public pipe<U, A extends any[]>(operator: SequenceOperator<T, U, A>, ...args: A) {
		return operator(this, ...args);
	}

	/** Create an empty patch observable that never changes. */
	public static empty() {
		const patch: SequencePatch<any> = { prev: null, next: null, stale: null, fresh: null };
		return new Sequence<any>(null, observer => {
			observer.updateSequence(patch);
		});
	}

	/** Create a patch observable that never changes. */
	public static fixed<T>(values: Iterable<T>) {
		const range: SequenceRange<T> = { next: null, prev: null };
		let prev: Unit<T> = null;
		for (const value of values) {
			const unit: Unit<T> = { prev, next: null, value };
			(prev || range).next = unit;
			prev = unit;
		}
		range.prev = prev;
		if (prev) {
			const patch: SequencePatch<T> = { prev: null, next: null, stale: null, fresh: range };
			return new Sequence<T>(null, observer => {
				if (observer.updateSequence) {
					observer.updateSequence(patch);
				}
			});
		} else {
			return Sequence.empty();
		}
	}
}

/** Check if a value is an observable. */
export function isSequence(value: any): value is SequenceLike<any> {
	return value && typeof (value as SequenceLike<any>).subscribeToSequence === "function";
}
