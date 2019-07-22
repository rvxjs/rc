
/** Represents logic that is invoked to dispose something. */
export type DisposeLogic = void | { dispose(): void } | (() => void);

/** Invoke dispose logic. */
export function dispose(logic: DisposeLogic) {
	if (typeof logic === "function") {
		logic();
	} else if (logic && typeof logic.dispose === "function") {
		logic.dispose();
	}
}

const DISPOSED = Symbol("disposed");
const LOGIC = Symbol("logic");

/** A one-way disposable. */
export class Disposable {
	private [DISPOSED] = false;
	private [LOGIC]: DisposeLogic[] = [];

	public add(logic: DisposeLogic) {
		if (this[DISPOSED]) {
			dispose(logic);
		} else {
			this[LOGIC].push(logic);
		}
		return this;
	}

	public dispose() {
		this[DISPOSED] = true;
		for (const logic of this[LOGIC]) {
			dispose(logic);
		}
	}

	public get disposed() {
		return this[DISPOSED];
	}
}
