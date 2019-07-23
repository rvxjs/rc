import { ObservableLike } from "../observable";
import { PatchObservable, Unit } from "../patch-observable";

/** Wrap an observable into a patch observable with a single unit. */
export function wrapUnit<T>(source: ObservableLike<T>) {
	let unit: Unit<T> = null;
	return new PatchObservable<T>(observer => {
		return source.subscribe({
			resolve(value) {
				const stale = unit ? { next: unit, prev: unit } : null;
				unit = { prev: null, next: null, value };
				observer.patch({ prev: null, next: null, stale, fresh: { next: unit, prev: unit } });
			},
			reject(error) {
				observer.reject(error);
			}
		});
	}, observer => {
		if (unit && observer.patch) {
			observer.patch({ prev: null, next: null, stale: null, fresh: { next: unit, prev: unit } });
		}
	});
}
