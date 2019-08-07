import test from "ava";
import { Hash, hashToMap } from "../../src";

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

		observer.updateEntries({ stale: null, fresh: new Map([ ["foo", 7], ["bar", 42] ]) });
		t.deepEqual(event, [ ["foo", 7], ["bar", 42] ]);

		observer.updateEntries({ stale: new Map([ ["foo", 7] ]), fresh: null });
		t.deepEqual(event, [ ["bar", 42] ]);

		observer.updateEntries({ stale: new Map([ ["bar", 42] ]), fresh: null });
		t.deepEqual(event, [ ]);
	}).pipe(hashToMap).subscribe(map => {
		event = Array.from(map);
	});
});
