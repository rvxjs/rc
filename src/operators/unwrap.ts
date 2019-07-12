import { dispose, DisposeLogic } from "../disposable";
import { Observable, ObservableLike } from "../observable";

/**
 * Unwrap an observable of observables.
 * Any falsy values that are emitted by the source are ignored.
 */
export function unwrap<T>(source: ObservableLike<ObservableLike<T>>) {
	return new Observable<T>(observer => {
		let fork: DisposeLogic = null;
		const subscription = source.subscribe({
			resolve(child) {
				dispose(fork);
				if (child) {
					fork = child.subscribe({
						resolve(value) {
							observer.resolve(value);
						},
						reject(error) {
							observer.reject(error);
						}
					});
				}
			},
			reject(error) {
				observer.reject(error);
			}
		});
		return () => {
			dispose(subscription);
			dispose(fork);
		};
	});
}
