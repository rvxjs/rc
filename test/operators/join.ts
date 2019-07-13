import test from "ava";
import { join, Observable, Observer } from "../../src";

test("join", t => {
	let a: Observer<string>;
	let b: Observer<number>;
	const events = [];
	new Observable<string>(observer => {
		a = observer;
	}).pipe(join, new Observable<number>(observer => {
		b = observer;
	})).subscribe(event => events.push(Array.from(event)));
	t.deepEqual(events, []);
	a.resolve("foo");
	t.deepEqual(events, []);
	b.resolve(42);
	t.deepEqual(events, [["foo", 42]]);
	a.resolve("bar");
	t.deepEqual(events, [["foo", 42], ["bar", 42]]);
});
