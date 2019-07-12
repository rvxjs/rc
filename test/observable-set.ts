import test, { ExecutionContext } from "ava";
import { ObservableSet, unitsToArray, unitsToReverseArray } from "../src";
import { validatePatch } from "../src/testing/patch-observable";

test("patch consistency", t => {
	// 16: Number of modifications made to the set below.
	// 2: Number of assertions per modification.
	// 4: Number of raw assertions.
	t.plan((16 * 2) + 4);

	const set = new ObservableSet<number>();

	set.patches(validatePatch);
	set.pipe(unitsToArray).subscribe(arr => {
		t.deepEqual(arr, Array.from(set));
	});
	set.pipe(unitsToReverseArray).subscribe(arr => {
		t.deepEqual(arr, Array.from(set).reverse());
	});

	set.add(1);
	t.true(set.has(1));
	set.add(2);
	set.add(3);
	set.delete(1);
	t.false(set.has(1));
	set.clear();
	t.false(set.has(2));
	t.false(set.has(3));
	set.clear();

	set.add(1);
	set.add(2);
	set.add(3);
	set.delete(2);
	set.clear();

	set.add(1);
	set.add(2);
	set.add(3);
	set.delete(3);
	set.clear();
});

function testEntries(t: ExecutionContext, set: ObservableSet<number>) {
	set.patches(validatePatch);
	const events = [];
	set.entry(42).subscribe(event => events.push(event));
	t.deepEqual(events, [false]);
	set.add(7);
	set.add(13);
	t.deepEqual(events, [false]);
	set.add(42);
	t.deepEqual(events, [false, true]);
	set.clear();
	t.deepEqual(events, [false, true, false]);
	set.clear();
	t.deepEqual(events, [false, true, false]);
	set.delete(42);
	t.deepEqual(events, [false, true, false]);
}

test("entries", testEntries, new ObservableSet<number>());

test("entries (observer overhead)", t => {
	const set = new ObservableSet<number>();
	for (let i = 0; i < 4; i++) {
		set.entry(i).subscribe();
	}
	set.entry(42).subscribe();
	testEntries(t, set);
});
