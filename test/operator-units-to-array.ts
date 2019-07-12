import test from "ava";
import { PatchObservable, Unit, unitsToArray } from "../src";

test("patch processing", t => {
	const arrays = unitsToArray(new PatchObservable<number>(observer => {
		const a: Unit<number> = { prev: null, next: null, value: 7 };
		observer.patch({ prev: null, next: null, stale: null, fresh: { next: a, prev: a } });

		const b: Unit<number> = { prev: a, next: null, value: 11 };
		a.next = b;
		observer.patch({ prev: a, next: null, stale: null, fresh: { next: b, prev: b } });

		a.next = null;
		observer.patch({ prev: a, next: null, stale: { next: b, prev: b }, fresh: null });

		const c: Unit<number> = { prev: null, next: a, value: 13 };
		a.prev = c;
		observer.patch({ prev: null, next: a, stale: null, fresh: { next: c, prev: c } });

		observer.patch({ prev: null, next: null, stale: { next: c, prev: a }, fresh: null });

		observer.patch({ prev: null, next: null, stale: null, fresh: null });
	}));
	const events = [];
	arrays.subscribe(event => events.push(event));
	t.deepEqual(events, [
		[7],
		[7, 11],
		[7],
		[13, 7],
		[],
		[]
	]);
});
