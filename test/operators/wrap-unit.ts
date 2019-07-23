import test from "ava";
import { Observable, Observer, unitsToArray, wrapUnit } from "../../src";
import { validatePatch } from "../../src/testing/patch-observable";

test("resolve", t => {
	let observer: Observer<string>;
	const source = new Observable<string>(o => {
		observer = o;
	}).pipe(wrapUnit);

	const events = [];
	source.patches(validatePatch);
	source.pipe(unitsToArray).subscribe(units => {
		events.push(units);
	});

	t.deepEqual(events, []);
	observer.resolve("foo");
	t.deepEqual(events, [["foo"]]);
	observer.resolve("bar");
	t.deepEqual(events, [["foo"], ["bar"]]);

	let lateUnits: string[];
	source.pipe(unitsToArray).subscribe(units => {
		lateUnits = units;
	});
	t.deepEqual(lateUnits, ["bar"]);
});
