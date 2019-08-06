import { Sequence, SequenceLike, SequencePatch, SequenceRange, Unit } from "../sequence";

/** Map each unit value from a sequence. */
export function mapSequence<T, U>(source: SequenceLike<T>, map: (value: T) => U) {
	let resolved = false;
	const range: SequenceRange<U> = { next: null, prev: null };
	const rangePatch: SequencePatch<U> = { prev: null, next: null, stale: null, fresh: range };
	const projection = new Map<Unit<T>, Unit<U>>();
	return new Sequence<U>(observer => {
		resolved = false;
		range.next = null;
		range.prev = null;
		return source.subscribeToSequence({
			updateSequence: patch => {
				resolved = true;
				const { fresh: freshSource, stale: staleSource } = patch;
				const prev = patch.prev ? projection.get(patch.prev) : null;
				const next = patch.next ? projection.get(patch.next) : null;

				let stale: SequenceRange<U>;
				if (staleSource) {
					stale = {
						next: projection.get(staleSource.next),
						prev: projection.get(staleSource.prev)
					};
					for (let current = staleSource.next;; current = current.next) {
						projection.delete(staleSource.next);
						if (current === staleSource.prev) {
							break;
						}
					}
				}

				let fresh: SequenceRange<U>;
				if (freshSource) {
					if (freshSource.next === freshSource.prev) {
						const unit: Unit<U> = { prev: prev, next: next, value: map(freshSource.next.value) };
						(prev || range).next = unit;
						(next || range).prev = unit;
						fresh = { next: unit, prev: unit };
						projection.set(freshSource.next, unit);
					} else {
						const first: Unit<U> = { prev: prev, next: null, value: map(freshSource.next.value) };
						let last: Unit<U> = first;
						(prev || range).next = last;
						projection.set(freshSource.next, last);
						for (let current = freshSource.next.next; current !== freshSource.prev; current = current.next) {
							const unit: Unit<U> = { prev: last, next: null, value: map(current.value) };
							last.next = unit;
							last = unit;
							projection.set(current, unit);
						}
						const unit: Unit<U> = { prev: last, next: null, value: map(freshSource.prev.value) };
						last.next = unit;
						(next || range).prev = unit;
						fresh = { next: first, prev: unit };
						projection.set(freshSource.prev, unit);
					}
				} else {
					(prev || range).next = next;
					(next || range).prev = prev;
				}

				if (fresh || stale) {
					observer.updateSequence({ prev, next, fresh, stale });
				}
			},
			reject: error => observer.reject(error)
		});
	}, observer => {
		if (resolved && observer.updateSequence) {
			observer.updateSequence(rangePatch);
		}
	});
}
