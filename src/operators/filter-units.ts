import { Patch, PatchObservable, PatchObservableLike, Unit, UnitRange } from "../patch-observable";
import { mapUnits } from "./map-units";

/** Filter a sequence of units. */
export function filterUnits<T>(source: PatchObservableLike<T>, predicate: (value: T) => boolean) {
	let resolved = false;
	const range: UnitRange<T> = { next: null, prev: null };
	const rangePatch: Patch<T> = { prev: null, next: null, stale: null, fresh: range };
	return new PatchObservable<T>(observer => {
		resolved = false;
		range.next = null;
		range.prev = null;
		return mapUnits<T, Unit<T>>(source, value => {
			return predicate(value) ? { prev: null, next: null, value } : null;
		}).patches({
			patch(patch) {
				resolved = true;
				const { fresh: freshSource, stale: staleSource } = patch;
				const prev = closestPrev(patch.prev);
				const next = closestNext(patch.next);

				let stale: UnitRange<T>;
				if (staleSource) {
					let first: Unit<T> = null;
					let last: Unit<T> = null;
					for (let current = staleSource.next;; current = current.next) {
						if (current.value) {
							last = first ? current.value : (first = current.value);
						}
						if (current === staleSource.prev) {
							break;
						}
					}
					if (first) {
						stale = { next: first, prev: last };
					}
				}

				let fresh: UnitRange<T>;
				if (freshSource) {
					let first: Unit<T> = null;
					let last: Unit<T> = null;
					let prevCurrent = prev;
					for (let current = freshSource.next;; current = current.next) {
						if (current.value) {
							current.value.prev = prevCurrent;
							(prevCurrent || range).next = current.value;
							prevCurrent = current.value;
							last = first ? current.value : (first = current.value);
						}
						if (current === freshSource.prev) {
							break;
						}
					}
					if (prevCurrent) {
						prevCurrent.next = next;
						(next || range).prev = prevCurrent;
					}
					if (first) {
						fresh = { next: first, prev: last };
					}
				} else {
					(prev || range).next = next;
					(next || range).prev = prev;
				}

				if (fresh || stale) {
					observer.patch({ prev, next, fresh, stale });
				}
			},
			reject(error) {
				observer.reject(error);
			}
		});
	}, observer => {
		if (resolved && observer.patch) {
			observer.patch(rangePatch);
		}
	});
}

function closestPrev<T>(unit: Unit<Unit<T>>) {
	while (unit) {
		if (unit.value) {
			return unit.value;
		}
		unit = unit.prev;
	}
}

function closestNext<T>(unit: Unit<Unit<T>>) {
	while (unit) {
		if (unit.value) {
			return unit.value;
		}
		unit = unit.next;
	}
}
