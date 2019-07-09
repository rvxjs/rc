import { Patch, PatchObservable, PatchObservableLike, Unit, UnitRange } from "../patch-observable";

export function mapUnits<T, U>(source: PatchObservableLike<T>, map: (value: T) => U): PatchObservableLike<U> {
	let resolved = false;
	const range: UnitRange<U> = { next: null, prev: null };
	const rangePatch: Patch<U> = { prev: null, next: null, stale: null, fresh: range };
	const projection = new Map<Unit<T>, Unit<U>>();
	return new PatchObservable<U>(observer => {
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
					let current = staleSource.next;
					do {
						projection.delete(current);
						current = current.next;
					} while (current !== staleSource.prev);
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
						let last: Unit<U> = { prev: prev, next: null, value: map(freshSource.next.value) };
						(prev || range).next = last;
						projection.set(freshSource.next, last);
						for (let current = freshSource.next.next; current !== freshSource.prev; current = current.next) {
							const unit: Unit<U> = { prev: last, next: null, value: map(current.value) };
							last.next = unit;
							last = unit;
							projection.set(current, unit);
						}
						const unit: Unit<U> = { prev: last, next: null, value: map(freshSource.prev.value) };
						(next || range).prev = unit;
						projection.set(freshSource.prev, unit);
					}
				}

				observer.patch({ prev, next, fresh, stale });
			},
			reject: error => observer.reject(error)
		});
	}, observer => {
		if (resolved) {
			observer.patch(rangePatch);
		}
	});
}
