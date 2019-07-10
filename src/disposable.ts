
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
