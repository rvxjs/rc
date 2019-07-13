import test from "ava";
import { Observable, Observer, unwrap } from "../../src";

test("resolve", t => {
	const source = new Observable<Observable<string>>(observer => {
		observer.resolve(null);
		let child: Observer<string>;
		let childDisposed = false;
		observer.resolve(new Observable(c => {
			child = c;
			return () => {
				childDisposed = true;
			};
		}));
		child.resolve("foo");
		t.false(childDisposed);
		observer.resolve(new Observable(c => {
			t.true(childDisposed);
			c.resolve("baz");
		}));
		child.resolve("bar");
	});

	const events = [];
	source.pipe(unwrap).subscribe(event => events.push(event));

	t.deepEqual(events, ["foo", "baz"]);
});
