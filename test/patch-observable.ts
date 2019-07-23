import test from "ava";
import { PatchObservable, Unit } from "../src";
import { validatePatch } from "../src/testing/patch-observable";

test("fixed (empty)", t => {
	const source = PatchObservable.fixed([]);
	const events = [];
	source.patches(patch => {
		validatePatch(patch);
		events.push(patch);
	});
	t.deepEqual(events, [
		{ prev: null, next: null, stale: null, fresh: null }
	]);
});

test("fixed", t => {
	const source = PatchObservable.fixed(["foo", "bar"]);
	const events = [];
	source.patches(patch => {
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
