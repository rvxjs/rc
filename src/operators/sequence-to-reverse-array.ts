import { dispose } from "../disposable";
import { Observable } from "../observable";
import { SequenceLike, Unit } from "../sequence";

/** Convert a sequence to an array in reversed order. */
export function sequenceToReverseArray<T>(source: SequenceLike<T>) {
	let resolved: T[] = null;
	return new Observable<T[]>(observer => {
		let last: Unit<T> = null;
		const subscription = source.subscribeToSequence({
			updateSequence(patch) {
				if (!patch.next) {
					last = patch.fresh ? patch.fresh.prev : patch.prev;
				}
				resolved = [];
				for (let unit = last; unit; unit = unit.prev) {
					resolved.push(unit.value);
				}
				observer.resolve(resolved);
			},
			reject: error => observer.reject(error)
		});
		return () => {
			dispose(subscription);
			resolved = null;
		};
	}, observer => {
		if (resolved && observer.resolve) {
			observer.resolve(resolved);
		}
	});
}
