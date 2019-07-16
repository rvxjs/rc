import test from "ava";
import { dispose, Observable } from "../src";

test("observer", t => {
	new Observable(observer => {
		t.is(typeof observer, "object");
		t.is(typeof observer.resolve, "function");
		t.is(typeof observer.reject, "function");
	}).subscribe();
});

test("resolve", t => {
	new Observable(observer => {
		observer.resolve("foo");
	}).subscribe({
		resolve(value) {
			t.is(value, "foo");
		},
		reject() {
			t.fail();
		}
	});
});

test("reject", t => {
	new Observable(observer => {
		observer.reject("foo");
	}).subscribe({
		resolve(value) {
			t.fail();
		},
		reject(value) {
			t.is(value, "foo");
		}
	});
});

test("subscribe with callback", t => {
	new Observable(observer => {
		observer.reject("foo");
		observer.resolve("bar");
	}).subscribe(value => {
		t.is(value, "bar");
	});
});

test("notifyResolve", t => {
	(new class extends Observable<any> {
		protected awake() {
			this.notifyResolve("foo");
		}
	}).subscribe({
		resolve(value) {
			t.is(value, "foo");
		},
		reject() {
			t.fail();
		}
	});
});

test("notifyReject", t => {
	(new class extends Observable<any> {
		protected awake() {
			this.notifyReject("foo");
		}
	}).subscribe({
		resolve() {
			t.fail();
		},
		reject(value) {
			t.is(value, "foo");
		}
	});
});

test("observable lifecycle", t => {
	const events = [];
	let nextCycle = 0;
	const source = new Observable(observer => {
		const cycle = nextCycle++;
		events.push(["start", cycle]);
		return () => {
			events.push(["stop", cycle]);
		};
	});
	const a = source.subscribe();
	t.deepEqual(events, [ ["start", 0] ]);
	dispose(source.subscribe());
	t.deepEqual(events, [ ["start", 0] ]);
	dispose(a);
	t.deepEqual(events, [ ["start", 0], ["stop", 0] ]);
	events.length = 0;
	dispose(source.subscribe());
	t.deepEqual(events, [ ["start", 1], ["stop", 1] ]);
});
