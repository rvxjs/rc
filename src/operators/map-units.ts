import { Patch, PatchObservable, PatchObservableLike, Unit, UnitRange } from "../patch-observable";

/** Map each unit value from a sequence. */
export function mapUnits<T, U>(source: PatchObservableLike<T>, map: (value: T) => U): PatchObservable<U> {
	let resolved = false;
	const range: UnitRange<U> = { next: null, prev: null };
	const rangePatch: Patch<U> = { prev: null, next: null, stale: null, fresh: range };
	const projection = new Map<Unit<T>, Unit<U>>();
	return new PatchObservable<U>(observer => {
		resolved = false;
		range.next = null;
		range.prev = null;
		return source.patches({
			patch: patch => {
				resolved = true;
				const { fresh: freshSource, stale: staleSource } = patch;
				const prev = patch.prev ? projection.get(patch.prev) : null;
				const next = patch.next ? projection.get(patch.next) : null;

				let stale: UnitRange<U>;
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

				let fresh: UnitRange<U>;
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
					observer.patch({ prev, next, fresh, stale });
				}
			},
			reject: error => observer.reject(error)
		});
	}, observer => {
		if (resolved && observer.patch) {
			observer.patch(rangePatch);
		}
	});
}
