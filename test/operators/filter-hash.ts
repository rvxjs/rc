import test from "ava";
import { filterHash, Hash, hashToMap } from "../../src";

test("patch processing", t => {
	let event: [string, number][];
	new Hash<string, number>(observer => {
		t.is(event, undefined);
		observer.updateEntries({ stale: null, fresh: null });
		t.deepEqual(event, []);
		observer.updateEntries({ stale: null, fresh: new Map() });
		t.deepEqual(event, []);
		observer.updateEntries({ stale: new Map(), fresh: null });
		t.deepEqual(event, []);

		observer.updateEntries({ stale: null, fresh: new Map([ ["foo", 5], ["bar", 3], ["baz", 42] ]) });
		t.deepEqual(event, [ ["bar", 3], ["baz", 42] ]);

		observer.updateEntries({ stale: new Map([ ["foo", 5], ["bar", 3] ]), fresh: null });
		t.deepEqual(event, [ ["baz", 42] ]);

	}).pipe(filterHash, (key: string, value: number) => {
		return key === "bar" || value > 7;
	}).pipe(hashToMap).subscribe(map => {
		event = Array.from(map);
	});
});
