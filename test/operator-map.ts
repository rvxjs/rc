import test from "ava";
import { map, Observable } from "../src";

test("resolve", t => {
	const events = [];
	const x = new Observable<number>(observer => {
		observer.resolve(1);
		observer.resolve(6);
	}).pipe(map, (v: number) => v * 7).subscribe(event => events.push(event));
	t.deepEqual(events, [7, 42]);
});
