
export type Disposable = void | (() => void);

export function dispose(value: Disposable) {
	if (typeof value === "function") {
		value();
	}
}
