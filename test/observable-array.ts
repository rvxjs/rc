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
	t.deepEqual(Array.from(arr), ["foo"]);
	t.is(arr.push("bar", "baz"), 3);
	t.deepEqual(Array.from(arr), ["foo", "bar", "baz"]);
	t.is(arr.push(), 3);
	t.deepEqual(events, [ [], ["foo"], ["foo", "bar", "baz"] ]);
});

test("reverse", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr[0] = "foo";
	arr[1] = "bar";
	arr.reverse();
	t.deepEqual(Array.from(arr), ["bar", "foo"]);
	t.deepEqual(events, [ [], ["foo"], ["foo", "bar"], ["bar", "foo"] ]);
});

test("shift", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr[0] = "foo";
	arr[1] = "bar";
	t.deepEqual(Array.from(arr), ["foo", "bar"]);
	t.is(arr.shift(), "foo");
	t.deepEqual(Array.from(arr), ["bar"]);
	t.is(arr.shift(), "bar");
	t.deepEqual(Array.from(arr), []);
	t.is(arr.shift(), undefined);
	t.deepEqual(events, [ [], ["foo"], ["foo", "bar"], ["bar"], [] ]);
});

test("sort", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr[0] = "foo";
	arr[1] = "bar";
	arr.sort();
	t.deepEqual(Array.from(arr), ["bar", "foo"]);
	t.deepEqual(events, [ [], ["foo"], ["foo", "bar"], ["bar", "foo"] ]);
});

test("splice", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	t.deepEqual(arr.splice(0, 0, "foo", "bar"), []);
	t.deepEqual(Array.from(arr), ["foo", "bar"]);
	t.deepEqual(arr.splice(1, 1, "baz"), ["bar"]);
	t.deepEqual(Array.from(arr), ["foo", "baz"]);
	t.deepEqual(arr.splice(0, 1, "bar"), ["foo"]);
	t.deepEqual(Array.from(arr), ["bar", "baz"]);
	t.deepEqual(arr.splice(0, 2), ["bar", "baz"]);
	t.deepEqual(Array.from(arr), []);
	t.deepEqual(events, [ [], ["foo", "bar"], ["foo", "baz"], ["bar", "baz"], [] ]);
});

test("splice (NaN start)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.splice(0, 0, "foo", "bar");
	t.deepEqual(arr.splice(NaN, 0, "baz"), []);
	t.deepEqual(Array.from(arr), ["baz", "foo", "bar"]);
	t.deepEqual(events, [ [], ["foo", "bar"], ["baz", "foo", "bar"] ]);
});

test("splice (negative start)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.splice(0, 0, "foo", "bar");
	t.deepEqual(arr.splice(-1, 0, "baz"), []);
	t.deepEqual(Array.from(arr), ["foo", "baz", "bar"]);
	t.deepEqual(events, [ [], ["foo", "bar"], ["foo", "baz", "bar"] ]);
});

test("splice (start out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.splice(0, 0, "foo", "bar");
	t.deepEqual(arr.splice(3, 0, "baz"), []);
	t.deepEqual(Array.from(arr), ["foo", "bar", "baz"]);
	t.deepEqual(events, [ [], ["foo", "bar"], ["foo", "bar", "baz"] ]);
});

test("splice (NaN deleteCount)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.splice(0, 0, "foo", "bar");
	t.deepEqual(arr.splice(1, NaN, "baz"), []);
	t.deepEqual(Array.from(arr), ["foo", "baz", "bar"]);
	t.deepEqual(events, [ [], ["foo", "bar"], ["foo", "baz", "bar"] ]);
});

test("splice (negative deleteCount)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.splice(0, 0, "foo", "bar");
	t.deepEqual(arr.splice(1, -1, "baz"), []);
	t.deepEqual(Array.from(arr), ["foo", "baz", "bar"]);
	t.deepEqual(events, [ [], ["foo", "bar"], ["foo", "baz", "bar"] ]);
});

test("splice (deleteCount out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.splice(0, 0, "foo", "bar");
	t.deepEqual(arr.splice(1, 2, "baz"), ["bar"]);
	t.deepEqual(Array.from(arr), ["foo", "baz"]);
	t.deepEqual(events, [ [], ["foo", "bar"], ["foo", "baz"] ]);
});

test("unshift", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	t.is(arr.unshift("foo"), 1);
	t.deepEqual(Array.from(arr), ["foo"]);
	t.is(arr.unshift("bar", "baz"), 3);
	t.deepEqual(Array.from(arr), ["bar", "baz", "foo"]);
	t.is(arr.unshift(), 3);
	t.deepEqual(events, [ [], ["foo"], ["bar", "baz", "foo"] ]);
});

test("fill", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 3;
	t.is(arr.fill(42), arr);
	t.deepEqual(Array.from(arr), [42, 42, 42]);
	arr.fill(7, 0, 2);
	t.deepEqual(Array.from(arr), [7, 7, 42]);
	arr.fill(13, 1);
	t.deepEqual(Array.from(arr), [7, 13, 13]);
	t.deepEqual(events, [ [], [undefined, undefined, undefined], [42, 42, 42], [7, 7, 42], [7, 13, 13] ]);
});

test("fill (NaN start)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, NaN);
	t.deepEqual(Array.from(arr), [42, 42]);
	t.deepEqual(events, [ [], [undefined, undefined], [42, 42] ]);
});

test("fill (negative start)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, -1);
	t.deepEqual(Array.from(arr), [undefined, 42]);
	t.deepEqual(events, [ [], [undefined, undefined], [undefined, 42] ]);
});

test("fill (negative start out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, -3);
	t.deepEqual(Array.from(arr), [42, 42]);
	t.deepEqual(events, [ [], [undefined, undefined], [42, 42] ]);
});

test("fill (start out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, 3);
	t.deepEqual(Array.from(arr), [undefined, undefined]);
	t.deepEqual(events, [ [], [undefined, undefined] ]);
});

test("fill (NaN end)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, 0, NaN);
	t.deepEqual(Array.from(arr), [undefined, undefined]);
	t.deepEqual(events, [ [], [undefined, undefined] ]);
});

test("fill (negative end)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, 0, -1);
	t.deepEqual(Array.from(arr), [42, undefined]);
	t.deepEqual(events, [ [], [undefined, undefined], [42, undefined] ]);
});

test("fill (negative end out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, 0, -2);
	t.deepEqual(Array.from(arr), [undefined, undefined]);
	t.deepEqual(events, [ [], [undefined, undefined] ]);
});

test("fill (end out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.length = 2;
	arr.fill(42, 0, 3);
	t.deepEqual(Array.from(arr), [42, 42]);
	t.deepEqual(events, [ [], [undefined, undefined], [42, 42] ]);
});

test("copyWithin", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	t.is(arr.copyWithin(2), arr);
	t.deepEqual(Array.from(arr), [1, 2, 1, 2, 3]);
	t.pass();
});

test("copyWithin (NaN target)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(NaN, 3, 4);
	t.deepEqual(Array.from(arr), [4, 2, 3, 4, 5]);
	t.pass();
});

test("copyWithin (negative target)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(-3);
	t.deepEqual(Array.from(arr), [1, 2, 1, 2, 3]);
	t.pass();
});

test("copyWithin (negative target out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(-6);
	t.deepEqual(Array.from(arr), [1, 2, 3, 4, 5]);
	t.pass();
});

test("copyWithin (NaN start)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(3, NaN);
	t.deepEqual(Array.from(arr), [1, 2, 3, 1, 2]);
	t.pass();
});

test("copyWithin (negative start)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(3, -4);
	t.deepEqual(Array.from(arr), [1, 2, 3, 2, 3]);
	t.pass();
});

test("copyWithin (negative start out of range)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(3, -6);
	t.deepEqual(Array.from(arr), [1, 2, 3, 1, 2]);
	t.pass();
});

test("copyWithin (NaN end)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(3, 1, NaN);
	t.deepEqual(Array.from(arr), [1, 2, 3, 4, 5]);
	t.pass();
});

test("copyWithin (negative end)", t => {
	const events: any[][] = [];
	const arr = createArray(t, events);
	arr.push(1, 2, 3, 4, 5);
	arr.copyWithin(3, 1, 2);
	t.deepEqual(Array.from(arr), [1, 2, 3, 2, 5]);
	t.pass();
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
