import test from "ava";
import { Observable, toPromise } from "../../src";

test("resolve", async t => {
	t.is(await new Observable<string>(observer => {
		observer.resolve("foo");
		observer.resolve("bar");
	}).pipe(toPromise), "foo");
});
