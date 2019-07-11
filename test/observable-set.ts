import test from "ava";
import { ObservableSet, PatchObservable, PatchObservableLike, unitsToArray } from "../src";
import { validatePatch } from "../src/testing/patch-observable";

function validate<T>(source: PatchObservableLike<T>) {
	let subscribed = false;
	return new PatchObservable<T>(observer => {
		return source.patches({
			patch(patch) {
				validatePatch(patch);
				observer.patch(patch);
			},
			reject: error => observer.reject(error)
		});
	}, () => {
		if (subscribed) {
			throw new Error("validate can only be piped once.");
		}
		subscribed = true;
	});
}

test("patches", t => {
	t.plan(32);
	const set = new ObservableSet<number>();

	set.pipe(validate).pipe(unitsToArray).subscribe(arr => {
		t.deepEqual(arr, Array.from(set));
	});
	set.pipe(validate).pipe(unitsToArray).subscribe(arr => {
		t.deepEqual(arr, Array.from(set));
	});

	set.add(1);
	set.add(2);
	set.add(3);
	set.delete(1);
	set.clear();
	set.clear();

	set.add(1);
	set.add(2);
	set.add(3);
	set.delete(2);
	set.clear();

	set.add(1);
	set.add(2);
	set.add(3);
	set.delete(3);
	set.clear();
});
