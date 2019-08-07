import { Hash, HashLike } from "../hash";

/** Filter a hash. */
export function filterHash<K, V>(source: HashLike<K, V>, predicate: (key: K, value: V) => boolean) {
	let resolved = false;
	const entries = new Map<K, V>();
	return new Hash<K, V>(observer => {
		resolved = false;
		entries.clear();
		return source.subscribeToHash({
			updateEntries(patch) {
				let stale: Map<K, V>;
				if (patch.stale) {
					for (const [key, value] of patch.stale) {
						if (predicate(key, value)) {
							(stale || (stale = new Map())).set(key, value);
							entries.delete(key);
						}
					}
				}
				let fresh: Map<K, V>;
				if (patch.fresh) {
					for (const [key, value] of patch.fresh) {
						if (predicate(key, value)) {
							(fresh || (fresh = new Map())).set(key, value);
							entries.set(key, value);
						}
					}
				}
				if (!resolved || stale || fresh) {
					resolved = true;
					observer.updateEntries({ stale, fresh });
				}
			},
			reject(error) {
				observer.reject(error);
			}
		});
	}, observer => {
		if (resolved && observer.updateEntries) {
			observer.updateEntries({ stale: null, fresh: entries });
		}
	});
}
