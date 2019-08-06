import test from "ava";
import { Observable, Observer, sequenceToArray, unitToSequence } from "../../src";
import { validatePatch } from "../../src/testing/sequence";

test("resolve", t => {
	let observer: Observer<string>;
	const source = new Observable<string>(o => {
		observer = o;
	}).pipe(unitToSequence);

	const events = [];
	source.subscribeToSequence(validatePatch);
	source.pipe(sequenceToArray).subscribe(units => {
		events.push(units);
	});

	t.deepEqual(events, []);
	observer.resolve("foo");
	t.deepEqual(events, [["foo"]]);
	observer.resolve("bar");
	t.deepEqual(events, [["foo"], ["bar"]]);

	let lateUnits: string[];
	source.pipe(sequenceToArray).subscribe(units => {
		lateUnits = units;
	});
	t.deepEqual(lateUnits, ["bar"]);
});
