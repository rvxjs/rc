import test from "ava";
import { Emitter } from "../src/index.js";

test("emit", t => {
	t.plan(4);
	const emitter = new Emitter<[a: string, b: number]>();
	const unsubscribe = emitter.event((a, b) => {
		t.is(a, "foo");
		t.is(b, 42);
	});
	t.true(emitter.emit("foo", 42));
	unsubscribe();
	t.false(emitter.emit("foo", 42));
});

test("emitLazy", t => {
	t.plan(5);
	const emitter = new Emitter<[a: string, b: number]>();
	t.false(emitter.emitLazy(() => {
		throw t.fail();
	}));
	const unsubscribe = emitter.event((a, b) => {
		t.is(a, "foo");
		t.is(b, 42);
	});
	t.true(emitter.emitLazy(() => ["foo", 42]));
	unsubscribe();
	t.false(emitter.emitLazy(() => {
		throw t.fail();
	}));
});
