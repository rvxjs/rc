import { dispose, DisposeLogic } from "./disposable";

export interface ObservableLike<T> {
	subscribe(observer?: Partial<Observer<T>> | ((value: T) => void)): DisposeLogic;
}

export interface Observer<T> {
	resolve(value: T): void;
	reject(error: any): void;
}

export type ObservableOperator<T, U> = (source: ObservableLike<T>) => U;

const OBSERVERS = Symbol("observers");
const STARTED = Symbol("started");
const DISPOSAL = Symbol("disposal");

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

	protected notifyResolve(value: T) {
		for (const observer of this[OBSERVERS]) {
			if (observer.resolve) {
				observer.resolve(value);
			}
		}
	}

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

	public pipe<U>(operator: ObservableOperator<T, U>) {
		return operator(this);
	}
}
