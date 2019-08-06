import { Sequence, SequenceLike, SequencePatch, SequenceRange, Unit } from "../sequence";
import { mapSequence } from "./map-sequence";

/** Filter a sequence of units. */
export function filterSequence<T>(source: SequenceLike<T>, predicate: (value: T) => boolean) {
	let resolved = false;
	const range: SequenceRange<T> = { next: null, prev: null };
	const rangePatch: SequencePatch<T> = { prev: null, next: null, stale: null, fresh: range };
	return new Sequence<T>(observer => {
		resolved = false;
		range.next = null;
		range.prev = null;
		return mapSequence<T, Unit<T>>(source, value => {
			return predicate(value) ? { prev: null, next: null, value } : null;
		}).subscribeToSequence({
			updateSequence(patch) {
				resolved = true;
				const { fresh: freshSource, stale: staleSource } = patch;
				const prev = closestPrev(patch.prev);
				const next = closestNext(patch.next);

				let stale: SequenceRange<T>;
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

				let fresh: SequenceRange<T>;
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
					observer.updateSequence({ prev, next, fresh, stale });
				}
			},
			reject(error) {
				observer.reject(error);
			}
		});
	}, observer => {
		if (resolved && observer.updateSequence) {
			observer.updateSequence(rangePatch);
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
