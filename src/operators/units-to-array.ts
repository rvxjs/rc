import { dispose } from "../disposable";
import { Observable } from "../observable";
import { PatchObservableLike, Unit } from "../patch-observable";

/** Convert a sequence of units to an array. */
export function unitsToArray<T>(source: PatchObservableLike<T>) {
	let resolved: T[] = null;
	return new Observable<T[]>(observer => {
		let first: Unit<T> = null;
		const subscription = source.patches({
			patch(patch) {
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
