import { Observable, ObservableLike } from "../observable";

/** Map values from an observable. */
export function map<T, U>(source: ObservableLike<T>, map: (value: T) => U) {
	return new Observable<U>(observer => source.subscribe({
		resolve(value) {
			observer.resolve(map(value));
		},
		reject(error) {
			observer.reject(error);
		}
	}));
}
