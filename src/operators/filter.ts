import { Observable, ObservableLike } from "../observable";

/** Filter values from an observable. */
export function filter<T>(source: ObservableLike<T>, predicate: (value: T) => boolean) {
	return new Observable<T>(observer => source.subscribe({
		resolve(value) {
			if (predicate(value)) {
				observer.resolve(value);
			}
		},
		reject(error) {
			observer.reject(error);
		}
	}));
}
