import test, { ExecutionContext } from "ava";
import { ObservableMap, unitsToArray, unitsToReverseArray } from "../src";
import { validatePatch } from "../src/testing/patch-observable";

test("patch consistency", t => {
	// 16: Number of modifications made to the map below.
	// 2: Number of assertions per modification.
	// 4: Number of raw assertions.
	t.plan((16 * 2) + 4);
	const map = new ObservableMap<string, number>();

	map.patches(validatePatch);
	map.pipe(unitsToArray).subscribe(arr => {
		t.deepEqual(arr, Array.from(map));
	});
	map.pipe(unitsToReverseArray).subscribe(arr => {
		t.deepEqual(arr, Array.from(map).reverse());
	});

	map.set("foo", 7);
	t.is(map.get("foo"), 7);
	map.set("bar", 11);
	map.set("baz", 13);
	map.delete("foo");
	t.false(map.has("foo"));
	map.clear();
	t.false(map.has("bar"));
	t.false(map.has("baz"));
	map.clear();

	map.set("foo", 7);
	map.set("bar", 11);
	map.set("baz", 13);
	map.delete("bar");
	map.clear();

	map.set("foo", 7);
	map.set("bar", 11);
	map.set("baz", 13);
	map.delete("baz");
	map.clear();
});

function testEntries(t: ExecutionContext, map: ObservableMap<string, number>) {
	map.patches(validatePatch);
	const events = [];
	map.entry("bar").subscribe(event => events.push(event));
	t.deepEqual(events, [undefined]);
}

test("entries", testEntries, new ObservableMap<string, number>());

test("entries (observer overhead)", t => {
	const map = new ObservableMap<string, number>();
	for (let i = 0; i < 4; i++) {
		map.entry(String(i)).subscribe();
	}
	map.entry("foo").subscribe();
	testEntries(t, map);
});
