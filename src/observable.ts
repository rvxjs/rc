import { dispose, DisposeLogic } from "./disposable";

/** Represents a value that can be replaced over time. */
export interface ObservableLike<T> {
	/** Subscribe to updates. */
	subscribe(observer?: Partial<Observer<T>> | ((value: T) => void)): DisposeLogic;
}

/** An observer for a value that can be replaced over time. */
export interface Observer<T> {
	/** Indicate, that the value has been replaced. */
	resolve(value: T): void;
	/** Indicate, that an error occurred. The target value stays the same. */
	reject(error: any): void;
}

export type ObservableOperator<T, U, A extends any[]> = (source: ObservableLike<T>, ...args: A) => U;

const OBSERVERS = Symbol("observers");
const STARTED = Symbol("started");
const DISPOSAL = Symbol("disposal");

/** Represents a value that can be replaced over time. */
export class Observable<T> implements ObservableLike<T> {
	public constructor(
		awake?: (observer: Observer<T>) => DisposeLogic,
		onSubscribe?: (observer: Partial<Observer<T>>) => void
	) {
		if (awake) {
			this.awake = awake;
		}
		if (onSubscribe) {
			this.onSubscribe = onSubscribe;
		}
	}

	private readonly [OBSERVERS] = new Set<Partial<Observer<T>>>();
	private [STARTED] = false;
	private [DISPOSAL]: DisposeLogic = null;

	protected awake(observer: Observer<T>): DisposeLogic {
	}

	protected onSubscribe(observer: Partial<Observer<T>>) {
	}

	/** Notify all observers that the value has been replaced. */
	protected notifyResolve(value: T) {
		for (const observer of this[OBSERVERS]) {
			if (observer.resolve) {
				observer.resolve(value);
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

	public subscribe(observer?: Partial<Observer<T>> | ((value: T) => void)): DisposeLogic {
		const observerObj = typeof observer === "function" ? { resolve: observer } : (observer || { });
		this.onSubscribe(observerObj);
		this[OBSERVERS].add(observerObj);

		if (!this[STARTED]) {
			this[STARTED] = true;
			this[DISPOSAL] = this.awake({
				resolve: this.notifyResolve.bind(this),
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
	public pipe<U, A extends any[]>(operator: ObservableOperator<T, U, A>, ...args: A) {
		return operator(this, ...args);
	}

	/** Create an observable from the specified source. */
	public static from<T>(source: ObservableLike<T> | Promise<T> | void) {
		if (isObservable(source)) {
			return new Observable(observer => source.subscribe(observer));
		} else if (source && typeof source.then === "function") {
			return new Observable<T>(observer => {
				source.then(value => observer.resolve(value), error => observer.reject(error));
			});
		} else {
			return new Observable(observer => {
				observer.resolve(source);
			});
		}
	}

	/** Implement an observer api that inherits from */
	public static implementObserver<T>(target: { prototype: Observable<T> & Observer<T> }) {
		target.prototype.resolve = target.prototype.notifyResolve;
		target.prototype.reject = target.prototype.notifyReject;
	}
}

/** Check if a value is an observable. */
export function isObservable(value: any): value is ObservableLike<any> {
	return value && typeof (value as ObservableLike<any>).subscribe === "function";
}
