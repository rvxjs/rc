import test from "ava";
import { merge, Observable } from "../../src";

test("resolve", t => {
	const values = [];
	new Observable<string>(observer => {
		observer.resolve("foo");
	}).pipe(merge, new Observable<string>(observer => {
		observer.resolve("bar");
	})).subscribe({
		resolve: value => values.push(value),
		reject: () => t.fail()
	});
	t.deepEqual(values, ["foo", "bar"]);
});

test("reject", t => {
	const errors = [];
	new Observable<string>(observer => {
		observer.reject("foo");
	}).pipe(merge, new Observable<string>(observer => {
		observer.reject("bar");
	})).subscribe({
		resolve: () => t.fail(),
		reject: error => errors.push(error),
	});
	t.deepEqual(errors, ["foo", "bar"]);
});
