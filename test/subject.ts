import test from "ava";
import { Subject } from "../src";

test("execution order", t => {
	const updates: unknown[] = [];

	const subject = new Subject(0);
	t.is(subject.value, 0);

	const unsubscribe = subject.subscribe((value, isCurrent) => {
		updates.push(value, isCurrent);
	});

	subject.value = 1;
	t.is(subject.value, 1);

	unsubscribe();

	subject.value = 2;
	t.is(subject.value, 2);

	t.deepEqual(updates, [
		0, true,
		1, false
	]);
});
