import { dispose, DisposeLogic } from "./disposable";

export interface PatchObservableLike<T> {
	patches(observer?: Partial<PatchObserver<T>> | ((patch: Patch<T>) => void)): DisposeLogic;
}

export interface PatchObserver<T> {
	patch(patch: Patch<T>): void;
	reject(error: any): void;
}

export interface Patch<T> {
	readonly prev: Unit<T>;
	readonly next: Unit<T>;
	readonly fresh: Readonly<UnitRange<T>>;
	readonly stale: Readonly<UnitRange<T>>;
}

export interface UnitRange<T> {
	next: Unit<T>;
	prev: Unit<T>;
}

export interface ReadonlyUnitRange<T> {
	readonly next: ReadonlyUnit<T>;
	readonly prev: ReadonlyUnit<T>;
}

export interface Unit<T> {
	prev: Unit<T>;
	next: Unit<T>;
	value: T;
}

export interface ReadonlyUnit<T> extends Unit<T> {
	readonly prev: ReadonlyUnit<T>;
	readonly next: ReadonlyUnit<T>;
	readonly value: T;
}

export type PatchObservableOperator<T, U, A extends any[]> = (source: PatchObservableLike<T>, ...args: A) => U;

const OBSERVERS = Symbol("observers");
const STARTED = Symbol("started");
const DISPOSAL = Symbol("disposal");

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

	protected awake(observer: PatchObserver<T>): DisposeLogic {
	}

	protected onSubscribe(observer: Partial<PatchObserver<T>>) {
	}

	protected notifyPatch(patch: Patch<T>) {
		for (const observer of this[OBSERVERS]) {
			if (observer.patch) {
				observer.patch(patch);
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

	public pipe<U, A extends any[]>(operator: PatchObservableOperator<T, U, A>, ...args: A) {
		return operator(this, ...args);
	}
}
