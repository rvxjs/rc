import test from "ava";
import { filter, Observable } from "../src";

test("resolve", t => {
	const events = [];
	const x = new Observable<number>(observer => {
		observer.resolve(5);
		observer.resolve(11);
	}).pipe(filter, (v: number) => v > 7).subscribe(event => events.push(event));
	t.deepEqual(events, [11]);
});
