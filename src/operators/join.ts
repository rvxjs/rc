import { dispose, DisposeLogic } from "../disposable";
import { Observable, ObservableLike } from "../observable";

/**
 * Join multiple observables.
 *
 * Note that the resulting observable modifies and resolves the same array.
 */
export function join<T extends any[]>(...sources: {
	[i in keyof T]: ObservableLike<T[i]>
}) {
	return new Observable<T>(observer => {
		const values = [] as T;
		const subscriptions: DisposeLogic[] = [];
		let resolvedCount = 0;
		for (let i = 0; i < sources.length; i++) {
			let resolved = false;
			subscriptions.push(sources[i].subscribe({
				resolve(value) {
					if (!resolved) {
						resolved = true;
						resolvedCount++;
					}
					values[i] = value;
					if (resolvedCount === sources.length) {
						observer.resolve(values);
					}
				},
				reject(error) {
					observer.reject(error);
				}
			}));
		}
		return () => subscriptions.forEach(dispose);
	});
}
