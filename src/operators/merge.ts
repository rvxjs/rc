import { Disposable } from "../disposable";
import { Observable, ObservableLike } from "../observable";

/** Merge a fixed number of observables. */
export function merge<T>(...sources: ObservableLike<T>[]) {
	return new Observable<T>(observer => {
		const subscription = new Disposable();
		for (let i = 0; i < sources.length; i++) {
			subscription.add(sources[i].subscribe({
				resolve(value) {
					observer.resolve(value);
				},
				reject(error) {
					observer.reject(error);
				}
			}));
		}
		return subscription;
	});
}
