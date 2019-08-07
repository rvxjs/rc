import test from "ava";
import { HashPatch, ObservableMap } from "../src";

test("instance (proxy)", t => {
	const map = new ObservableMap();
	t.true(map instanceof ObservableMap);
	t.true(map instanceof Map);
});

test("instance (no proxy)", t => {
	const map = new ObservableMap(undefined, false);
	t.true(map instanceof ObservableMap);
	t.false(map instanceof Map);
});

test("source", t => {
	const map = new ObservableMap([ ["foo", 42] ]);
	t.deepEqual(Array.from(map), [ ["foo", 42] ]);
	map.subscribeToHash(patch => {
		t.deepEqual(patch, { fresh: new Map([ ["foo", 42] ]), stale: null });
	});
});

test("clear", t => {
	const map = new ObservableMap<string, number>([ ["foo", 7], ["bar", 42] ]);
	const patches = [];
	map.subscribeToHash(patch => patches.push(clonePatch(patch)));
	map.clear();
	map.clear();
	t.deepEqual(patches, [
		{ stale: null, fresh: new Map([ ["foo", 7], ["bar", 42] ]) },
		{ stale: new Map([ ["foo", 7], ["bar", 42] ]), fresh: null }
	]);
});

test("set", t => {
	const map = new ObservableMap<string, number>();
	const patches = [];
	map.subscribeToHash(patch => patches.push(clonePatch(patch)));
	map.set("foo", 7);
	map.set("foo", 42);
	t.deepEqual(patches, [
		{ stale: null, fresh: new Map() },
		{ stale: null, fresh: new Map([ ["foo", 7] ]) },
		{ stale: new Map([ ["foo", 7] ]), fresh: new Map([ ["foo", 42] ]) }
	]);
});

test("delete", t => {
	const map = new ObservableMap<string, number>([ ["foo", 7], ["bar", 42] ]);
	const patches = [];
	map.subscribeToHash(patch => patches.push(clonePatch(patch)));
	map.delete("foo");
	map.delete("bar");
	map.delete("baz");
	t.deepEqual(patches, [
		{ stale: null, fresh: new Map([ ["foo", 7], ["bar", 42] ]) },
		{ stale: new Map([ ["foo", 7] ]), fresh: null },
		{ stale: new Map([ ["bar", 42] ]), fresh: null }
	]);
});

function clonePatch(patch: HashPatch<any, any>): HashPatch<any, any> {
	return {
		stale: patch.stale ? new Map(patch.stale) : null,
		fresh: patch.fresh ? new Map(patch.fresh) : null
	};
}
