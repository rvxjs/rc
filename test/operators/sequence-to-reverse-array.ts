import test from "ava";
import { Sequence, sequenceToReverseArray, Unit } from "../../src";

test("patch processing", t => {
	const events = [];
	new Sequence<number>(observer => {
		const a: Unit<number> = { prev: null, next: null, value: 7 };
		observer.updateSequence({ prev: null, next: null, stale: null, fresh: { next: a, prev: a } });

		const b: Unit<number> = { prev: null, next: a, value: 11 };
		a.prev = b;
		observer.updateSequence({ prev: null, next: a, stale: null, fresh: { next: b, prev: b } });

		a.prev = null;
		observer.updateSequence({ prev: null, next: a, stale: { next: b, prev: b }, fresh: null });

		const c: Unit<number> = { prev: a, next: null, value: 13 };
		a.next = c;
		observer.updateSequence({ prev: a, next: null, stale: null, fresh: { next: c, prev: c } });

		observer.updateSequence({ prev: null, next: null, stale: { next: a, prev: c }, fresh: null });

		observer.updateSequence({ prev: null, next: null, stale: null, fresh: null });
	}).pipe(sequenceToReverseArray).subscribe(event => events.push(event));
	t.deepEqual(events, [
		[7],
		[7, 11],
		[7],
		[13, 7],
		[],
		[]
	]);
});
