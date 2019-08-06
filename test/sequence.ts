import test from "ava";
import { Sequence, Unit } from "../src";
import { validatePatch } from "../src/testing/sequence";

test("fixed (empty)", t => {
	const source = Sequence.fixed([]);
	const events = [];
	source.subscribeToSequence(patch => {
		validatePatch(patch);
		events.push(patch);
	});
	t.deepEqual(events, [
		{ prev: null, next: null, stale: null, fresh: null }
	]);
});

test("fixed", t => {
	const source = Sequence.fixed(["foo", "bar"]);
	const events = [];
	source.subscribeToSequence(patch => {
		validatePatch(patch);
		events.push(patch);
	});
	const a: Unit<string> = { prev: null, next: null, value: "foo" };
	const b: Unit<string> = { prev: a, next: null, value: "bar" };
	a.next = b;
	t.deepEqual(events, [
		{ prev: null, next: null, stale: null, fresh: { next: a, prev: b } }
	]);
});
