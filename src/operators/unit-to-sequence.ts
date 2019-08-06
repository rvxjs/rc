import { ObservableLike } from "../observable";
import { Sequence, Unit } from "../sequence";

/** Wrap an observable into a sequence with a single unit. */
export function unitToSequence<T>(source: ObservableLike<T>) {
	let unit: Unit<T> = null;
	return new Sequence<T>(observer => {
		return source.subscribe({
			resolve(value) {
				const stale = unit ? { next: unit, prev: unit } : null;
				unit = { prev: null, next: null, value };
				observer.updateSequence({ prev: null, next: null, stale, fresh: { next: unit, prev: unit } });
			},
			reject(error) {
				observer.reject(error);
			}
		});
	}, observer => {
		if (unit && observer.updateSequence) {
			observer.updateSequence({ prev: null, next: null, stale: null, fresh: { next: unit, prev: unit } });
		}
	});
}
