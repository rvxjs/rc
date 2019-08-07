import { HashLike } from "../hash";
import { Observable } from "../observable";

/** Convert a hash to an observable of maps. */
export function hashToMap<K, V>(source: HashLike<K, V>) {
	let resolved = false;
	const entries = new Map<K, V>();
	return new Observable<ReadonlyMap<K, V>>(observer => {
		resolved = false;
		entries.clear();
		return source.subscribeToHash({
			updateEntries(patch) {
				let changed = false;
				if (patch.stale) {
					changed = true;
					for (const key of patch.stale.keys()) {
						entries.delete(key);
					}
				}
				if (patch.fresh) {
					changed = true;
					for (const [key, value] of patch.fresh) {
						entries.set(key, value);
					}
				}
				if (!resolved || changed) {
					resolved = true;
					observer.resolve(entries);
				}
			},
			reject(error) {
				observer.reject(error);
			}
		});
	}, observer => {
		if (resolved && observer.resolve) {
			observer.resolve(entries);
		}
	});
}
