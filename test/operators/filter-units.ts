import test from "ava";
import { dispose, filterUnits, PatchObservable, PatchObserver, Unit, unitsToArray } from "../../src";
import { validatePatch } from "../../src/testing/patch-observable";

test("patch processing", t => {
	const events = [];
	let observer: PatchObserver<number>;
	const units = new PatchObservable<number>(o => {
		observer = o;
	}).pipe(filterUnits, (value: number) => value > 0);
	units.patches(validatePatch);
	units.pipe(unitsToArray).subscribe(event => events.push(event));

	const a: Unit<number> = { prev: null, next: null, value: 1 };
	const b: Unit<number> = { prev: a, next: null, value: -2 };
	a.next = b;
	observer.patch({ prev: null, next: null, stale: null, fresh: { next: a, prev: b } });
	// State: [a, (b)]

	const c: Unit<number> = { prev: null, next: a, value: -3 };
	a.prev = c;
	observer.patch({ prev: null, next: a, stale: null, fresh: { next: c, prev: c } });
	// State: [(c), a, (b)]

	const d: Unit<number> = { prev: a, next: null, value: -4 };
	a.next = d;
	const e: Unit<number> = { prev: d, next: b, value: 5 };
	d.next = e;
	b.prev = e;
	observer.patch({ prev: a, next: b, stale: null, fresh: { next: d, prev: e } });
	// State: [(c), a, (d), e, (b)]

	a.next = e;
	e.prev = a;
	observer.patch({ prev: a, next: e, stale: { next: d, prev: d }, fresh: null });
	// State: [(c), a, e, (b)]

	const f: Unit<number> = { prev: c, next: b, value: 6 };
	c.next = f;
	b.prev = f;
	observer.patch({ prev: c, next: b, stale: { next: a, prev: e }, fresh: { next: f, prev: f } });
	// State: [(c), f, (b)]

	dispose(units.pipe(unitsToArray).subscribe(units => {
		t.deepEqual(units, [6]);
	}));

	c.next = null;
	observer.patch({ prev: c, next: null, stale: { next: f, prev: b }, fresh: null });
	// State: [(c)]

	observer.patch({ prev: null, next: null, stale: { next: c, prev: c }, fresh: null });
	// State: []

	observer.patch({ prev: null, next: null, fresh: null, stale: null });

	t.deepEqual(events, [
		[1],
		[1, 5],
		[6],
		[]
	]);
});