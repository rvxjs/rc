import { dispose } from "../disposable";
import { Observable } from "../observable";
import { SequenceLike, Unit } from "../sequence";

/** Convert a sequence to an array. */
export function sequenceToArray<T>(source: SequenceLike<T>) {
	let resolved: T[] = null;
	return new Observable<T[]>(observer => {
		let first: Unit<T> = null;
		const subscription = source.subscribeToSequence({
			updateSequence(patch) {
				if (!patch.prev) {
					first = patch.fresh ? patch.fresh.next : patch.next;
				}
				resolved = [];
				for (let unit = first; unit; unit = unit.next) {
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
