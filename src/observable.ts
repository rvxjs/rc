
/**
 * Represents an atomic value that can change over time.
 *
 * An observable is only active while there are any observers.
 * + When active, an observable can update it's own value on demand.
 * + When inactive, the value is computed if needed.
 */
export class Observable<T> {
	/** Set of current observers */
	readonly #observers: Set<Observable.ObserverFn<T>>;
	/** The activation function */
	readonly #activate: Observable.ActivateFn<T>;
	/** The compute function */
	readonly #compute: Observable.ComputeFn<T>;
	/** True, if this observable is currently active */
	#active: boolean;
	/** The current value when active, otherwise undefined */
	#value: T | undefined;
	/** Current deactivation function */
	#deactivate: Observable.DeactivateFn | void;
	/** Function to schedule deactivation */
	readonly #stop: () => void;

	/**
	 * Create a new observable.
	 *
	 * @param activate The activation function that is called when this observable is activated.
	 * @param compute The compute function that is called to compute the value while this observable is inactive.
	 * @param deactivateImmediately If true, this observable is deactivated immediately when the last observer unsubscribes. Otherwise a microtask is scheduled to deactivate the observable. Default is false.
	 */
	public constructor(activate: Observable.ActivateFn<T>, compute: Observable.ComputeFn<T>, deactivateImmediately = false) {
		this.#observers = new Set();
		this.#activate = activate;
		this.#compute = compute;

		this.#active = false;
		this.#value = undefined;
		this.#deactivate = undefined;

		const stop = () => {
			if (this.#active && this.#observers.size === 0) {
				this.#active = false;
				this.#value = undefined;
				try {
					this.#deactivate?.();
				} finally {
					if (!this.#active) {
						this.#deactivate = undefined;
					}
				}
			}
		};

		this.#stop = deactivateImmediately ? stop : () => queueMicrotask(stop);
	}

	/**
	 * Get the current value.
	 */
	public get value(): T {
		return this.#active ? this.#value! : this.#compute(false);
	}

	/**
	 * Subscribe to this observable.
	 *
	 * @param observer The observer that is called when the value changes.
	 * @param useCurrent If true, the observer is also immediately called with the current value.
	 */
	public subscribe(observer?: Observable.ObserverFn<T>, useCurrent = true): Observable.UnsubscribeFn {
		if (observer === undefined) {
			observer = () => {};
		}
		this.#observers.add(observer);

		if (this.#active) {
			if (useCurrent) {
				observer(this.#value!, true);
			}
		} else {
			this.#value = this.#compute(true);
			if (useCurrent) {
				observer(this.#value, true);
			}
			this.#active = true;
			try {
				this.#deactivate = this.#activate(value => {
					this.#value = value;
					this.#observers.forEach(observer => {
						observer(value, false);
					});
				}, this.#value)!;
			} catch (error) {
				this.#active = false;
				this.#value = undefined;
				this.#observers.clear();
				throw error;
			}
		}

		return () => {
			this.#observers.delete(observer!);
			this.#stop();
		};
	}
}

export declare namespace Observable {
	/**
	 * A function that is called with the current value or when the value is updated.
	 */
	export interface ObserverFn<T> {
		/**
		 * @param value The new or current value.
		 * @param isCurrent True, if this observer has been called with the current value when subscribing instead of due to an update.
		 */
		(value: T, isCurrent: boolean): void
	}

	/**
	 * A function that can be called by an observable implementation to update the current value.
	 */
	export interface UpdateFn<T> {
		/**
		 * @param value The new value.
		 */
		(value: T): void;
	}

	/**
	 * A function that is called when an observable is activated.
	 */
	export interface ActivateFn<T> {
		/**
		 * @param update The function that can be called to update the value.
		 * @param computedValue The value that was computed immediately before activation.
		 * @returns An optional function that is called when the observable is deactivated.
		 */
		(update: UpdateFn<T>, computedValue: T): DeactivateFn | void;
	}

	/**
	 * A function that is called when an observable is deactivated.
	 */
	export interface DeactivateFn {
		(): void;
	}

	/**
	 * A function that is called to compute the value of an observable while it's inactive.
	 */
	export interface ComputeFn<T> {
		/**
		 * @param activation True if the value is computed immediately before the observable is activated.
		 * @returns The value.
		 */
		(activation: boolean): T;
	}

	/**
	 * A function that can be called to remove a subscription.
	 */
	export interface UnsubscribeFn {
		(): void;
	}
}
