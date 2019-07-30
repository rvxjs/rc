import test, { ExecutionContext } from "ava";
import { ObservableArray, unitsToArray, unitsToReverseArray } from "../src";
import { validatePatch } from "../src/testing/patch-observable";

test("instance (proxy)", t => {
	const arr = new ObservableArray();
	t.true(arr instanceof ObservableArray);
	t.true(arr instanceof Array);
	t.true(Array.isArray(arr));
});

test("instance (no proxy)", t => {
	const arr = new ObservableArray(false);
	t.true(arr instanceof ObservableArray);
	t.false(arr instanceof Array);
	t.false(Array.isArray(arr));
});

test("increase length", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	t.deepEqual(events, [ [] ]);
	arr.length = 2;
	t.deepEqual(Array.from(arr), [undefined, undefined]);
	t.deepEqual(events, [ [], [undefined, undefined] ]);
});

test("decrease length", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 3;
	arr.length = 1;
	t.deepEqual(Array.from(arr), [undefined]);
	arr.length = 0;
	t.deepEqual(events, [ [], [undefined, undefined, undefined], [undefined], [] ]);
});

test("set first existing", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr[0] = "foo";
	t.deepEqual(Array.from(arr), ["foo", undefined]);
	t.deepEqual(events, [ [], [undefined, undefined], ["foo", undefined] ]);
});

test("set last existing", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr[1] = "foo";
	t.deepEqual(Array.from(arr), [undefined, "foo"]);
	t.deepEqual(events, [ [], [undefined, undefined], [undefined, "foo"] ]);
});

test("set to expand", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr[0] = "foo";
	t.deepEqual(Array.from(arr), ["foo"]);
	arr[2] = "bar";
	t.deepEqual(Array.from(arr), ["foo", undefined, "bar"]);
	t.deepEqual(events, [ [], ["foo"], ["foo", undefined, "bar"] ]);
});

test("delete existing", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr[0] = "foo";
	delete arr[0];
	t.deepEqual(Array.from(arr), [undefined]);
	t.deepEqual(events, [ [], ["foo"], [undefined] ]);
});

test("delete out of range", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	delete arr[0];
	t.deepEqual(Array.from(arr), []);
	t.deepEqual(events, [ [] ]);
});

test("delete missing", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr[1] = "foo";
	delete arr[0];
	t.deepEqual(Array.from(arr), [undefined, "foo"]);
	t.deepEqual(events, [ [], [undefined, "foo"] ]);
});

test("pop", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr[0] = "foo";
	arr[1] = "bar";
	t.deepEqual(Array.from(arr), ["foo", "bar"]);
	t.is(arr.pop(), "bar");
	t.deepEqual(Array.from(arr), ["foo"]);
	t.is(arr.pop(), "foo");
	t.deepEqual(Array.from(arr), []);
	t.is(arr.pop(), undefined);
	t.deepEqual(events, [ [], ["foo"], ["foo", "bar"], ["foo"], [] ]);
});

test("push", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	t.is(arr.push("foo"), 1);
	t.is(arr.push("bar", "baz"), 3);
	t.deepEqual(Array.from(arr), ["foo", "bar", "baz"]);
	t.deepEqual(events, [ [], ["foo"], ["foo", "bar", "baz"] ]);
});

function createArray<T>(t: ExecutionContext, events?: T[][]) {
	const arr = new ObservableArray<T>();
	arr.patches(validatePatch);
	arr.pipe(unitsToArray).subscribe(values => {
		if (events) {
			events.push(values);
		}
		t.deepEqual(values, Array.from(arr));
	});
	arr.pipe(unitsToReverseArray).subscribe(values => {
		t.deepEqual(values, Array.from(arr).reverse());
	});
	return arr;
}
