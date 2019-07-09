
export type DisposeLogic = void | { dispose(): void } | (() => void);

export function dispose(logic: DisposeLogic) {
	if (typeof logic === "function") {
		logic();
	} else if (logic && typeof logic.dispose === "function") {
		logic.dispose();
	}
}
