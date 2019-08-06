import test from "ava";
import { dispose, mapSequence, Sequence, SequenceObserver, sequenceToArray, Unit } from "../../src";
import { validatePatch } from "../../src/testing/sequence";

test("patch processing", t => {
	const events = [];
	let observer: SequenceObserver<number>;
	const units = new Sequence<number>(o => {
		observer = o;
	}).pipe(mapSequence, (value: number) => value * 2);
	units.subscribeToSequence(validatePatch);
	units.pipe(sequenceToArray).subscribe(event => events.push(event));

	const a: Unit<number> = { prev: null, next: null, value: 7 };
	observer.updateSequence({ prev: null, next: null, stale: null, fresh: { next: a, prev: a } });
	// State: [a]

	const b: Unit<number> = { prev: a, next: null, value: 11 };
	a.next = b;
	observer.updateSequence({ prev: a, next: null, stale: null, fresh: { next: b, prev: b } });
	// State: [a, b]

	a.next = null;
	observer.updateSequence({ prev: a, next: null, stale: { next: b, prev: b }, fresh: null });
	// State: [a]

	const c: Unit<number> = { prev: null, next: a, value: 13 };
	a.prev = c;
	observer.updateSequence({ prev: null, next: a, stale: null, fresh: { next: c, prev: c } });
	// State: [c, a]

	dispose(units.pipe(sequenceToArray).subscribe(units => {
		t.deepEqual(units, [26, 14]);
	}));

	observer.updateSequence({ prev: null, next: null, stale: { next: c, prev: a }, fresh: null });
	// State: []

	observer.updateSequence({ prev: null, next: null, stale: null, fresh: null });

	const d: Unit<number> = { prev: null, next: null, value: 1 };
	const e: Unit<number> = { prev: d, next: null, value: 3 };
	d.next = e;
	const f: Unit<number> = { prev: e, next: null, value: 5 };
	e.next = f;
	observer.updateSequence({ prev: null, next: null, stale: null, fresh: { next: d, prev: f } });
	// State: [d, e, f]

	t.deepEqual(events, [
		[14],
		[14, 22],
		[14],
		[26, 14],
		[],
		[2, 6, 10]
	]);
});
